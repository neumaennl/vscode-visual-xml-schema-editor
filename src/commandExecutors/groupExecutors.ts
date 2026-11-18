/**
 * Executors for group commands (element groups and attribute groups).
 * Implements add, remove, and modify operations for schema groups,
 * covering both top-level group definitions and group references.
 */

import type {
  schema,
  AddGroupCommand,
  RemoveGroupCommand,
  ModifyGroupCommand,
  ContentModel,
  annotationType,
} from "../../shared/types.js";
import { namedGroup, allType, simpleExplicitGroup, groupRef } from "../../shared/types.js";
import { parseSchemaId, SchemaNodeType } from "../../shared/idStrategy.js";
import { assumeValidated, assumptionFailed, locateValidated } from "./assumeValidated.js";
import { appendTo, assignDefined, removeFrom } from "./nodeProperties.js";
import { createAnnotation, setDocumentation } from "./annotationUtils.js";
import { renameOwnReferences } from "../schemaReferences/referenceRewrites.js";

// ===== Element Group Executors =====

/**
 * Executes an `addGroup` command.
 *
 * Two modes depending on whether `payload.ref` is set:
 * - **Definition mode** (`groupName` + `contentModel`): creates a top-level named group.
 * - **Reference mode** (`ref` + `parentId`): creates `xs:group ref="..."` inside the
 *   compositor or complexType identified by `parentId`.
 *
 * @param command - The `addGroup` command to execute
 * @param schemaObj - The schema object to modify
 * @throws An {@link Error} if the parent node is not found (reference mode) or unsupported
 */
export function executeAddGroup(command: AddGroupCommand, schemaObj: schema): void {
  const { groupName, contentModel, documentation, ref, parentId, minOccurs, maxOccurs } = command.payload;

  if (ref !== undefined) {
    // Reference mode: add xs:group ref="..." to a compositor or complexType
    // The schema cannot hold group references, so the validator requires a parent
    const location = locateValidated(schemaObj, assumeValidated(parentId, "Parent of the group reference"));
    const grpRef = buildGroupRef(ref, minOccurs, maxOccurs, documentation);
    addGroupRefToParent(location.parent, location.parentType, grpRef);
    return;
  }

  // Definition mode: add a top-level named group
  const grp = new namedGroup();
  grp.name = assumeValidated(groupName, "Group name");
  if (documentation) {
    grp.annotation = createAnnotation(documentation);
  }
  applyGroupContentModel(grp, assumeValidated(contentModel, "Content model"));

  appendTo(schemaObj, "group", grp);
}

/**
 * Executes a `removeGroup` command.
 *
 * The `groupId` is used for both:
 * - `/group:Name` — removes the top-level named group definition.
 * - `/complexType:X/group:sequence[0]/groupRef:Name[0]` — removes the group reference.
 *
 * @param command - The `removeGroup` command to execute
 * @param schemaObj - The schema object to modify
 * @throws An {@link Error} if the group or its parent is not found
 */
export function executeRemoveGroup(command: RemoveGroupCommand, schemaObj: schema): void {
  const { groupId } = command.payload;
  const parsed = parseSchemaId(groupId);

  if (parsed.nodeType === SchemaNodeType.Group && parsed.parentId && parsed.name) {
    const groupLocation = locateValidated(schemaObj, groupId);
    const parentLocation = locateValidated(schemaObj, parsed.parentId);
    removeCompositorGroupFromParent(parentLocation.parent, parsed.name, groupLocation.parent);
    return;
  }

  if (parsed.nodeType === SchemaNodeType.GroupRef) {
    // Reference mode: remove xs:group ref="..." from its parent compositor
    const location = locateValidated(schemaObj, assumeValidated(parsed.parentId, `Parent of ${groupId}`));
    removeGroupRefFromParent(location.parent, location.parentType, parsed.name, parsed.position, groupId);
    return;
  }

  // Definition mode: remove top-level named group
  removeFrom(schemaObj, "group", (g) => g.name === parsed.name, `Group ${groupId}`);
}

