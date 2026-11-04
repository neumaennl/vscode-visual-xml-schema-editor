/**
 * Executors for group commands (element groups and attribute groups).
 * Implements add, remove, and modify operations for schema groups,
 * covering both top-level group definitions and group references.
 */

import {
  schema,
  AddGroupCommand,
  RemoveGroupCommand,
  ModifyGroupCommand,
  ContentModel,
  namedGroup,
  allType,
  simpleExplicitGroup,
  annotationType,
  documentationType,
  groupRef,
} from "../../shared/types.js";
import { parseSchemaId, SCHEMA_ROOT_ID, SchemaNodeType } from "../../shared/idStrategy.js";
import { assumeRemoved, assumeValidated, assumptionFailed, locateValidated } from "./assumeValidated.js";
import { createAnnotation } from "./annotationUtils.js";
import { renameLocalGroupRefInSchema } from "./schemaLocalRenamer.js";

// ===== Element Group Executors =====

/**
 * Executes an addGroup command.
 *
 * Two modes depending on whether `payload.ref` is set:
 * - **Definition mode** (`groupName` + `contentModel`): creates a top-level named group.
 * - **Reference mode** (`ref` + `parentId`): creates `xs:group ref="..."` inside the
 *   compositor or complexType identified by `parentId`.
 *
 * @param command - The addGroup command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the parent node is not found (reference mode) or unsupported
 */
