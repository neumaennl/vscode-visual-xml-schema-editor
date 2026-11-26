/**
 * Validators for element commands.
 */

import { isValidXmlName } from "../../shared/qNames.js";
import type { schema, AddElementCommand, RemoveElementCommand, ModifyElementCommand } from "../../shared/types.js";
import type { ValidationResult } from "../../shared/validation.js";
import { validateTypeInSchema } from "./validationUtils.js";
import { validateOccurrences, validateOccurrencesInAll } from "../../shared/occurrences.js";
import { locateNodeById } from "../schemaNavigator.js";
import type { ChildKind } from "./commonValidators.js";
import { locateChild, validateNewChild, validateReference, validateUniqueTopLevelName } from "./commonValidators.js";
import type { NamedChild, ElementHolder } from "../../shared/schemaObjects.js";

/** Parent types that can contain child elements. */
const VALID_ELEMENT_PARENTS = ["schema", "sequence", "choice", "all"] as const;

/**
 * Local and top-level elements, for {@link locateChild} and {@link validateNewChild}. The schema and
 * all its valid parents (sequence, choice and all) hold them in `element`.
 */
const ELEMENTS: ChildKind = {
  label: "Element",
  validParents: VALID_ELEMENT_PARENTS,
  getChildren: (parent) => (parent as ElementHolder<NamedChild>).element ?? [],
};

/**
 * Validates the reference of an element to a top-level element.
 *
 * @param ref - The value of `ref`
 * @param schemaObj - The schema
 * @returns The validation result
 */
function validateElementReference(ref: string, schemaObj: schema): ValidationResult {
  return validateReference(ref, "element", schemaObj, `Referenced element '${ref}' does not exist in schema`);
}

/** The fields of an element command that depend on whether the element is a reference. */
interface ElementKindFields {
  elementName?: string;
  elementType?: string;
  ref?: string;
}

/**
 * Validates the fields that depend on whether an element is a reference: a reference has no name or
 * type and refers to a top-level element; another element has a valid name and an existing type, if it
 * has one.
 *
 * @param fields - The fields of the command
 * @param schemaObj - The schema
 * @param nameRequired - Whether an element that is not a reference needs a name
 * @param nameOrTypeOnReferenceError - The error if a reference has a name or type
 * @returns The validation result
 */
function validateElementKind(
  fields: ElementKindFields,
  schemaObj: schema,
  nameRequired: boolean,
  nameOrTypeOnReferenceError: string
): ValidationResult {
  const { elementName, elementType, ref } = fields;
  if (ref !== undefined) {
    if (elementName !== undefined || elementType !== undefined) {
      return { valid: false, error: nameOrTypeOnReferenceError };
    }
    return validateElementReference(ref, schemaObj);
  }
  if ((nameRequired || elementName !== undefined) && !isValidXmlName(elementName ?? "")) {
    return { valid: false, error: "Element name must be a valid XML name" };
  }
  return elementType === undefined ? { valid: true } : validateTypeInSchema(elementType, schemaObj);
}

/**
 * Validates an `addElement` command: a reference has no name or type and refers to a top-level element;
 * another element has a valid name and an existing type, if it has one. The parent must be able to hold
 * the element, a top-level element needs a name that no other one has, and the occurrences must be
 * consistent.
 *
 * @param command - The command
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateAddElement(command: AddElementCommand, schemaObj: schema): ValidationResult {
  const { parentId, elementName, ref, minOccurs, maxOccurs } = command.payload;

  // Validate parentId is not empty
  if (!parentId.trim()) {
    return { valid: false, error: "Parent ID cannot be empty" };
  }

  // The type is optional: it is omitted when the element will carry an inline anonymous simpleType or
  // complexType, added by a later command
  const kindResult = validateElementKind(
    command.payload,
    schemaObj,
    true,
    "A reference element cannot have a name or type"
  );
  if (!kindResult.valid) {
    return kindResult;
  }

  const parentResult = validateNewChild(schemaObj, parentId, ELEMENTS, elementName, ref);
  if (!parentResult.valid) {
    return parentResult;
  }

  const parent = locateNodeById(schemaObj, parentId);
  if (parent.found && parent.parentType === "all") {
    return validateOccurrencesInAll(minOccurs, maxOccurs, "element");
  }
  return validateOccurrences(minOccurs, maxOccurs);
}

/**
 * Validates a `removeElement` command: the element must exist in a parent that holds elements.
 *
 * @param command - The command
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateRemoveElement(command: RemoveElementCommand, schemaObj: schema): ValidationResult {
  const located = locateChild(schemaObj, command.payload.elementId, ELEMENTS, "remove element from");
  return located.valid ? { valid: true } : located;
}

/**
 * Validates a `modifyElement` command: the element must exist; a new ref excludes a name or type and
 * must refer to a top-level element, a new name must be valid and a new type must exist. No other top-level
 * element may have the new name of a top-level element. An element has at most one of default and fixed, a
 * reference neither, and the occurrences must be consistent.
 *
 * @param command - The command
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateModifyElement(command: ModifyElementCommand, schemaObj: schema): ValidationResult {
  const { elementId, elementName, ref, minOccurs, maxOccurs, default_, fixed } = command.payload;

  const located = locateChild(schemaObj, elementId, ELEMENTS, "modify element in");
  if (!located.valid) {
    return located;
  }
  const el = located.child;

  const kindResult = validateElementKind(
    command.payload,
    schemaObj,
    false,
    "Cannot set both ref and name/type on an element"
  );
  if (!kindResult.valid) {
    return kindResult;
  }

  const uniqueResult = validateUniqueTopLevelName(
    schemaObj,
    ELEMENTS,
    located.parentType,
    elementName,
    "modify",
    located.child
  );
  if (!uniqueResult.valid) {
    return uniqueResult;
  }

  // XML Schema allows at most one of default and fixed, and neither on a reference; an empty string removes the value
  if (default_ && fixed) {
    return { valid: false, error: "An element cannot have both a default value and a fixed value" };
  }
  const isReference = ref !== undefined || (el.ref !== undefined && elementName === undefined);
  if (isReference && (default_ || fixed)) {
    return { valid: false, error: "A reference element cannot have a default or fixed value" };
  }

  if (located.parentType === "all") {
    return validateOccurrencesInAll(minOccurs, maxOccurs, "element");
  }
  return validateOccurrences(minOccurs, maxOccurs);
}
