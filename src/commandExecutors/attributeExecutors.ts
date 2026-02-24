/**
 * Executors for attribute commands.
 * Implements add, remove, and modify operations for schema attributes.
 */

import {
  schema,
  AddAttributeCommand,
  RemoveAttributeCommand,
  ModifyAttributeCommand,
  attribute,
  topLevelAttribute,
  topLevelComplexType,
  localComplexType,
  annotationType,
  documentationType,
} from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";
import { locateNodeById } from "../schemaNavigator";
import { parseSchemaId } from "../../shared/idStrategy";

/**
 * Executes an addAttribute command.
 * Adds a new attribute to a schema, topLevelComplexType, or localComplexType.
 *
 * @param command - The addAttribute command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if parent node not found or duplicate attribute name exists
 */
export function executeAddAttribute(
  command: AddAttributeCommand,
  schemaObj: schema
): void {
  const { parentId, attributeName, attributeType, required, defaultValue, fixedValue, documentation } =
    command.payload;

  const location = locateNodeById(schemaObj, parentId);
  if (!location.found || !location.parent || !location.parentType) {
    throw new Error(`Parent node not found: ${parentId}`);
  }

  addAttributeToParent(
    location.parent,
    location.parentType,
    attributeName,
    attributeType,
    required,
    defaultValue,
    fixedValue,
    documentation
  );
}

/**
 * Executes a removeAttribute command.
 * Removes an attribute by its ID from its parent container.
 *
 * @param command - The removeAttribute command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if parent or attribute not found
 */
export function executeRemoveAttribute(
  command: RemoveAttributeCommand,
  schemaObj: schema
): void {
  const { attributeId } = command.payload;

  const parsed = parseSchemaId(attributeId);
  const parentId = parsed.parentId ?? "schema";
  const location = locateNodeById(schemaObj, parentId);

  if (!location.found || !location.parent || !location.parentType) {
    throw new Error(`Parent node not found for attribute: ${attributeId}`);
  }

  removeAttributeFromParent(location.parent, location.parentType, parsed.name, parsed.position);
}

/**
 * Executes a modifyAttribute command.
 * Updates properties of an existing attribute identified by its ID.
 *
 * @param command - The modifyAttribute command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if parent or attribute not found
 */
export function executeModifyAttribute(
  command: ModifyAttributeCommand,
  schemaObj: schema
): void {
  const { attributeId, attributeName, attributeType, required, defaultValue, fixedValue, documentation } =
    command.payload;

  const parsed = parseSchemaId(attributeId);
  const parentId = parsed.parentId ?? "schema";
  const location = locateNodeById(schemaObj, parentId);

  if (!location.found || !location.parent || !location.parentType) {
    throw new Error(`Parent node not found for attribute: ${attributeId}`);
  }

  modifyAttributeInParent(
    location.parent,
    location.parentType,
    parsed.name,
    parsed.position,
    attributeName,
    attributeType,
    required,
    defaultValue,
    fixedValue,
    documentation
  );
}

// ===== Helper Functions =====

/**
 * Adds an attribute to a parent container.
 *
 * @param parent - Parent container object
 * @param parentType - Type of the parent container
 * @param name - Attribute name
 * @param type - Attribute type
 * @param required - Whether the attribute is required (optional, only for complex types)
 * @param defaultValue - Default value (optional)
 * @param fixedValue - Fixed value (optional)
 * @param documentation - Documentation text (optional)
 * @throws Error if parent type is unsupported or duplicate attribute name exists
 */
