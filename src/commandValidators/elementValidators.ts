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
  explicitGroup,
  all,
  topLevelComplexType,
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

  // Validate parent type supports elements
  const validElementParents = ["schema", "sequence", "choice", "all"];
  if (!validElementParents.includes(location.parentType ?? "")) {
    return { valid: false, error: `Cannot add element to parent of type: ${location.parentType}` };
  }
  // Check for duplicate element names/refs
  if (location.parentType === "schema") {
    const schemaObj2 = location.parent as import("../../shared/types").schema;
    if (elementName && toArray(schemaObj2.element).some(el => el.name === elementName)) {
      return { valid: false, error: `Cannot add element: duplicate element name '${elementName}' in schema` };
    }
  } else if (location.parentType === "sequence" || location.parentType === "choice") {
    const group = location.parent as explicitGroup;
    const elements = toArray(group.element);
    if (elementName && elements.some(el => (el as any).name === elementName || (el as any).ref === elementName)) {
      return { valid: false, error: `Cannot add element: duplicate element name '${elementName}' in ${location.parentType}` };
    }
    if (ref && elements.some(el => (el as any).ref === ref || (el as any).name === ref)) {
      return { valid: false, error: `Cannot add element: duplicate element reference '${ref}' in ${location.parentType}` };
    }
  } else if (location.parentType === "all") {
    const allGroup = location.parent as all;
    const elements = toArray(allGroup.element);
    if (elementName && elements.some(el => el.name === elementName || (el as any).ref === elementName)) {
      return { valid: false, error: `Cannot add element: duplicate element name '${elementName}' in all group` };
    }
    if (ref && elements.some(el => (el as any).ref === ref || el.name === ref)) {
      return { valid: false, error: `Cannot add element: duplicate element reference '${ref}' in all group` };
    }
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

  // Validate parent type supports element removal
  const validElementParents = ["schema", "sequence", "choice", "all"];
  if (!validElementParents.includes(location.parentType ?? "")) {
    return { valid: false, error: `Cannot remove element from parent of type: ${location.parentType}` };
  }
  // Check element exists
  const elementName = parsed.name;
  const position = parsed.position;
  if (location.parentType === "schema") {
    const elements = toArray((location.parent as schema).element);
    if (position !== undefined) {
      if (position < 0 || position >= elements.length) {
        return { valid: false, error: `Element not found at position: ${position}` };
      }
    } else if (elementName !== undefined) {
      if (!elements.some(el => el.name === elementName || (el as any).ref === elementName)) {
        return { valid: false, error: `Element not found with name: ${elementName}` };
      }
    }
  } else if (location.parentType === "sequence" || location.parentType === "choice") {
    const elements = toArray((location.parent as explicitGroup).element);
    if (position !== undefined) {
      if (position < 0 || position >= elements.length) {
        return { valid: false, error: `Element not found at position: ${position}` };
      }
    } else if (elementName !== undefined) {
      if (!elements.some(el => (el as any).name === elementName || (el as any).ref === elementName)) {
        return { valid: false, error: `Element not found with name: ${elementName}` };
      }
    }
  } else if (location.parentType === "all") {
    const elements = toArray((location.parent as all).element);
    if (position !== undefined) {
      if (position < 0 || position >= elements.length) {
        return { valid: false, error: `Element not found at position: ${position}` };
      }
    } else if (elementName !== undefined) {
      if (!elements.some(el => el.name === elementName || (el as any).ref === elementName)) {
        return { valid: false, error: `Element not found with name: ${elementName}` };
      }
    }
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

  // Validate parent type
  const validElementParents = ["schema", "sequence", "choice", "all"];
  if (!validElementParents.includes(location.parentType ?? "")) {
    return { valid: false, error: `Cannot modify element in parent of type: ${location.parentType}` };
  }
  // Check element exists
  const elementName2 = parsed.name;
  const position2 = parsed.position;
  if (location.parentType === "schema") {
    const elements = toArray((location.parent as schema).element);
    const found = position2 !== undefined ? elements[position2] : elements.find(el => el.name === elementName2 || (el as any).ref === elementName2);
    if (!found) {
      return { valid: false, error: `Element not found: ${elementName2 ?? `at position ${position2}`}` };
    }
  } else if (location.parentType === "sequence" || location.parentType === "choice") {
    const elements = toArray((location.parent as explicitGroup).element);
    const found = position2 !== undefined ? elements[position2] : elements.find(el => (el as any).name === elementName2 || (el as any).ref === elementName2);
    if (!found) {
      return { valid: false, error: `Element not found: ${elementName2 ?? `at position ${position2}`}` };
    }
  } else if (location.parentType === "all") {
    const elements = toArray((location.parent as all).element);
    const found = position2 !== undefined ? elements[position2] : elements.find(el => el.name === elementName2 || (el as any).ref === elementName2);
    if (!found) {
      return { valid: false, error: `Element not found: ${elementName2 ?? `at position ${position2}`}` };
    }
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

  // Validate parent type supports attributes
  const validAttrParents = ["schema", "topLevelComplexType", "localComplexType"];
  if (!validAttrParents.includes(location.parentType ?? "")) {
    return { valid: false, error: `Cannot add attribute to parent of type: ${location.parentType}` };
  }
  // Check for duplicate attribute names/refs
  if (location.parentType === "schema") {
    const attributes = toArray((location.parent as schema).attribute);
    if (attributeName && attributes.some(a => a.name === attributeName)) {
      return { valid: false, error: `Cannot add attribute: duplicate attribute name '${attributeName}' in schema` };
    }
  } else {
    const complexType = location.parent as topLevelComplexType;
    const attributes = toArray(complexType.attribute);
    if (ref && attributes.some(a => (a as any).ref === ref || a.name === ref)) {
      return { valid: false, error: `Cannot add attribute: duplicate attribute reference '${ref}' in ${location.parentType}` };
    }
    if (attributeName && attributes.some(a => a.name === attributeName || (a as any).ref === attributeName)) {
      return { valid: false, error: `Cannot add attribute: duplicate attribute name '${attributeName}' in ${location.parentType}` };
    }
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

  // Validate parent type
  const validAttrParents2 = ["schema", "topLevelComplexType", "localComplexType"];
  if (!validAttrParents2.includes(location.parentType ?? "")) {
    return { valid: false, error: `Cannot remove attribute from parent of type: ${location.parentType}` };
  }
  // Check attribute exists
  const attrName = parsed.name;
  const attrPos = parsed.position;
  const attributes = location.parentType === "schema"
    ? toArray((location.parent as schema).attribute)
    : toArray((location.parent as topLevelComplexType).attribute);
  if (attrPos !== undefined) {
    if (attrPos < 0 || attrPos >= attributes.length) {
      return { valid: false, error: `Attribute not found at position: ${attrPos}` };
    }
  } else if (attrName !== undefined) {
    if (!attributes.some(a => a.name === attrName || (a as any).ref === attrName)) {
      return { valid: false, error: `Attribute not found with name: ${attrName}` };
    }
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

  // Validate parent type  
  const validAttrParents3 = ["schema", "topLevelComplexType", "localComplexType"];
  if (!validAttrParents3.includes(location.parentType ?? "")) {
    return { valid: false, error: `Cannot modify attribute in parent of type: ${location.parentType}` };
  }
  // Check attribute exists
  const attrNameM = parsed.name;
  const attrPosM = parsed.position;
  const attributesM = location.parentType === "schema"
    ? toArray((location.parent as schema).attribute)
    : toArray((location.parent as topLevelComplexType).attribute);
  const attrFound = attrPosM !== undefined ? attributesM[attrPosM] : attributesM.find(a => a.name === attrNameM || (a as any).ref === attrNameM);
  if (!attrFound) {
    return { valid: false, error: `Attribute not found: ${attrNameM ?? `at position ${attrPosM}`}` };
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
