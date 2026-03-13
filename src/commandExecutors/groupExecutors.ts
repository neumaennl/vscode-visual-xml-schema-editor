/**
 * Executors for group commands (element groups and attribute groups).
 * Implements add, remove, and modify operations for schema groups.
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
} from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";
import { parseSchemaId } from "../../shared/idStrategy";

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