/**
 * Executes a `modifyGroup` command.
 *
 * The `groupId` is used for both:
 * - `/group:Name` — modifies the top-level named group definition.
 * - `/complexType:X/group:sequence[0]/groupRef:Name[0]` — modifies the group reference.
 *
 * @param command - The `modifyGroup` command to execute
 * @param schemaObj - The schema object to modify
 * @throws An {@link Error} if the group or its parent is not found
 */
export function executeModifyGroup(command: ModifyGroupCommand, schemaObj: schema): void {
  const { groupId, groupName, contentModel, documentation, ref, minOccurs, maxOccurs } = command.payload;
  const parsed = parseSchemaId(groupId);

  if (parsed.nodeType === SchemaNodeType.Group && parsed.parentId) {
    const location = locateValidated(schemaObj, groupId);
    const compositor = location.parent as {
      minOccurs?: number;
      maxOccurs?: number | "unbounded";
      annotation?: annotationType;
    };
    assignDefined(compositor, { minOccurs, maxOccurs });
    if (documentation !== undefined) {
      setDocumentation(compositor, documentation);
    }
    return;
  }

  if (parsed.nodeType === SchemaNodeType.GroupRef) {
    // Reference mode: modify xs:group ref="..." in its parent compositor
    const location = locateValidated(schemaObj, assumeValidated(parsed.parentId, `Parent of ${groupId}`));
    const target = assumeValidated(
      findGroupRefInParent(location.parent, location.parentType, parsed.name, parsed.position),
      `Group reference ${groupId}`
    );
    assignDefined(target, { ref, minOccurs, maxOccurs });
    if (documentation !== undefined) {
      setDocumentation(target, documentation);
    }
    return;
  }

  // Definition mode: modify top-level named group
  const grp = assumeValidated(
    (schemaObj.group ?? []).find((g) => g.name === parsed.name),
    `Group ${groupId}`
  );

  if (groupName !== undefined) {
    renameOwnReferences("group", grp.name, groupName, schemaObj);
    grp.name = groupName;
  }
  if (documentation !== undefined) {
    setDocumentation(grp, documentation);
  }
  if (contentModel !== undefined) {
    applyGroupContentModel(grp, contentModel);
  }
}

// ===== Element Group Helper Functions =====

/** Structural type shared by `namedGroup` for content model operations. */
interface GroupHolder {
  all?: allType;
  choice?: simpleExplicitGroup;
  sequence?: simpleExplicitGroup;
}

/** Structural type for a compositor (sequence or choice) that holds group refs. */
interface CompositorWithGroupRefs {
  group?: groupRef[];
}

/** Structural type for a complexType that can hold a direct group ref. */
interface ComplexTypeWithGroupRef {
  group?: groupRef;
}

/**
 * Builds a new `groupRef` instance with the given properties.
 *
 * @param ref - The name of the referenced group
 * @param minOccurs - The minimum number of occurrences, if set
 * @param maxOccurs - The maximum number of occurrences, if set
 * @param documentation - The documentation of the reference, if any
 * @returns The group reference
 */
function buildGroupRef(
  ref: string,
  minOccurs?: number,
  maxOccurs?: number | "unbounded",
  documentation?: string
): groupRef {
  const grpRef = assignDefined(new groupRef(), { ref, minOccurs, maxOccurs });
  if (documentation) {
    grpRef.annotation = createAnnotation(documentation);
  }
  return grpRef;
}

/**
 * Adds a `groupRef` to a compositor (sequence/choice) or complexType parent.
 *
 * @param parent - The parent
 * @param parentType - The kind of the parent, as the navigator reports it
 * @param grpRef - The group reference to add
 * @throws An {@link Error} if the parent cannot hold group references
 */
function addGroupRefToParent(parent: unknown, parentType: string, grpRef: groupRef): void {
  if (parentType === "sequence" || parentType === "choice") {
    appendTo(parent as CompositorWithGroupRefs, "group", grpRef);
  } else if (parentType === "topLevelComplexType" || parentType === "localComplexType") {
    (parent as ComplexTypeWithGroupRef).group = grpRef;
  } else {
    assumptionFailed(`Parent of type '${parentType}' for a group reference`);
  }
}

