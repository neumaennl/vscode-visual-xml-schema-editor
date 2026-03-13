/**
 * Executors for group commands (element groups and attribute groups).
 * Implements add, remove, and modify operations for schema groups.
 */

import {
  schema,
  AddGroupCommand,
  RemoveGroupCommand,
  ModifyGroupCommand,
  AddGroupRefCommand,
  RemoveGroupRefCommand,
  ModifyGroupRefCommand,
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
import { parseSchemaId } from "../../shared/idStrategy";
import { locateNodeById } from "../schemaNavigator";

// ===== Element Group Executors =====

/**
 * Executes an addGroup command.
 * Creates a named model group definition at the top level of the schema.
 *
 * @param command - The addGroup command to execute
 * @param schemaObj - The schema object to modify
 */
export function executeAddGroup(
  command: AddGroupCommand,
  schemaObj: schema
): void {
  const { groupName, contentModel, documentation } = command.payload;

  const grp = new namedGroup();
  grp.name = groupName;
  if (documentation) {
    grp.annotation = createAnnotation(documentation);
  }
  applyGroupContentModel(grp, contentModel);

  const groups = toArray(schemaObj.group);
  groups.push(grp);
  schemaObj.group = groups;
}

/**
 * Executes a removeGroup command.
 * Removes a named model group definition by its ID.
 *
 * @param command - The removeGroup command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the group is not found
 */
export function executeRemoveGroup(
  command: RemoveGroupCommand,
  schemaObj: schema
): void {
  const { groupId } = command.payload;
  const parsed = parseSchemaId(groupId);

  const groups = toArray(schemaObj.group);
  const filtered = groups.filter((g) => g.name !== parsed.name);
  if (filtered.length === groups.length) {
    throw new Error(`Group not found: ${parsed.name}`);
  }
  schemaObj.group = filtered.length > 0 ? filtered : undefined;
}

/**
 * Executes a modifyGroup command.
 * Updates properties (name, contentModel, documentation) of an existing group.
 *
 * @param command - The modifyGroup command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the group is not found
 */
export function executeModifyGroup(
  command: ModifyGroupCommand,
  schemaObj: schema
): void {
  const { groupId, groupName, contentModel, documentation } = command.payload;
  const parsed = parseSchemaId(groupId);

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

/**
 * A structural type shared by namedGroup for content model operations.
 */
type GroupHolder = {
  all?: allType;
  choice?: simpleExplicitGroup;
  sequence?: simpleExplicitGroup;
};

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

// ===== Group Reference Executors =====

/**
 * Structural type for a compositor (sequence or choice) that holds group refs.
 * Both `explicitGroup` and `simpleExplicitGroup` share this shape.
 */
type CompositorWithGroupRefs = { group?: groupRef[] };

/**
 * Structural type for a complexType that can have a direct group ref child.
 */
type ComplexTypeWithGroupRef = { group?: groupRef };

/**
 * Executes an addGroupRef command.
 * Adds a group reference (xs:group ref="...") to a sequence, choice,
 * or directly to a complexType.
 *
 * @param command - The addGroupRef command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the parent node is not found or unsupported
 */
export function executeAddGroupRef(
  command: AddGroupRefCommand,
  schemaObj: schema
): void {
  const { parentId, ref, minOccurs, maxOccurs } = command.payload;

  const location = locateNodeById(schemaObj, parentId);
  if (!location.found || !location.parent || !location.parentType) {
    throw new Error(`Parent node not found: ${parentId}`);
  }

  const grpRef = new groupRef();
  grpRef.ref = ref;
  if (minOccurs !== undefined) {
    grpRef.minOccurs = minOccurs;
  }
  if (maxOccurs !== undefined) {
    grpRef.maxOccurs = maxOccurs;
  }

  if (
    location.parentType === "sequence" ||
    location.parentType === "choice"
  ) {
    const compositor = location.parent as CompositorWithGroupRefs;
    const refs = toArray(compositor.group);
    refs.push(grpRef);
    compositor.group = refs;
  } else if (
    location.parentType === "topLevelComplexType" ||
    location.parentType === "localComplexType"
  ) {
    (location.parent as ComplexTypeWithGroupRef).group = grpRef;
  } else {
    throw new Error(
      `Cannot add group ref to parent type: ${location.parentType}`
    );
  }
}

/**
 * Executes a removeGroupRef command.
 * Removes a group reference identified by its ID from its parent compositor
 * or complexType.
 *
 * @param command - The removeGroupRef command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the group ref or its parent is not found
 */
export function executeRemoveGroupRef(
  command: RemoveGroupRefCommand,
  schemaObj: schema
): void {
  const { groupRefId } = command.payload;
  const parsed = parseSchemaId(groupRefId);
  if (!parsed.parentId) {
    throw new Error(`Invalid groupRef ID: ${groupRefId}`);
  }

  const location = locateNodeById(schemaObj, parsed.parentId);
  if (!location.found || !location.parent || !location.parentType) {
    throw new Error(`Parent not found for groupRef: ${groupRefId}`);
  }

  if (
    location.parentType === "sequence" ||
    location.parentType === "choice"
  ) {
    const compositor = location.parent as CompositorWithGroupRefs;
    const refs = toArray(compositor.group);
    const filtered = removeGroupRefFromArray(refs, parsed.name, parsed.position);
    if (filtered.length === refs.length) {
      throw new Error(`GroupRef not found: ${groupRefId}`);
    }
    compositor.group = filtered.length > 0 ? filtered : undefined;
  } else if (
    location.parentType === "topLevelComplexType" ||
    location.parentType === "localComplexType"
  ) {
    const ct = location.parent as ComplexTypeWithGroupRef;
    if (!ct.group) {
      throw new Error(`GroupRef not found: ${groupRefId}`);
    }
    ct.group = undefined;
  } else {
    throw new Error(
      `Unsupported parent type for groupRef removal: ${location.parentType}`
    );
  }
}

/**
 * Executes a modifyGroupRef command.
 * Updates properties (ref target, minOccurs, maxOccurs) of an existing
 * group reference.
 *
 * @param command - The modifyGroupRef command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the group ref or its parent is not found
 */
export function executeModifyGroupRef(
  command: ModifyGroupRefCommand,
  schemaObj: schema
): void {
  const { groupRefId, ref, minOccurs, maxOccurs } = command.payload;
  const parsed = parseSchemaId(groupRefId);
  if (!parsed.parentId) {
    throw new Error(`Invalid groupRef ID: ${groupRefId}`);
  }

  const location = locateNodeById(schemaObj, parsed.parentId);
  if (!location.found || !location.parent || !location.parentType) {
    throw new Error(`Parent not found for groupRef: ${groupRefId}`);
  }

  let target: groupRef | undefined;

  if (
    location.parentType === "sequence" ||
    location.parentType === "choice"
  ) {
    const compositor = location.parent as CompositorWithGroupRefs;
    target = findGroupRefInArray(
      toArray(compositor.group),
      parsed.name,
      parsed.position
    );
  } else if (
    location.parentType === "topLevelComplexType" ||
    location.parentType === "localComplexType"
  ) {
    target = (location.parent as ComplexTypeWithGroupRef).group;
  } else {
    throw new Error(
      `Unsupported parent type for groupRef modification: ${location.parentType}`
    );
  }

  if (!target) {
    throw new Error(`GroupRef not found: ${groupRefId}`);
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
}

// ===== Group Reference Helper Functions =====

/**
 * Finds a groupRef in an array by its ref name and optional position.
 *
 * @param refs - The array to search
 * @param name - The `ref` attribute value to match
 * @param position - Optional position index for disambiguation
 * @returns The matching groupRef or undefined
 */
function findGroupRefInArray(
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
 * Returns a new array with the matching groupRef removed.
 *
 * @param refs - The array to filter
 * @param name - The `ref` attribute value to match
 * @param position - Optional position index for disambiguation
 * @returns Filtered array
 */
function removeGroupRefFromArray(
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
