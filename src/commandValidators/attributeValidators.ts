/**
 * Validators for attribute commands.
 */

import { isValidXmlName } from "../../shared/qNames.js";
import type {
  schema,
  AddAttributeCommand,
  RemoveAttributeCommand,
  ModifyAttributeCommand,
  AttributeFields,
} from "../../shared/types.js";
import type { ValidationResult } from "../../shared/validation.js";
import { getAttributeContainer } from "../../shared/schemaUtils.js";
import type { ChildKind } from "./commonValidators.js";
import { locateChild, validateNewChild, validateReference } from "./commonValidators.js";

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
    return validateReference(ref, "attribute", schemaObj, `Referenced attribute '${ref}' does not exist in schema`);
  }
  if ((nameRequired || attributeName !== undefined) && !isValidXmlName(attributeName ?? "")) {
    return { valid: false, error: "Attribute name must be a valid XML name" };
  }
  if (defaultValue !== undefined && fixedValue !== undefined) {
    return { valid: false, error: "An attribute cannot have both a default value and a fixed value" };
  }
  return { valid: true };
}

/**
 * Validates an `addAttribute` command: the parent ID must not be empty, the fields must fit a reference
 * or a named attribute, and the parent must be able to hold the attribute without a duplicate.
 *
 * @param command - The command
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateAddAttribute(command: AddAttributeCommand, schemaObj: schema): ValidationResult {
  const { parentId, attributeName, ref } = command.payload;

  if (!parentId.trim()) {
    return { valid: false, error: "Parent ID cannot be empty" };
  }

  const kindResult = validateAttributeKind(
    command.payload,
    schemaObj,
    true,
    "A reference attribute cannot have a name or type"
  );
  if (!kindResult.valid) {
    return kindResult;
  }

  return validateNewChild(schemaObj, parentId, ATTRIBUTES, attributeName, ref);
}

/**
 * Validates a `removeAttribute` command: the attribute must exist in a parent that holds attributes.
 *
 * @param command - The command
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateRemoveAttribute(command: RemoveAttributeCommand, schemaObj: schema): ValidationResult {
  const located = locateChild(schemaObj, command.payload.attributeId, ATTRIBUTES, "remove attribute from");
  return located.valid ? { valid: true } : located;
}

/**
 * Validates a `modifyAttribute` command: the attribute must exist, and the new fields must fit a
 * reference or a named attribute.
 *
 * @param command - The command
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateModifyAttribute(command: ModifyAttributeCommand, schemaObj: schema): ValidationResult {
  const located = locateChild(schemaObj, command.payload.attributeId, ATTRIBUTES, "modify attribute in");
  if (!located.valid) {
    return located;
  }

  return validateAttributeKind(command.payload, schemaObj, false, "Cannot set both ref and name/type on an attribute");
}
