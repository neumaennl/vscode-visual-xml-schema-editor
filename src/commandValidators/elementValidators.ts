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

/** Parent types that can contain child elements. */
const VALID_ELEMENT_PARENTS = ["schema", "sequence", "choice", "all"] as const;

/** Parent types that can contain attributes. */
const VALID_ATTR_PARENTS = ["schema", "topLevelComplexType", "localComplexType"] as const;

/**
 * Returns the array of local elements from the given parent container.
 * Works for schema, explicitGroup (sequence/choice), and all.
 */
function getChildElements(
  parent: unknown,
  parentType: string
): Array<{ name?: string; ref?: string }> {
  if (parentType === "schema") {
    return toArray((parent as schema).element) as Array<{ name?: string; ref?: string }>;
  }
  if (parentType === "sequence" || parentType === "choice") {
    return toArray((parent as explicitGroup).element) as Array<{ name?: string; ref?: string }>;
  }
  if (parentType === "all") {
    return toArray((parent as all).element) as Array<{ name?: string; ref?: string }>;
  }
  return [];
}

/**
 * Looks up a child element by name or position within a parent container.
 * Returns the element, or undefined if not found.
 */
function findChildElement(
  parent: unknown,
  parentType: string,
  name?: string,
  position?: number
): { name?: string; ref?: string } | undefined {
  const elements = getChildElements(parent, parentType);
  if (position !== undefined) {
    return elements[position];
  }
  if (name !== undefined) {
    return elements.find(
      (el) => el.name === name || el.ref === name
    );
  }
  return undefined;
}

/**
 * Returns the array of attributes from a schema or complexType parent container.
 */
function getChildAttributes(
  parent: unknown,
  parentType: string
): Array<{ name?: string; ref?: string }> {
  if (parentType === "schema") {
    return toArray((parent as schema).attribute) as Array<{ name?: string; ref?: string }>;
  }
  return toArray((parent as topLevelComplexType).attribute) as Array<{
    name?: string;
    ref?: string;
  }>;
}

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
  if (!VALID_ELEMENT_PARENTS.includes(location.parentType as (typeof VALID_ELEMENT_PARENTS)[number])) {
    return { valid: false, error: `Cannot add element to parent of type: ${location.parentType}` };
  }

  // Top-level elements cannot be references
  if (ref !== undefined && location.parentType === "schema") {
    return { valid: false, error: "Top-level elements cannot be references" };
  }

  // Check for duplicate element names/refs
  const existing = getChildElements(location.parent, location.parentType!);
  if (elementName && existing.some(el => el.name === elementName || el.ref === elementName)) {
    return { valid: false, error: `Cannot add element: duplicate element name '${elementName}' in ${location.parentType === "schema" ? "schema" : location.parentType!}` };
  }
  if (ref && existing.some(el => el.ref === ref || el.name === ref)) {
    return { valid: false, error: `Cannot add element: duplicate element reference '${ref}' in ${location.parentType!}` };
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

  const parsed = parseSchemaId(command.payload.elementId);
  const parentId = parsed.parentId || "schema";
  const location = locateNodeById(schemaObj, parentId);

  if (!location.found) {
    return { valid: false, error: `Parent node not found for element: ${command.payload.elementId}` };
  }

  if (!VALID_ELEMENT_PARENTS.includes(location.parentType as (typeof VALID_ELEMENT_PARENTS)[number])) {
    return { valid: false, error: `Cannot remove element from parent of type: ${location.parentType}` };
  }

  // Check element exists
  const el = findChildElement(location.parent, location.parentType!, parsed.name, parsed.position);
  if (!el) {
    const spec = parsed.position !== undefined
      ? `at position: ${parsed.position}`
      : `with name: ${parsed.name}`;
    return { valid: false, error: `Element not found ${spec}` };
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

  const parsed = parseSchemaId(elementId);
  const parentId = parsed.parentId || "schema";
  const location = locateNodeById(schemaObj, parentId);

  if (!location.found) {
    return { valid: false, error: `Parent node not found for element: ${elementId}` };
  }

  if (!VALID_ELEMENT_PARENTS.includes(location.parentType as (typeof VALID_ELEMENT_PARENTS)[number])) {
    return { valid: false, error: `Cannot modify element in parent of type: ${location.parentType}` };
  }

  // Check element exists
  const el = findChildElement(location.parent, location.parentType!, parsed.name, parsed.position);
  if (!el) {
    return { valid: false, error: `Element not found: ${parsed.name ?? `at position ${parsed.position}`}` };
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
    if (!topLevelElements.some(e => e.name === ref)) {
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

  if (!VALID_ATTR_PARENTS.includes(location.parentType as (typeof VALID_ATTR_PARENTS)[number])) {
    return { valid: false, error: `Cannot add attribute to parent of type: ${location.parentType}` };
  }

  // Top-level attributes cannot be references
  if (ref !== undefined && location.parentType === "schema") {
    return { valid: false, error: "Top-level attributes cannot be references" };
  }

  // Check for duplicate attribute names/refs
  const existing = getChildAttributes(location.parent, location.parentType!);
  if (ref && existing.some(a => a.ref === ref || a.name === ref)) {
    return { valid: false, error: `Cannot add attribute: duplicate attribute reference '${ref}' in ${location.parentType}` };
  }
  if (attributeName && existing.some(a => a.name === attributeName || a.ref === attributeName)) {
    return { valid: false, error: `Cannot add attribute: duplicate attribute name '${attributeName}' in ${location.parentType === "schema" ? "schema" : location.parentType!}` };
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

  if (!VALID_ATTR_PARENTS.includes(location.parentType as (typeof VALID_ATTR_PARENTS)[number])) {
    return { valid: false, error: `Cannot remove attribute from parent of type: ${location.parentType}` };
  }

  // Check attribute exists
  const attributes = getChildAttributes(location.parent, location.parentType!);
  const attr =
    parsed.position !== undefined
      ? attributes[parsed.position]
      : attributes.find(a => a.name === parsed.name || a.ref === parsed.name);
  if (!attr) {
    const spec = parsed.position !== undefined
      ? `at position: ${parsed.position}`
      : `with name: ${parsed.name}`;
    return { valid: false, error: `Attribute not found ${spec}` };
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

  if (!VALID_ATTR_PARENTS.includes(location.parentType as (typeof VALID_ATTR_PARENTS)[number])) {
    return { valid: false, error: `Cannot modify attribute in parent of type: ${location.parentType}` };
  }

  // Check attribute exists
  const attributes = getChildAttributes(location.parent, location.parentType!);
  const attrFound =
    parsed.position !== undefined
      ? attributes[parsed.position]
      : attributes.find(a => a.name === parsed.name || a.ref === parsed.name);
  if (!attrFound) {
    return { valid: false, error: `Attribute not found: ${parsed.name ?? `at position ${parsed.position}`}` };
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
