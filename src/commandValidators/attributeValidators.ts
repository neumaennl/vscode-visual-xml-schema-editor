/**
 * Validators for attribute commands.
 */

import {
  schema,
  AddAttributeCommand,
  RemoveAttributeCommand,
  ModifyAttributeCommand,
  AttributeFields,
} from "../../shared/types.js";
import { ValidationResult, isValidXmlName } from "./validationUtils.js";
import { getAttributeContainer } from "../../shared/schemaUtils.js";
import { ChildKind, locateChild, validateNewChild, validateReference } from "./commonValidators.js";

/** Parent types that can contain attributes. */
const VALID_ATTR_PARENTS = ["schema", "topLevelComplexType", "localComplexType"] as const;

/**
 * Local and top-level attributes, for {@link locateChild} and {@link validateNewChild}. In a complex
 * type with complex or simple content, the attributes are those of its extension or restriction.
 */
const ATTRIBUTES: ChildKind = {
  label: "Attribute",
  validParents: VALID_ATTR_PARENTS,
  getChildren: (parent) => getAttributeContainer(parent).attribute ?? [],
};

/**
 * Validates the fields that depend on whether an attribute is a reference: a reference has no name,
 * type, default or fixed value and refers to a top-level attribute; another attribute has a valid name
 * and not both a default and a fixed value.
 *
 * @param fields - The fields of the command
 * @param schemaObj - The schema
 * @param nameRequired - Whether an attribute that is not a reference needs a name
 * @param nameOrTypeOnReferenceError - The error if a reference has a name or type
 * @returns The validation result
 */
function validateAttributeKind(
  fields: AttributeFields,
  schemaObj: schema,
  nameRequired: boolean,
  nameOrTypeOnReferenceError: string
): ValidationResult {
  const { attributeName, attributeType, ref, defaultValue, fixedValue } = fields;
  if (ref !== undefined) {
    if (attributeName !== undefined || attributeType !== undefined) {
      return { valid: false, error: nameOrTypeOnReferenceError };
    }
    if (defaultValue !== undefined || fixedValue !== undefined) {
      return { valid: false, error: "A reference attribute cannot have a default or fixed value" };
    }
    return validateReference(ref, schemaObj.attribute, "Attribute", `Referenced attribute '${ref}' does not exist in schema`);
  }
  if ((nameRequired || attributeName !== undefined) && !isValidXmlName(attributeName ?? "")) {
    return { valid: false, error: "Attribute name must be a valid XML name" };
  }
  if (defaultValue !== undefined && fixedValue !== undefined) {
    return { valid: false, error: "An attribute cannot have both a default value and a fixed value" };
  }
  return { valid: true };
}

export function validateAddAttribute(
  command: AddAttributeCommand,
  schemaObj: schema
): ValidationResult {
  const { parentId, attributeName, ref } = command.payload;

  if (!parentId.trim()) {
    return { valid: false, error: "Parent ID cannot be empty" };
  }

  const kindResult = validateAttributeKind(command.payload, schemaObj, true, "A reference attribute cannot have a name or type");
  if (!kindResult.valid) {
    return kindResult;
  }

  return validateNewChild(schemaObj, parentId, ATTRIBUTES, attributeName, ref);
}

export function validateRemoveAttribute(
  command: RemoveAttributeCommand,
  schemaObj: schema
): ValidationResult {
  const located = locateChild(schemaObj, command.payload.attributeId, ATTRIBUTES, "remove attribute from");
  return located.valid ? { valid: true } : located;
}

export function validateModifyAttribute(
  command: ModifyAttributeCommand,
  schemaObj: schema
): ValidationResult {
  const located = locateChild(schemaObj, command.payload.attributeId, ATTRIBUTES, "modify attribute in");
  if (!located.valid) {
    return located;
  }

  return validateAttributeKind(command.payload, schemaObj, false, "Cannot set both ref and name/type on an attribute");
}
