/**
 * Validators for attribute commands.
 */

import {
  schema,
  AddAttributeCommand,
  RemoveAttributeCommand,
  ModifyAttributeCommand,
  topLevelComplexType,
} from "../../shared/types.js";
import { ValidationResult, isValidXmlName } from "./validationUtils.js";
import { locateNodeById } from "../schemaNavigator.js";
import { parseSchemaId, SCHEMA_ROOT_ID } from "../../shared/idStrategy.js";

/** Parent types that can contain attributes. */
const VALID_ATTR_PARENTS = ["schema", "topLevelComplexType", "localComplexType"] as const;

/**
 * Returns the array of attributes from a schema or complexType parent container.
 */
function getChildAttributes(
  parent: unknown,
  parentType: string
): Array<{ name?: string; ref?: string }> {
  if (parentType === "schema") {
    return (parent as schema).attribute ?? [];
  }
  return (parent as topLevelComplexType).attribute ?? [];
}

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
    const topLevelAttributes = schemaObj.attribute ?? [];
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
  const parentType = location.parentType;

  if (!VALID_ATTR_PARENTS.includes(parentType as (typeof VALID_ATTR_PARENTS)[number])) {
    return { valid: false, error: `Cannot add attribute to parent of type: ${parentType}` };
  }

  // Top-level attributes cannot be references
  if (ref !== undefined && parentType === "schema") {
    return { valid: false, error: "Top-level attributes cannot be references" };
  }

  // Check for duplicate attribute names/refs
  const existing = getChildAttributes(location.parent, parentType);
  if (ref && existing.some(a => a.ref === ref || a.name === ref)) {
    return { valid: false, error: `Cannot add attribute: duplicate attribute reference '${ref}' in ${parentType}` };
  }
  if (attributeName && existing.some(a => a.name === attributeName || a.ref === attributeName)) {
    return { valid: false, error: `Cannot add attribute: duplicate attribute name '${attributeName}' in ${parentType === "schema" ? "schema" : parentType}` };
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
  const parentId = parsed.parentId ?? SCHEMA_ROOT_ID;
  const location = locateNodeById(schemaObj, parentId);
  if (!location.found) {
    return {
      valid: false,
      error: `Parent node not found for attribute: ${command.payload.attributeId}`,
    };
  }
  const parentType = location.parentType;

  if (!VALID_ATTR_PARENTS.includes(parentType as (typeof VALID_ATTR_PARENTS)[number])) {
    return { valid: false, error: `Cannot remove attribute from parent of type: ${parentType}` };
  }

  // Check attribute exists
  const attributes = getChildAttributes(location.parent, parentType);
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
  const parentId = parsed.parentId ?? SCHEMA_ROOT_ID;
  const location = locateNodeById(schemaObj, parentId);
  if (!location.found) {
    return {
      valid: false,
      error: `Parent node not found for attribute: ${attributeId}`,
    };
  }
  const parentType = location.parentType;

  if (!VALID_ATTR_PARENTS.includes(parentType as (typeof VALID_ATTR_PARENTS)[number])) {
    return { valid: false, error: `Cannot modify attribute in parent of type: ${parentType}` };
  }

  // Check attribute exists
  const attributes = getChildAttributes(location.parent, parentType);
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
    const topLevelAttributes = schemaObj.attribute ?? [];
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
