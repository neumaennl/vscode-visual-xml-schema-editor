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
  AddAttributeGroupCommand,
  RemoveAttributeGroupCommand,
  ModifyAttributeGroupCommand,
  ContentModel,
  namedGroup,
  allType,
  simpleExplicitGroup,
  annotationType,
  documentationType,
  groupRef,
} from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";
import { parseSchemaId, SchemaNodeType } from "../../shared/idStrategy";
import { locateNodeById } from "../schemaNavigator";

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
    const location = locateNodeById(schemaObj, parentId ?? "schema");
    if (!location.found || !location.parent || !location.parentType) {
      throw new Error(`Parent node not found: ${parentId}`);
    }
    const grpRef = buildGroupRef(ref, minOccurs, maxOccurs, documentation);
    addGroupRefToParent(location.parent, location.parentType, grpRef);
    return;
  }

  // Definition mode: add a top-level named group
  const grp = new namedGroup();
  grp.name = groupName as string;
  if (documentation) {
    grp.annotation = createAnnotation(documentation);
  }
  applyGroupContentModel(grp, contentModel as ContentModel);

  const groups = toArray(schemaObj.group);
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

  if (parsed.nodeType === SchemaNodeType.GroupRef) {
    // Reference mode: remove xs:group ref="..." from its parent compositor
    if (!parsed.parentId) {
      throw new Error(`Invalid groupRef ID: ${groupId}`);
    }
    const location = locateNodeById(schemaObj, parsed.parentId);
    if (!location.found || !location.parent || !location.parentType) {
      throw new Error(`Parent not found for groupRef: ${groupId}`);
    }
    removeGroupRefFromParent(
      location.parent,
      location.parentType,
      parsed.name,
      parsed.position,
      groupId
    );
    return;
  }

  // Definition mode: remove top-level named group
  const groups = toArray(schemaObj.group);
  const filtered = groups.filter((g) => g.name !== parsed.name);
  if (filtered.length === groups.length) {
    throw new Error(`Group not found: ${parsed.name}`);
  }
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

  if (parsed.nodeType === SchemaNodeType.GroupRef) {
    // Reference mode: modify xs:group ref="..." in its parent compositor
    if (!parsed.parentId) {
      throw new Error(`Invalid groupRef ID: ${groupId}`);
    }
    const location = locateNodeById(schemaObj, parsed.parentId);
    if (!location.found || !location.parent || !location.parentType) {
      throw new Error(`Parent not found for groupRef: ${groupId}`);
    }
    const target = findGroupRefInParent(
      location.parent,
      location.parentType,
      parsed.name,
      parsed.position
    );
    if (!target) {
      throw new Error(`GroupRef not found: ${groupId}`);
    }
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
  const grp = toArray(schemaObj.group).find((g) => g.name === parsed.name);
  if (!grp) {
    throw new Error(`Group not found: ${parsed.name}`);
  }

  if (groupName !== undefined) {
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
 * @throws Error if the parent type does not support group refs
 */
function addGroupRefToParent(
  parent: unknown,
  parentType: string,
  grpRef: groupRef
): void {
  if (parentType === "sequence" || parentType === "choice") {
    const compositor = parent as CompositorWithGroupRefs;
    const refs = toArray(compositor.group);
    refs.push(grpRef);
    compositor.group = refs;
  } else if (
    parentType === "topLevelComplexType" ||
    parentType === "localComplexType"
  ) {
    (parent as ComplexTypeWithGroupRef).group = grpRef;
  } else {
    throw new Error(`Cannot add group ref to parent type: ${parentType}`);
  }
}

/**
 * Removes a groupRef from a compositor (sequence/choice) or complexType parent.
 *
 * @throws Error if the ref is not found or the parent type is unsupported
 */
function removeGroupRefFromParent(
  parent: unknown,
  parentType: string,
  name: string | undefined,
  position: number | undefined,
  originalId: string
): void {
  if (parentType === "sequence" || parentType === "choice") {
    const compositor = parent as CompositorWithGroupRefs;
    const refs = toArray(compositor.group);
    const filtered = filterGroupRef(refs, name, position);
    if (filtered.length === refs.length) {
      throw new Error(`GroupRef not found: ${originalId}`);
    }
    compositor.group = filtered.length > 0 ? filtered : undefined;
  } else if (
    parentType === "topLevelComplexType" ||
    parentType === "localComplexType"
  ) {
    const ct = parent as ComplexTypeWithGroupRef;
    if (!ct.group) {
      throw new Error(`GroupRef not found: ${originalId}`);
    }
    ct.group = undefined;
  } else {
    throw new Error(
      `Unsupported parent type for groupRef removal: ${parentType}`
    );
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
    const refs = toArray((parent as CompositorWithGroupRefs).group);
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

/**
 * Creates an annotation containing a single documentation entry.
 *
 * @param text - The documentation text
 * @returns A new annotationType instance with the text
 */
function createAnnotation(text: string): annotationType {
  const annotation = new annotationType();
  const doc = new documentationType();
  doc.value = text;
  annotation.documentation = [doc];
  return annotation;
}

// ===== Attribute Group Executors =====

/**
 * Executes an addAttributeGroup command.
 *
 * @param _command - The addAttributeGroup command to execute
 * @param _schemaObj - The schema object to modify
 * @throws Error - Not yet implemented
 */
export function executeAddAttributeGroup(
  _command: AddAttributeGroupCommand,
  _schemaObj: schema
): void {
  throw new Error("addAttributeGroup execution not yet implemented");
}

/**
 * Executes a removeAttributeGroup command.
 *
 * @param _command - The removeAttributeGroup command to execute
 * @param _schemaObj - The schema object to modify
 * @throws Error - Not yet implemented
 */
export function executeRemoveAttributeGroup(
  _command: RemoveAttributeGroupCommand,
  _schemaObj: schema
): void {
  throw new Error("removeAttributeGroup execution not yet implemented");
}

/**
 * Executes a modifyAttributeGroup command.
 *
 * @param _command - The modifyAttributeGroup command to execute
 * @param _schemaObj - The schema object to modify
 * @throws Error - Not yet implemented
 */
export function executeModifyAttributeGroup(
  _command: ModifyAttributeGroupCommand,
  _schemaObj: schema
): void {
  throw new Error("modifyAttributeGroup execution not yet implemented");
}

