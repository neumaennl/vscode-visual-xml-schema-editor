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
import { toArray } from "../../shared/schemaUtils";

export function validateAddElement(
  command: AddElementCommand,
  schemaObj: schema
): ValidationResult {
  const { parentId, elementName, elementType, ref, minOccurs, maxOccurs } = command.payload;

  // Validate parentId is not empty
  if (!parentId.trim()) {
    return { valid: false, error: "Parent ID cannot be empty" };
  }

  if (ref !== undefined) {
    // Reference element: name and type are forbidden
    if (elementName !== undefined || elementType !== undefined) {
      return { valid: false, error: "A reference element cannot have a name or type" };
    }
    if (!isValidXmlName(ref)) {
      return { valid: false, error: "Element ref must be a valid XML name" };
    }
    // Validate that the referenced element exists as a top-level element
    const topLevelElements = toArray(schemaObj.element);
    if (!topLevelElements.some(el => el.name === ref)) {
      return { valid: false, error: `Referenced element '${ref}' does not exist in schema` };
    }
  } else {
    // Named element: name and type are required
    if (!isValidXmlName(elementName ?? "")) {
      return { valid: false, error: "Element name must be a valid XML name" };
    }
    const typeValidation = validateElementType(elementType ?? "", schemaObj);
    if (!typeValidation.valid) {
      return typeValidation;
    }
  }

  // Validate that parentId exists in the schema
  const location = locateNodeById(schemaObj, parentId);
  if (!location.found) {
    return { valid: false, error: `Parent node not found: ${parentId}` };
  }

  // Top-level elements cannot be references
  if (ref !== undefined && location.parentType === "schema") {
    return { valid: false, error: "Top-level elements cannot be references" };
  }

  // Validate occurrences
  return validateOccurrences(minOccurs, maxOccurs);
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
  const { elementId, elementName, elementType, ref, minOccurs, maxOccurs } = command.payload;

  // Validate elementId is not empty
  if (!elementId.trim()) {
    return { valid: false, error: "Element ID cannot be empty" };
  }

  // Validate that element exists in the schema
  const parsed = parseSchemaId(elementId);
  const parentId = parsed.parentId || "schema";
  const location = locateNodeById(schemaObj, parentId);

  if (!location.found) {
    return { valid: false, error: `Parent node not found for element: ${elementId}` };
  }

  if (ref !== undefined) {
    // Reference: name and type are forbidden
    if (elementName !== undefined || elementType !== undefined) {
      return { valid: false, error: "Cannot set both ref and name/type on an element" };
    }
    if (!isValidXmlName(ref)) {
      return { valid: false, error: "Element ref must be a valid XML name" };
    }
    // Validate that the referenced element exists as a top-level element
    const topLevelElements = toArray(schemaObj.element);
    if (!topLevelElements.some(el => el.name === ref)) {
      return { valid: false, error: `Referenced element '${ref}' does not exist in schema` };
    }
  } else {
    // Validate element name if provided
    if (elementName !== undefined && !isValidXmlName(elementName)) {
      return { valid: false, error: "Element name must be a valid XML name" };
    }

    // Validate elementType if provided
    if (elementType !== undefined) {
      const typeValidation = validateElementType(elementType, schemaObj);
      if (!typeValidation.valid) {
        return typeValidation;
      }
    }
  }

  // Validate occurrences
  return validateOccurrences(minOccurs, maxOccurs);
}

// ===== Attribute Command Validation =====

export function validateAddAttribute(
  command: AddAttributeCommand,
  schemaObj: schema
): ValidationResult {
  const { parentId, attributeName, attributeType, ref, defaultValue, fixedValue } =
    command.payload;

  if (!parentId.trim()) {
    return { valid: false, error: "Parent ID cannot be empty" };
  }

  if (ref !== undefined) {
    // Reference attribute: name, type, default, and fixed are forbidden
    if (attributeName !== undefined || attributeType !== undefined) {
      return { valid: false, error: "A reference attribute cannot have a name or type" };
    }
    if (defaultValue !== undefined || fixedValue !== undefined) {
      return {
        valid: false,
        error: "A reference attribute cannot have a default or fixed value",
      };
    }
    if (!isValidXmlName(ref)) {
      return { valid: false, error: "Attribute ref must be a valid XML name" };
    }
    // Validate that the referenced attribute exists as a top-level attribute
    const topLevelAttributes = toArray(schemaObj.attribute);
    if (!topLevelAttributes.some(a => a.name === ref)) {
      return { valid: false, error: `Referenced attribute '${ref}' does not exist in schema` };
    }
  } else {
    // Named attribute: name is required
    if (!isValidXmlName(attributeName ?? "")) {
      return { valid: false, error: "Attribute name must be a valid XML name" };
    }
    if (defaultValue !== undefined && fixedValue !== undefined) {
      return {
        valid: false,
        error: "An attribute cannot have both a default value and a fixed value",
      };
    }
  }

  const location = locateNodeById(schemaObj, parentId);
  if (!location.found) {
    return { valid: false, error: `Parent node not found: ${parentId}` };
  }

  // Top-level attributes cannot be references
  if (ref !== undefined && location.parentType === "schema") {
    return { valid: false, error: "Top-level attributes cannot be references" };
  }

  return { valid: true };
}

export function validateRemoveAttribute(
  command: RemoveAttributeCommand,
  schemaObj: schema
): ValidationResult {
  if (!command.payload.attributeId.trim()) {
    return { valid: false, error: "Attribute ID cannot be empty" };
  }

  const parsed = parseSchemaId(command.payload.attributeId);
  const parentId = parsed.parentId ?? "schema";
  const location = locateNodeById(schemaObj, parentId);
  if (!location.found) {
    return {
      valid: false,
      error: `Parent node not found for attribute: ${command.payload.attributeId}`,
    };
  }

  return { valid: true };
}

export function validateModifyAttribute(
  command: ModifyAttributeCommand,
  schemaObj: schema
): ValidationResult {
  const { attributeId, attributeName, attributeType, ref, defaultValue, fixedValue } =
    command.payload;

  if (!attributeId.trim()) {
    return { valid: false, error: "Attribute ID cannot be empty" };
  }

  const parsed = parseSchemaId(attributeId);
  const parentId = parsed.parentId ?? "schema";
  const location = locateNodeById(schemaObj, parentId);
  if (!location.found) {
    return {
      valid: false,
      error: `Parent node not found for attribute: ${attributeId}`,
    };
  }

  if (ref !== undefined) {
    // Reference: name, type, default, and fixed are forbidden
    if (attributeName !== undefined || attributeType !== undefined) {
      return { valid: false, error: "Cannot set both ref and name/type on an attribute" };
    }
    if (defaultValue !== undefined || fixedValue !== undefined) {
      return {
        valid: false,
        error: "A reference attribute cannot have a default or fixed value",
      };
    }
    if (!isValidXmlName(ref)) {
      return { valid: false, error: "Attribute ref must be a valid XML name" };
    }
    // Validate that the referenced attribute exists as a top-level attribute
    const topLevelAttributes = toArray(schemaObj.attribute);
    if (!topLevelAttributes.some(a => a.name === ref)) {
      return { valid: false, error: `Referenced attribute '${ref}' does not exist in schema` };
    }
  } else {
    if (attributeName !== undefined && !isValidXmlName(attributeName)) {
      return { valid: false, error: "Attribute name must be a valid XML name" };
    }
    if (defaultValue !== undefined && fixedValue !== undefined) {
      return {
        valid: false,
        error: "An attribute cannot have both a default value and a fixed value",
      };
    }
  }

  return { valid: true };
}
