/**
 * Executors for attribute commands.
 * Implements add, remove, and modify operations for schema attributes.
 */

import type {
  schema,
  AddAttributeCommand,
  RemoveAttributeCommand,
  ModifyAttributeCommand,
  AttributeFields,
} from "../../shared/types.js";
import { attribute, topLevelAttribute } from "../../shared/types.js";
import { assumeValidated, assumptionFailed, locateValidated } from "./assumeValidated.js";
import { parseSchemaId, SCHEMA_ROOT_ID } from "../../shared/idStrategy.js";
import { createAnnotation, setDocumentation } from "./annotationUtils.js";
import type { AttributeContainer } from "../../shared/schemaUtils.js";
import { getAttributeContainer } from "../../shared/schemaUtils.js";
import { appendTo, removeFrom } from "./nodeProperties.js";
import { identifyChild } from "../commandUtils.js";

/**
 * Executes an `addAttribute` command.
 * Adds a new attribute to a schema, `topLevelComplexType`, or `localComplexType`. In a complex type with
 * complex or simple content, the attribute is added to its extension or restriction.
 *
 * @param command - The `addAttribute` command to execute
 * @param schemaObj - The schema object to modify
 * @throws An {@link Error} if parent node not found or duplicate attribute name exists
 */
export function executeAddAttribute(command: AddAttributeCommand, schemaObj: schema): void {
  const location = locateValidated(schemaObj, command.payload.parentId);
  const container = attributesOf(location.parent, location.parentType);
  appendTo(container, "attribute", createNewAttribute(command.payload, location.parentType === "schema"));
}

/**
 * Executes a `removeAttribute` command.
 * Removes an attribute by its ID from its parent container.
 *
 * @param command - The `removeAttribute` command to execute
 * @param schemaObj - The schema object to modify
 * @throws An {@link Error} if parent or attribute not found
 */
export function executeRemoveAttribute(command: RemoveAttributeCommand, schemaObj: schema): void {
  const parsed = parseSchemaId(command.payload.attributeId);
  const location = locateValidated(schemaObj, parsed.parentId ?? SCHEMA_ROOT_ID);
  const child = identifyChild("Attribute", parsed.name, parsed.position);
  removeFrom(attributesOf(location.parent, location.parentType), "attribute", child.matches, child.what);
}

/**
 * Executes a `modifyAttribute` command.
 * Updates properties of an existing attribute identified by its ID.
 *
 * @param command - The `modifyAttribute` command to execute
 * @param schemaObj - The schema object to modify
 * @throws An {@link Error} if parent or attribute not found
 */
export function executeModifyAttribute(command: ModifyAttributeCommand, schemaObj: schema): void {
  const parsed = parseSchemaId(command.payload.attributeId);
  const location = locateValidated(schemaObj, parsed.parentId ?? SCHEMA_ROOT_ID);
  const attributes: Array<topLevelAttribute | attribute> =
    attributesOf(location.parent, location.parentType).attribute ?? [];
  const child = identifyChild("Attribute", parsed.name, parsed.position);
  const attr = assumeValidated(attributes.find(child.matches), child.what);
  updateAttributeProperties(attr, command.payload, location.parentType === "schema");
}

// ===== Helper Functions =====

/**
 * Returns the node that holds the attributes of a parent: the schema, or a complex type or the
 * extension or restriction of its content (see {@link getAttributeContainer}).
 *
 * @param parent - Parent container object
 * @param parentType - Type of the parent container
 * @returns The node that holds the attributes
 * @throws An {@link Error} if the parent cannot hold attributes
 */
function attributesOf(parent: unknown, parentType: string): AttributeContainer {
  if (!["schema", "topLevelComplexType", "localComplexType"].includes(parentType)) {
    return assumptionFailed(`Parent of type '${parentType}' for an attribute`);
  }
  return getAttributeContainer(parent);
}

/**
 * Creates a new attribute: a named top-level attribute in the schema, or a local attribute, named or
 * a reference. Only local attributes have `use`, set from `required`.
 *
 * @param fields - The fields of the `addAttribute` command; the validator allows no default or fixed
 * value on a reference
 * @param isTopLevel - Whether the attribute is added to the schema
 * @returns New attribute instance
 */
function createNewAttribute(fields: AttributeFields, isTopLevel: boolean): topLevelAttribute | attribute {
  const { attributeName, attributeType, ref, required, defaultValue, fixedValue, documentation } = fields;
  let newAttr: topLevelAttribute | attribute;
  if (isTopLevel) {
    newAttr = new topLevelAttribute();
    newAttr.name = assumeValidated(attributeName, "Attribute name");
    newAttr.type_ = attributeType;
  } else {
    const local = new attribute();
    if (ref !== undefined) {
      local.ref = ref;
    } else {
      local.name = attributeName;
      local.type_ = attributeType;
    }
    if (required !== undefined) {
      local.use = required ? "required" : "optional";
    }
    newAttr = local;
  }
  if (defaultValue !== undefined) {
    newAttr.default_ = defaultValue;
  }
  if (fixedValue !== undefined) {
    newAttr.fixed = fixedValue;
  }
  if (documentation) {
    newAttr.annotation = createAnnotation(documentation);
  }
  return newAttr;
}

/**
 * Updates properties on an attribute (works for both top-level and local attributes).
 * When `ref` is set, clears `name` and `type_`. When `attributeName` is set, clears `ref`.
 * `use` is set from `required` only on local attributes; top-level attributes have no `use`.
 *
 * @param attr - The attribute to update
 * @param changes - The changes of the `modifyAttribute` command
 * @param topLevel - Whether the attribute is a top-level attribute of the schema
 */
function updateAttributeProperties(
  attr: topLevelAttribute | attribute,
  changes: AttributeFields,
  topLevel: boolean
): void {
  const { attributeName, attributeType, ref, required, defaultValue, fixedValue, documentation } = changes;
  if (ref !== undefined) {
    // Switching to a reference: clear name and type
    (attr as attribute).ref = ref;
    attr.name = undefined;
    attr.type_ = undefined;
  } else {
    // Update name (clearing ref when switching to named)
    if (attributeName !== undefined) {
      attr.name = attributeName;
      (attr as attribute).ref = undefined;
    }
    if (attributeType !== undefined) {
      attr.type_ = attributeType;
    }
  }
  if (required !== undefined && !topLevel) {
    (attr as attribute).use = required ? "required" : "optional";
  }
  if (defaultValue !== undefined) {
    attr.default_ = defaultValue;
    attr.fixed = undefined;
  }
  if (fixedValue !== undefined) {
    attr.fixed = fixedValue;
    attr.default_ = undefined;
  }
  if (documentation !== undefined) {
    setDocumentation(attr, documentation);
  }
}
