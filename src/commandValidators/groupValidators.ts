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
import { ValidationResult, isValidXmlName } from "./validationUtils";

// ===== Group Command Validation =====

export function validateAddGroup(
  command: AddGroupCommand,
  _schemaObj: schema
): ValidationResult {
  // Validate group name is a valid XML name
  if (!isValidXmlName(command.payload.groupName)) {
    return { valid: false, error: "Group name must be a valid XML name" };
  }
  if (!command.payload.contentModel) {
    return { valid: false, error: "Content model is required" };
  }
  // Validate content model
  const validModels = ["sequence", "choice", "all"];
  if (!validModels.includes(command.payload.contentModel)) {
    return {
      valid: false,
      error: `Content model must be one of: ${validModels.join(", ")}`,
    };
  }
  // TODO Phase 2: Check if group name already exists
  return { valid: true };
}

export function validateRemoveGroup(
  command: RemoveGroupCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.groupId.trim()) {
    return { valid: false, error: "Group ID cannot be empty" };
  }
  // TODO Phase 2: Validate that groupId exists in schema
  // TODO Phase 2: Check if group is being referenced
  return { valid: true };
}

export function validateModifyGroup(
  command: ModifyGroupCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.groupId.trim()) {
    return { valid: false, error: "Group ID cannot be empty" };
  }
  // TODO Phase 2: Validate that groupId exists in schema
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
