/**
 * Validators for group commands (Group and AttributeGroup).
 */

import {
  schema,
  AddGroupCommand,
  RemoveGroupCommand,
  ModifyGroupCommand,
  AddAttributeGroupCommand,
  RemoveAttributeGroupCommand,
  ModifyAttributeGroupCommand,
} from "../../shared/types";
import {
  ValidationResult,
  isValidXmlName,
} from "./validationUtils";
import { toArray } from "../../shared/schemaUtils";
import { parseSchemaId } from "../../shared/idStrategy";

/**
 * Valid content models for Group elements.
 * Groups can only use structure models (sequence, choice, all).
 */
export const VALID_GROUP_CONTENT_MODELS = [
  "sequence",
  "choice",
  "all",
] as const;

// ===== Group Command Validation =====

export function validateAddGroup(
  command: AddGroupCommand,
  schemaObj: schema
): ValidationResult {
  // Validate group name is a valid XML name
  if (!isValidXmlName(command.payload.groupName)) {
    return { valid: false, error: "Group name must be a valid XML name" };
  }
  if (!command.payload.contentModel) {
    return { valid: false, error: "Content model is required" };
  }
  // Validate content model
  if (!VALID_GROUP_CONTENT_MODELS.includes(command.payload.contentModel)) {
    return {
      valid: false,
      error: `Content model must be one of: ${VALID_GROUP_CONTENT_MODELS.join(", ")}`,
    };
  }
  // Check if group name already exists
  const exists = toArray(schemaObj.group).some(
    (g) => g.name === command.payload.groupName
  );
  if (exists) {
    return {
      valid: false,
      error: `Group name already exists: ${command.payload.groupName}`,
    };
  }
  return { valid: true };
}

export function validateRemoveGroup(
  command: RemoveGroupCommand,
  schemaObj: schema
): ValidationResult {
  if (!command.payload.groupId.trim()) {
    return { valid: false, error: "Group ID cannot be empty" };
  }
  const parsed = parseSchemaId(command.payload.groupId);
  const found = toArray(schemaObj.group).some((g) => g.name === parsed.name);
  if (!found) {
    return {
      valid: false,
      error: `Group not found: ${command.payload.groupId}`,
    };
  }
  return { valid: true };
}

export function validateModifyGroup(
  command: ModifyGroupCommand,
  schemaObj: schema
): ValidationResult {
  if (!command.payload.groupId.trim()) {
    return { valid: false, error: "Group ID cannot be empty" };
  }
  const parsed = parseSchemaId(command.payload.groupId);
  const found = toArray(schemaObj.group).some((g) => g.name === parsed.name);
  if (!found) {
    return {
      valid: false,
      error: `Group not found: ${command.payload.groupId}`,
    };
  }
  if (
    command.payload.contentModel !== undefined &&
    !VALID_GROUP_CONTENT_MODELS.includes(command.payload.contentModel)
  ) {
    return {
      valid: false,
      error: `Content model must be one of: ${VALID_GROUP_CONTENT_MODELS.join(", ")}`,
    };
  }
  return { valid: true };
}

// ===== AttributeGroup Command Validation =====

export function validateAddAttributeGroup(
  command: AddAttributeGroupCommand,
  _schemaObj: schema
): ValidationResult {
  // Validate group name is a valid XML name
  if (!isValidXmlName(command.payload.groupName)) {
    return {
      valid: false,
      error: "Attribute group name must be a valid XML name",
    };
  }
  // TODO Phase 2: Check if attribute group name already exists
  return { valid: true };
}

export function validateRemoveAttributeGroup(
  command: RemoveAttributeGroupCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.groupId.trim()) {
    return { valid: false, error: "Attribute group ID cannot be empty" };
  }
  // TODO Phase 2: Validate that groupId exists in schema
  // TODO Phase 2: Check if attribute group is being referenced
  return { valid: true };
}

export function validateModifyAttributeGroup(
  command: ModifyAttributeGroupCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.groupId.trim()) {
    return { valid: false, error: "Attribute group ID cannot be empty" };
  }
  // TODO Phase 2: Validate that groupId exists in schema
  return { valid: true };
}