/**
 * Removes a `groupRef` from a compositor (sequence/choice) or complexType parent.
 *
 * @param parent - The parent
 * @param parentType - The kind of the parent, as the navigator reports it
 * @param name - The ref of the reference, from its ID
 * @param position - The position of the reference in a compositor, from its ID
 * @param groupId - The ID of the reference, for the error message
 * @throws An {@link Error} if the reference is not found or the parent cannot hold group references
 */
function removeGroupRefFromParent(
  parent: unknown,
  parentType: string,
  name: string | undefined,
  position: number | undefined,
  groupId: string
): void {
  if (parentType === "sequence" || parentType === "choice") {
    // The validator ensures that the ID has the ref and the position of the reference
    removeFrom(
      parent as CompositorWithGroupRefs,
      "group",
      (r, index) => r.ref === name && index === position,
      `Group reference ${groupId}`
    );
  } else if (parentType === "topLevelComplexType" || parentType === "localComplexType") {
    const ct = parent as ComplexTypeWithGroupRef;
    assumeValidated(ct.group, `Group reference ${groupId}`);
    ct.group = undefined;
  } else {
    assumptionFailed(`Parent of type '${parentType}' for a group reference`);
  }
}

/**
 * Finds a `groupRef` in a compositor (sequence/choice) or complexType parent.
 *
 * @param parent - The parent
 * @param parentType - The kind of the parent, as the navigator reports it
 * @param name - The ref of the reference, from its ID
 * @param position - The position of the reference in a compositor, from its ID
 * @returns The found `groupRef` or undefined
 */
function findGroupRefInParent(
  parent: unknown,
  parentType: string,
  name: string | undefined,
  position: number | undefined
): groupRef | undefined {
  if (parentType === "sequence" || parentType === "choice") {
    const refs = (parent as CompositorWithGroupRefs).group ?? [];
    // The validator ensures that the ID has the ref and the position of the reference
    return refs.find((r, index) => r.ref === name && index === position);
  }
  if (parentType === "topLevelComplexType" || parentType === "localComplexType") {
    return (parent as ComplexTypeWithGroupRef).group;
  }
  return undefined;
}

/**
 * Structural type for the holders of a compositor: a complex type (directly or in its complex content), a
 * group definition, or another compositor, which holds its nested compositors in arrays.
 */
interface CompositorHolder {
  sequence?: unknown;
  choice?: unknown;
  all?: unknown;
  complexContent?: { extension?: CompositorHolder; restriction?: CompositorHolder };
}

/**
 * Removes a compositor from the node that holds it.
 *
 * @param parent - The node that holds the compositor
 * @param groupKind - The kind of the compositor: `sequence`, `choice` or `all`
 * @param targetGroup - The compositor to remove
 * @throws An {@link Error} if the parent does not hold the compositor
 */
function removeCompositorGroupFromParent(parent: unknown, groupKind: string, targetGroup: unknown): void {
  const kind = groupKind as "sequence" | "choice" | "all";
  const removeFrom = (holder: CompositorHolder | undefined): boolean => {
    if (!holder) return false;
    const current = holder[kind];
    if (current === targetGroup) {
      holder[kind] = undefined;
      return true;
    }
    if (Array.isArray(current) && current.includes(targetGroup)) {
      const remaining = current.filter((group) => group !== targetGroup);
      holder[kind] = remaining.length > 0 ? remaining : undefined;
      return true;
    }
    return false;
  };

  const holder = parent as CompositorHolder;
  const removed =
    removeFrom(holder) ||
    removeFrom(holder.complexContent?.extension) ||
    removeFrom(holder.complexContent?.restriction);
  assumeValidated(removed || undefined, `Compositor ${groupKind} in its parent`);
}

/**
 * Sets the content model compositor on a `namedGroup`, clearing any previously
 * set compositor first.
 *
 * @param grp - The group holder to update
 * @param contentModel - The content model to apply
 */
function applyGroupContentModel(grp: GroupHolder, contentModel: ContentModel): void {
  grp.all = undefined;
  grp.choice = undefined;
  grp.sequence = undefined;

  if (contentModel === "sequence") {
    grp.sequence = new simpleExplicitGroup();
  } else if (contentModel === "choice") {
    grp.choice = new simpleExplicitGroup();
  } else {
    grp.all = new allType();
  }
}