function addAttributeToParent(
  parent: unknown,
  parentType: string,
  name: string,
  type: string,
  required?: boolean,
  defaultValue?: string,
  fixedValue?: string,
  documentation?: string
): void {
  if (parentType === "schema") {
    const schemaObj = parent as schema;
    const attributes = toArray(schemaObj.attribute);
    if (attributes.some((a) => a.name === name)) {
      throw new Error(`Cannot add attribute: duplicate attribute name '${name}' in schema`);
    }
    const newAttr = new topLevelAttribute();
    newAttr.name = name;
    newAttr.type_ = type;
    if (defaultValue !== undefined) {
      newAttr.default_ = defaultValue;
    }
    if (fixedValue !== undefined) {
      newAttr.fixed = fixedValue;
    }
    if (documentation) {
      newAttr.annotation = createAnnotation(documentation);
    }
    attributes.push(newAttr);
    schemaObj.attribute = attributes;
  } else if (parentType === "topLevelComplexType" || parentType === "localComplexType") {
    const complexType = parent as topLevelComplexType | localComplexType;
    const attributes = toArray(complexType.attribute);
    if (attributes.some((a) => a.name === name)) {
      throw new Error(
        `Cannot add attribute: duplicate attribute name '${name}' in ${parentType}`
      );
    }
    const newAttr = new attribute();
    newAttr.name = name;
    newAttr.type_ = type;
    newAttr.use = required ? "required" : "optional";
    if (defaultValue !== undefined) {
      newAttr.default_ = defaultValue;
    }
    if (fixedValue !== undefined) {
      newAttr.fixed = fixedValue;
    }
    if (documentation) {
      newAttr.annotation = createAnnotation(documentation);
    }
    attributes.push(newAttr);
    complexType.attribute = attributes;
  } else {
    throw new Error(`Cannot add attribute to parent of type: ${parentType}`);
  }
}

/**
 * Removes an attribute from its parent container.
 *
 * @param parent - Parent container object
 * @param parentType - Type of the parent container
 * @param attributeName - Name of the attribute to remove (optional)
 * @param position - Position of the attribute to remove (optional)
 * @throws Error if parent type is unsupported or attribute not found
 */
function removeAttributeFromParent(
  parent: unknown,
  parentType: string,
  attributeName?: string,
  position?: number
): void {
  if (parentType === "schema") {
    const schemaObj = parent as schema;
    const attributes = toArray(schemaObj.attribute);
    const filtered = filterAttributes(attributes, attributeName, position);
    schemaObj.attribute = filtered.length > 0 ? filtered : undefined;
  } else if (parentType === "topLevelComplexType" || parentType === "localComplexType") {
    const complexType = parent as topLevelComplexType | localComplexType;
    const attributes = toArray(complexType.attribute);
    const filtered = filterAttributes(attributes, attributeName, position);
    complexType.attribute = filtered.length > 0 ? filtered : undefined;
  } else {
    throw new Error(`Cannot remove attribute from parent of type: ${parentType}`);
  }
}

/**
 * Modifies an attribute in its parent container.
 *
 * @param parent - Parent container object
 * @param parentType - Type of the parent container
 * @param targetName - Name of the attribute to modify (optional)
 * @param targetPosition - Position of the attribute to modify (optional)
 * @param newName - New name (optional)
 * @param newType - New type (optional)
 * @param newRequired - New required status (optional)
 * @param newDefaultValue - New default value (optional)
 * @param newFixedValue - New fixed value (optional)
 * @param newDocumentation - New documentation (optional)
 * @throws Error if parent type is unsupported or attribute not found
 */
function modifyAttributeInParent(
  parent: unknown,
  parentType: string,
  targetName?: string,
  targetPosition?: number,
  newName?: string,
  newType?: string,
  newRequired?: boolean,
  newDefaultValue?: string,
  newFixedValue?: string,
  newDocumentation?: string
): void {
  const attributes = getAttributesFromParent(parent, parentType);
  const attr = findAttribute(attributes, targetName, targetPosition);
  if (!attr) {
    throw new Error(
      `Attribute not found: ${targetName ?? `at position ${targetPosition}`}`
    );
  }
  updateAttributeProperties(attr, newName, newType, newRequired, newDefaultValue, newFixedValue, newDocumentation);
}

