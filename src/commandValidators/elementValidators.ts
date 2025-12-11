/**
 * Validators for element and attribute commands.
 */

import {
  schema,
  AddElementCommand,
  RemoveElementCommand,
  ModifyElementCommand,
  AddAttributeCommand,
  RemoveAttributeCommand,
  ModifyAttributeCommand,
} from "../../shared/types";
import {
  ValidationResult,
  isValidXmlName,
  validateOccurrences,
} from "./validationUtils";

export function validateAddElement(
  command: AddElementCommand,
  _schemaObj: schema
): ValidationResult {
  // Validate element name is a valid XML name
  if (!isValidXmlName(command.payload.elementName)) {
    return { valid: false, error: "Element name must be a valid XML name" };
  }

  // Validate parentId is not empty
  // TODO Phase 2: Validate that parentId exists in the schema
  if (!command.payload.parentId.trim()) {
    return { valid: false, error: "Parent ID cannot be empty" };
  }

  // Validate elementType is not empty
  // TODO Phase 2: Validate that elementType is a valid built-in or user-defined type
  if (!command.payload.elementType.trim()) {
    return { valid: false, error: "Element type is required" };
  }

  // Validate occurrences
  return validateOccurrences(
    command.payload.minOccurs,
    command.payload.maxOccurs
  );
}

export function validateRemoveElement(
  command: RemoveElementCommand,
  _schemaObj: schema
): ValidationResult {
  // In Phase 2, we would validate that elementId exists in the schema
  // For now, just validate it's not empty
  if (!command.payload.elementId.trim()) {
    return { valid: false, error: "Element ID cannot be empty" };
  }
  return { valid: true };
}

export function validateModifyElement(
  command: ModifyElementCommand,
  _schemaObj: schema
): ValidationResult {
  // In Phase 2, we would validate that elementId exists in the schema
  if (!command.payload.elementId.trim()) {
    return { valid: false, error: "Element ID cannot be empty" };
  }

  // Validate element name if provided
  if (
    command.payload.elementName !== undefined &&
    !isValidXmlName(command.payload.elementName)
  ) {
    return { valid: false, error: "Element name must be a valid XML name" };
  }

  // Validate occurrences
  return validateOccurrences(
    command.payload.minOccurs,
    command.payload.maxOccurs
  );
}

// ===== Attribute Command Validation =====

export function validateAddAttribute(
  command: AddAttributeCommand,
  _schemaObj: schema
): ValidationResult {
  if (!isValidXmlName(command.payload.attributeName)) {
    return { valid: false, error: "Attribute name must be a valid XML name" };
  }
  if (!command.payload.parentId.trim()) {
    return { valid: false, error: "Parent ID cannot be empty" };
  }
  // TODO Phase 2: Validate that parentId exists in the schema
  return { valid: true };
}

export function validateRemoveAttribute(
  command: RemoveAttributeCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.attributeId.trim()) {
    return { valid: false, error: "Attribute ID cannot be empty" };
  }
  // TODO Phase 2: Validate that attributeId exists in the schema
  return { valid: true };
}

export function validateModifyAttribute(
  command: ModifyAttributeCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.attributeId.trim()) {
    return { valid: false, error: "Attribute ID cannot be empty" };
  }
  // TODO Phase 2: Validate that attributeId exists in the schema
  return { valid: true };
}
