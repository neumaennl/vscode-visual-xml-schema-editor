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
import { ValidationResult, isValidXmlName } from "./validationUtils";

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
  const validModels = [
    "sequence",
    "choice",
    "all",
    "simpleContent",
    "complexContent",
  ];
  if (validModels.indexOf(command.payload.contentModel) === -1) {
    return {
      valid: false,
      error: `Content model must be one of: ${validModels.join(", ")}`,
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
