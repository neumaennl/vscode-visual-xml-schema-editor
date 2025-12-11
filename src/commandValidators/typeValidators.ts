/**
 * Validators for type commands (SimpleType and ComplexType).
 */

import {
  schema,
  AddSimpleTypeCommand,
  RemoveSimpleTypeCommand,
  ModifySimpleTypeCommand,
  AddComplexTypeCommand,
  RemoveComplexTypeCommand,
  ModifyComplexTypeCommand,
} from "../../shared/types";
import {
  ValidationResult,
  isValidXmlName,
} from "./validationUtils";

/**
 * Valid content models for ComplexType elements.
 * Only compositor models are supported in Phase 1 (sequence, choice, all).
 * Note: ContentModel type in shared/commands/schemaTypes.ts defines: "sequence" | "choice" | "all"
 */
export const VALID_COMPLEX_TYPE_CONTENT_MODELS = [
  "sequence",
  "choice",
  "all",
] as const;

// ===== SimpleType Command Validation =====

export function validateAddSimpleType(
  command: AddSimpleTypeCommand,
  _schemaObj: schema
): ValidationResult {
  // Validate type name is a valid XML name
  if (!isValidXmlName(command.payload.typeName)) {
    return { valid: false, error: "Type name must be a valid XML name" };
  }
  // TODO Phase 2: Check if type name already exists in schema
  // TODO Phase 2: Validate baseType exists if specified
  return { valid: true };
}

export function validateRemoveSimpleType(
  command: RemoveSimpleTypeCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.typeId.trim()) {
    return { valid: false, error: "Type ID cannot be empty" };
  }
  // TODO Phase 2: Validate that typeId exists in schema
  // TODO Phase 2: Check if type is being used by other elements/types
  return { valid: true };
}

export function validateModifySimpleType(
  command: ModifySimpleTypeCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.typeId.trim()) {
    return { valid: false, error: "Type ID cannot be empty" };
  }
  // TODO Phase 2: Validate that typeId exists in schema
  return { valid: true };
}

// ===== ComplexType Command Validation =====

export function validateAddComplexType(
  command: AddComplexTypeCommand,
  _schemaObj: schema
): ValidationResult {
  // Validate type name is a valid XML name
  if (!isValidXmlName(command.payload.typeName)) {
    return { valid: false, error: "Type name must be a valid XML name" };
  }
  if (!command.payload.contentModel) {
    return { valid: false, error: "Content model is required" };
  }
  // Validate content model is one of the valid options
  if (!VALID_COMPLEX_TYPE_CONTENT_MODELS.includes(command.payload.contentModel)) {
    return {
      valid: false,
      error: `Content model must be one of: ${VALID_COMPLEX_TYPE_CONTENT_MODELS.join(", ")}`,
    };
  }
  // TODO Phase 2: Check if type name already exists in schema
  return { valid: true };
}

export function validateRemoveComplexType(
  command: RemoveComplexTypeCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.typeId.trim()) {
    return { valid: false, error: "Type ID cannot be empty" };
  }
  // TODO Phase 2: Validate that typeId exists in schema
  // TODO Phase 2: Check if type is being used by other elements/types
  return { valid: true };
}

export function validateModifyComplexType(
  command: ModifyComplexTypeCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.typeId.trim()) {
    return { valid: false, error: "Type ID cannot be empty" };
  }
  // TODO Phase 2: Validate that typeId exists in schema
  return { valid: true };
}
