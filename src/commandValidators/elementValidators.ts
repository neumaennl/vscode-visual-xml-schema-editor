/**
 * Validators for element commands.
 */

import {
  schema,
  AddElementCommand,
  RemoveElementCommand,
  ModifyElementCommand,
  explicitGroup,
  all,
} from "../../shared/types.js";
import {
  ValidationResult,
  isValidXmlName,
  validateOccurrences,
  validateElementType,
} from "./validationUtils.js";
import { locateNodeById } from "../schemaNavigator.js";
import { parseSchemaId, SCHEMA_ROOT_ID } from "../../shared/idStrategy.js";

/** Parent types that can contain child elements. */
const VALID_ELEMENT_PARENTS = ["schema", "sequence", "choice", "all"] as const;

/**
 * Returns the array of local elements from the given parent container.
 * Works for schema, explicitGroup (sequence/choice), and all.
 */
function getChildElements(
  parent: unknown,
  parentType: string
): Array<{ name?: string; ref?: string }> {
  if (parentType === "schema") {
    return (parent as schema).element ?? [];
  }
  if (parentType === "sequence" || parentType === "choice") {
    return (parent as explicitGroup).element ?? [];
  }
  if (parentType === "all") {
    return (parent as all).element ?? [];
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
    const topLevelElements = schemaObj.element ?? [];
    if (!topLevelElements.some(el => el.name === ref)) {
      return { valid: false, error: `Referenced element '${ref}' does not exist in schema` };
    }
  } else {
    // Named element: name is required; type is optional (omit when the element will carry
    // an inline anonymous simpleType or complexType added via a subsequent command)
    if (!isValidXmlName(elementName ?? "")) {
      return { valid: false, error: "Element name must be a valid XML name" };
    }
    if (elementType !== undefined) {
      const typeValidation = validateElementType(elementType, schemaObj);
      if (!typeValidation.valid) {
        return typeValidation;
      }
    }
  }

  // Validate that parentId exists in the schema
  const location = locateNodeById(schemaObj, parentId);
  if (!location.found) {
    return { valid: false, error: `Parent node not found: ${parentId}` };
  }
  const parentType = location.parentType;

  // Validate parent type supports elements
  if (!VALID_ELEMENT_PARENTS.includes(parentType as (typeof VALID_ELEMENT_PARENTS)[number])) {
    return { valid: false, error: `Cannot add element to parent of type: ${parentType}` };
  }

  // Top-level elements cannot be references
  if (ref !== undefined && parentType === "schema") {
    return { valid: false, error: "Top-level elements cannot be references" };
  }

  // Check for duplicate element names/refs
  const existing = getChildElements(location.parent, parentType);
  if (elementName && existing.some(el => el.name === elementName || el.ref === elementName)) {
    return { valid: false, error: `Cannot add element: duplicate element name '${elementName}' in ${parentType === "schema" ? "schema" : parentType}` };
  }
  if (ref && existing.some(el => el.ref === ref || el.name === ref)) {
    return { valid: false, error: `Cannot add element: duplicate element reference '${ref}' in ${parentType}` };
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
  const parentId = parsed.parentId || SCHEMA_ROOT_ID;
  const location = locateNodeById(schemaObj, parentId);

  if (!location.found) {
    return { valid: false, error: `Parent node not found for element: ${command.payload.elementId}` };
  }
  const parentType = location.parentType;

  if (!VALID_ELEMENT_PARENTS.includes(parentType as (typeof VALID_ELEMENT_PARENTS)[number])) {
    return { valid: false, error: `Cannot remove element from parent of type: ${parentType}` };
  }

  // Check element exists
  const el = findChildElement(location.parent, parentType, parsed.name, parsed.position);
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
  const { elementId, elementName, elementType, ref, minOccurs, maxOccurs, default_, fixed } = command.payload;

  // Validate elementId is not empty
  if (!elementId.trim()) {
    return { valid: false, error: "Element ID cannot be empty" };
  }

  const parsed = parseSchemaId(elementId);
  const parentId = parsed.parentId || SCHEMA_ROOT_ID;
  const location = locateNodeById(schemaObj, parentId);

  if (!location.found) {
    return { valid: false, error: `Parent node not found for element: ${elementId}` };
  }
  const parentType = location.parentType;

  if (!VALID_ELEMENT_PARENTS.includes(parentType as (typeof VALID_ELEMENT_PARENTS)[number])) {
    return { valid: false, error: `Cannot modify element in parent of type: ${parentType}` };
  }

  // Check element exists
  const el = findChildElement(location.parent, parentType, parsed.name, parsed.position);
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
    const topLevelElements = schemaObj.element ?? [];
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

  // XML Schema allows at most one of default and fixed, and neither on a reference; an empty string removes the value
  if (default_ && fixed) {
    return { valid: false, error: "An element cannot have both a default value and a fixed value" };
  }
  const isReference = ref !== undefined || (el.ref !== undefined && elementName === undefined);
  if (isReference && (default_ || fixed)) {
    return { valid: false, error: "A reference element cannot have a default or fixed value" };
  }

  // Validate occurrences
  return validateOccurrences(minOccurs, maxOccurs);
}
