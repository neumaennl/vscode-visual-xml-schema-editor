/**
 * Validators for element commands.
 */

import type {
  schema,
  AddElementCommand,
  RemoveElementCommand,
  ModifyElementCommand,
} from "../../shared/types.js";
import type {
  ValidationResult,
} from "./validationUtils.js";
import {
  isValidXmlName,
  validateOccurrences,
  validateElementType,
} from "./validationUtils.js";
import type { ChildKind, NamedChild } from "./commonValidators.js";
import { locateChild, validateNewChild, validateReference } from "./commonValidators.js";

/** Parent types that can contain child elements. */
const VALID_ELEMENT_PARENTS = ["schema", "sequence", "choice", "all"] as const;

/**
 * Local and top-level elements, for {@link locateChild} and {@link validateNewChild}. The schema and
 * all its valid parents (sequence, choice and all) hold them in `element`.
 */
const ELEMENTS: ChildKind = {
  label: "Element",
  validParents: VALID_ELEMENT_PARENTS,
  getChildren: (parent) => (parent as { element?: NamedChild[] }).element ?? [],
};

/**
 * Validates the reference of an element to a top-level element.
 *
 * @param ref - The value of `ref`
 * @param schemaObj - The schema
 * @returns The validation result
 */
function validateElementReference(ref: string, schemaObj: schema): ValidationResult {
  return validateReference(ref, schemaObj.element, "Element", `Referenced element '${ref}' does not exist in schema`);
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
    const referenceResult = validateElementReference(ref, schemaObj);
    if (!referenceResult.valid) {
      return referenceResult;
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

  const parentResult = validateNewChild(schemaObj, parentId, ELEMENTS, elementName, ref);
  if (!parentResult.valid) {
    return parentResult;
  }

  // Validate occurrences
  return validateOccurrences(minOccurs, maxOccurs);
}

export function validateRemoveElement(
  command: RemoveElementCommand,
  schemaObj: schema
): ValidationResult {
  const located = locateChild(schemaObj, command.payload.elementId, ELEMENTS, "remove element from");
  return located.valid ? { valid: true } : located;
}

export function validateModifyElement(
  command: ModifyElementCommand,
  schemaObj: schema
): ValidationResult {
  const { elementId, elementName, elementType, ref, minOccurs, maxOccurs, default_, fixed } = command.payload;

  const located = locateChild(schemaObj, elementId, ELEMENTS, "modify element in");
  if (!located.valid) {
    return located;
  }
  const el = located.child;

  if (ref !== undefined) {
    // Reference: name and type are forbidden
    if (elementName !== undefined || elementType !== undefined) {
      return { valid: false, error: "Cannot set both ref and name/type on an element" };
    }
    const referenceResult = validateElementReference(ref, schemaObj);
    if (!referenceResult.valid) {
      return referenceResult;
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