/**
 * Returns the attribute array from a parent container.
 *
 * @param parent - Parent container object
 * @param parentType - Type of the parent container
 * @returns Array of attributes from the parent
 * @throws Error if parent type is unsupported
 */
function getAttributesFromParent(
  parent: unknown,
  parentType: string
): Array<topLevelAttribute | attribute> {
  if (parentType === "schema") {
    return toArray((parent as schema).attribute);
  } else if (parentType === "topLevelComplexType" || parentType === "localComplexType") {
    return toArray((parent as topLevelComplexType | localComplexType).attribute);
  }
  throw new Error(`Cannot modify attribute in parent of type: ${parentType}`);
}

/**
 * Filters an attribute array, removing the element matching by name or position.
 *
 * @param attributes - Array of attributes
 * @param attributeName - Name to filter (optional)
 * @param position - Position to filter (optional)
 * @returns Filtered array
 * @throws Error if attribute not found
 */
function filterAttributes<T extends { name?: string }>(
  attributes: T[],
  attributeName?: string,
  position?: number
): T[] {
  if (position !== undefined) {
    if (position < 0 || position >= attributes.length) {
      throw new Error(`Attribute not found at position: ${position}`);
    }
    return attributes.filter((_, idx) => idx !== position);
  } else if (attributeName !== undefined) {
    const filtered = attributes.filter((a) => a.name !== attributeName);
    if (filtered.length === attributes.length) {
      throw new Error(`Attribute not found with name: ${attributeName}`);
    }
    return filtered;
  }
  throw new Error("Either attributeName or position must be provided");
}

/**
 * Finds an attribute in an array by name or position.
 *
 * @param attributes - Array of attributes
 * @param attributeName - Name to find (optional)
 * @param position - Position to find (optional)
 * @returns Found attribute or undefined
 */
function findAttribute<T extends { name?: string }>(
  attributes: T[],
  attributeName?: string,
  position?: number
): T | undefined {
  if (position !== undefined) {
    return attributes[position];
  } else if (attributeName !== undefined) {
    return attributes.find((a) => a.name === attributeName);
  }
  return undefined;
}

/**
 * Updates properties on an attribute (works for both top-level and local attributes).
 * The `use` property (required/optional) is only applied when the attribute supports it.
 *
 * @param attr - The attribute to update
 * @param newName - New name (optional)
 * @param newType - New type (optional)
 * @param newRequired - New required status (optional, only for local attributes)
 * @param newDefaultValue - New default value (optional)
 * @param newFixedValue - New fixed value (optional)
 * @param newDocumentation - New documentation (optional)
 */
function updateAttributeProperties(
  attr: topLevelAttribute | attribute,
  newName?: string,
  newType?: string,
  newRequired?: boolean,
  newDefaultValue?: string,
  newFixedValue?: string,
  newDocumentation?: string
): void {
  if (newName !== undefined) {
    attr.name = newName;
  }
  if (newType !== undefined) {
    attr.type_ = newType;
  }
  // 'use' only exists on local attributes (attribute class), not on topLevelAttribute
  if (newRequired !== undefined && "use" in attr) {
    (attr as attribute).use = newRequired ? "required" : "optional";
  }
  if (newDefaultValue !== undefined) {
    attr.default_ = newDefaultValue;
  }
  if (newFixedValue !== undefined) {
    attr.fixed = newFixedValue;
  }
  if (newDocumentation !== undefined) {
    if (!attr.annotation) {
      attr.annotation = new annotationType();
    }
    const doc = new documentationType();
    doc.value = newDocumentation;
    attr.annotation.documentation = [doc];
  }
}

/**
 * Creates an annotation with a single documentation entry.
 *
 * @param text - Documentation text
 * @returns New annotationType instance
 */
function createAnnotation(text: string): annotationType {
  const annotation = new annotationType();
  const doc = new documentationType();
  doc.value = text;
  annotation.documentation = [doc];
  return annotation;
}