export function executeAddGroup(
  command: AddGroupCommand,
  schemaObj: schema
): void {
  const { groupName, contentModel, documentation, ref, parentId, minOccurs, maxOccurs } =
    command.payload;

  if (ref !== undefined) {
    // Reference mode: add xs:group ref="..." to a compositor or complexType
    const location = locateValidated(schemaObj, parentId ?? SCHEMA_ROOT_ID);
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

  const groups = schemaObj.group ?? [];
  groups.push(grp);
  schemaObj.group = groups;
}

/**
 * Executes a removeGroup command.
 *
 * The `groupId` is used for both:
 * - `/group:Name` — removes the top-level named group definition.
 * - `/complexType:X/sequence[0]/groupRef:Name[0]` — removes the group reference.
 *
 * @param command - The removeGroup command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the group or its parent is not found
 */
export function executeRemoveGroup(
  command: RemoveGroupCommand,
  schemaObj: schema
): void {
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
  const groups = schemaObj.group ?? [];
  const filtered = assumeRemoved(groups, groups.filter((g) => g.name !== parsed.name), `Group ${groupId}`);
  schemaObj.group = filtered.length > 0 ? filtered : undefined;
}

/**
 * Executes a modifyGroup command.
 *
 * The `groupId` is used for both:
 * - `/group:Name` — modifies the top-level named group definition.
 * - `/complexType:X/sequence[0]/groupRef:Name[0]` — modifies the group reference.
 *
 * @param command - The modifyGroup command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the group or its parent is not found
 */
export function executeModifyGroup(
  command: ModifyGroupCommand,
  schemaObj: schema
): void {
  const { groupId, groupName, contentModel, documentation, ref, minOccurs, maxOccurs } =
    command.payload;
  const parsed = parseSchemaId(groupId);

  if (parsed.nodeType === SchemaNodeType.Group && parsed.parentId) {
    const location = locateValidated(schemaObj, groupId);
    const compositor = location.parent as {
      minOccurs?: number;
      maxOccurs?: number | "unbounded";
      annotation?: annotationType;
    };
    if (minOccurs !== undefined) {
      compositor.minOccurs = minOccurs;
    }
    if (maxOccurs !== undefined) {
      compositor.maxOccurs = maxOccurs;
    }
    if (documentation !== undefined) {
      if (!compositor.annotation) {
        compositor.annotation = new annotationType();
      }
      const doc = new documentationType();
      doc.value = documentation;
      compositor.annotation.documentation = [doc];
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
    if (ref !== undefined) {
      target.ref = ref;
    }
    if (minOccurs !== undefined) {
      target.minOccurs = minOccurs;
    }
    if (maxOccurs !== undefined) {
      target.maxOccurs = maxOccurs;
    }
    if (documentation !== undefined) {
      if (!target.annotation) {
        target.annotation = new annotationType();
      }
      const doc = new documentationType();
      doc.value = documentation;
      target.annotation.documentation = [doc];
    }
    return;
  }

  // Definition mode: modify top-level named group
  const grp = assumeValidated((schemaObj.group ?? []).find((g) => g.name === parsed.name), `Group ${groupId}`);

  if (groupName !== undefined) {
    renameLocalGroupRefInSchema(grp.name, groupName, schemaObj);
    grp.name = groupName;
  }
  if (documentation !== undefined) {
    if (!grp.annotation) {
      grp.annotation = new annotationType();
    }
    const doc = new documentationType();
    doc.value = documentation;
    grp.annotation.documentation = [doc];
  }
  if (contentModel !== undefined) {
    applyGroupContentModel(grp, contentModel);
  }
}

// ===== Element Group Helper Functions =====

/** Structural type shared by namedGroup for content model operations. */
type GroupHolder = {
  all?: allType;
  choice?: simpleExplicitGroup;
  sequence?: simpleExplicitGroup;
};

/** Structural type for a compositor (sequence or choice) that holds group refs. */
type CompositorWithGroupRefs = { group?: groupRef[] };

/** Structural type for a complexType that can hold a direct group ref. */
type ComplexTypeWithGroupRef = { group?: groupRef };

/**
 * Builds a new groupRef instance with the given properties.
 */
function buildGroupRef(
  ref: string,
  minOccurs?: number,
  maxOccurs?: number | "unbounded",
  documentation?: string
): groupRef {
  const grpRef = new groupRef();
  grpRef.ref = ref;
  if (minOccurs !== undefined) {
    grpRef.minOccurs = minOccurs;
  }
  if (maxOccurs !== undefined) {
    grpRef.maxOccurs = maxOccurs;
  }
  if (documentation) {
    grpRef.annotation = createAnnotation(documentation);
  }
  return grpRef;
}

/**
 * Adds a groupRef to a compositor (sequence/choice) or complexType parent.
 *
 * @throws Error if the parent cannot hold group references
 */
function addGroupRefToParent(
  parent: unknown,
  parentType: string,
  grpRef: groupRef
): void {
  if (parentType === "sequence" || parentType === "choice") {
    const compositor = parent as CompositorWithGroupRefs;
    const refs = compositor.group ?? [];
    refs.push(grpRef);
    compositor.group = refs;
  } else if (
    parentType === "topLevelComplexType" ||
    parentType === "localComplexType"
  ) {
    (parent as ComplexTypeWithGroupRef).group = grpRef;
  } else {
    assumptionFailed(`Parent of type '${parentType}' for a group reference`);
  }
}

/**
 * Removes a groupRef from a compositor (sequence/choice) or complexType parent.
 *
 * @throws Error if the reference is not found or the parent cannot hold group references
 */
function removeGroupRefFromParent(
  parent: unknown,
  parentType: string,
  name: string | undefined,
  position: number | undefined,
  groupId: string
): void {
  if (parentType === "sequence" || parentType === "choice") {
    const compositor = parent as CompositorWithGroupRefs;
    const refs = compositor.group ?? [];
    const filtered = assumeRemoved(refs, filterGroupRef(refs, name, position), `Group reference ${groupId}`);
    compositor.group = filtered.length > 0 ? filtered : undefined;
  } else if (
    parentType === "topLevelComplexType" ||
    parentType === "localComplexType"
  ) {
    const ct = parent as ComplexTypeWithGroupRef;
    assumeValidated(ct.group, `Group reference ${groupId}`);
    ct.group = undefined;
  } else {
    assumptionFailed(`Parent of type '${parentType}' for a group reference`);
  }
}

/**
 * Finds a groupRef in a compositor (sequence/choice) or complexType parent.
 *
 * @returns The found groupRef or undefined
 */
function findGroupRefInParent(
  parent: unknown,
  parentType: string,
  name: string | undefined,
  position: number | undefined
): groupRef | undefined {
  if (parentType === "sequence" || parentType === "choice") {
    const refs = (parent as CompositorWithGroupRefs).group ?? [];
    return findGroupRef(refs, name, position);
  }
  if (
    parentType === "topLevelComplexType" ||
    parentType === "localComplexType"
  ) {
    return (parent as ComplexTypeWithGroupRef).group;
  }
  return undefined;
}

/**
 * Finds a groupRef in an array by its ref name and optional position.
 */
function findGroupRef(
  refs: groupRef[],
  name: string | undefined,
  position: number | undefined
): groupRef | undefined {
  if (name !== undefined && position !== undefined) {
    return refs.find((r, idx) => r.ref === name && idx === position);
  }
  if (name !== undefined) {
    return refs.find((r) => r.ref === name);
  }
  if (position !== undefined) {
    return refs[position];
  }
  return undefined;
}

/**
 * Structural type for the holders of a compositor: a complex type (directly or in its complex content), a
 * group definition, or another compositor, which holds its nested compositors in arrays.
 */
type CompositorHolder = {
  sequence?: unknown;
  choice?: unknown;
  all?: unknown;
  complexContent?: { extension?: CompositorHolder; restriction?: CompositorHolder };
};

/**
 * Removes a compositor from the node that holds it.
 *
 * @param parent - The node that holds the compositor
 * @param groupKind - The kind of the compositor: `sequence`, `choice` or `all`
 * @param targetGroup - The compositor to remove
 * @throws Error if the parent does not hold the compositor
 */
function removeCompositorGroupFromParent(
  parent: unknown,
  groupKind: string,
  targetGroup: unknown
): void {
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
 * Returns a new array with the first matching groupRef removed.
 */
function filterGroupRef(
  refs: groupRef[],
  name: string | undefined,
  position: number | undefined
): groupRef[] {
  if (name !== undefined && position !== undefined) {
    return refs.filter((r, idx) => !(r.ref === name && idx === position));
  }
  if (name !== undefined) {
    let removed = false;
    return refs.filter((r) => {
      if (!removed && r.ref === name) {
        removed = true;
        return false;
      }
      return true;
    });
  }
  if (position !== undefined) {
    return refs.filter((_, idx) => idx !== position);
  }
  return refs;
}

/**
 * Sets the content model compositor on a namedGroup, clearing any previously
 * set compositor first.
 *
 * @param grp - The group holder to update
 * @param contentModel - The content model to apply
 */
function applyGroupContentModel(
  grp: GroupHolder,
  contentModel: ContentModel
): void {
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
