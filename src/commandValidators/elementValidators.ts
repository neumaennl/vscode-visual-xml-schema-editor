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
  validateElementType,
} from "./validationUtils";
import { locateNodeById } from "../schemaNavigator";
import { parseSchemaId } from "../../shared/idStrategy";

export function validateAddElement(
  command: AddElementCommand,
  schemaObj: schema
): ValidationResult {
  // Validate element name is a valid XML name
  if (!isValidXmlName(command.payload.elementName)) {
    return { valid: false, error: "Element name must be a valid XML name" };
  }

  // Validate parentId is not empty
  if (!command.payload.parentId.trim()) {
    return { valid: false, error: "Parent ID cannot be empty" };
  }

  // Validate that parentId exists in the schema
  const location = locateNodeById(schemaObj, command.payload.parentId);
  if (!location.found) {
    return { valid: false, error: `Parent node not found: ${command.payload.parentId}` };
  }

  // Validate elementType is a valid built-in or user-defined type
  const typeValidation = validateElementType(command.payload.elementType, schemaObj);
  if (!typeValidation.valid) {
    return typeValidation;
  }

  // Validate occurrences
  return validateOccurrences(
    command.payload.minOccurs,
    command.payload.maxOccurs
  );
}

export function validateRemoveElement(
  command: RemoveElementCommand,
  schemaObj: schema
): ValidationResult {
  // Validate elementId is not empty
  if (!command.payload.elementId.trim()) {
    return { valid: false, error: "Element ID cannot be empty" };
  }

  // Validate that element exists in the schema
  const parsed = parseSchemaId(command.payload.elementId);
  const parentId = parsed.parentId || "schema";
  const location = locateNodeById(schemaObj, parentId);
  
  if (!location.found) {
    return { valid: false, error: `Parent node not found for element: ${command.payload.elementId}` };
  }

  return { valid: true };
}

export function validateModifyElement(
  command: ModifyElementCommand,
  schemaObj: schema
): ValidationResult {
  // Validate elementId is not empty
  if (!command.payload.elementId.trim()) {
    return { valid: false, error: "Element ID cannot be empty" };
  }

  // Validate that element exists in the schema
  const parsed = parseSchemaId(command.payload.elementId);
  const parentId = parsed.parentId || "schema";
  const location = locateNodeById(schemaObj, parentId);
  
  if (!location.found) {
    return { valid: false, error: `Parent node not found for element: ${command.payload.elementId}` };
  }

  // Validate element name if provided
  if (
    command.payload.elementName !== undefined &&
    !isValidXmlName(command.payload.elementName)
  ) {
    return { valid: false, error: "Element name must be a valid XML name" };
  }

  // Validate elementType if provided
  if (command.payload.elementType !== undefined) {
    const typeValidation = validateElementType(command.payload.elementType, schemaObj);
    if (!typeValidation.valid) {
      return typeValidation;
    }
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
