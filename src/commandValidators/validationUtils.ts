/**
 * Shared validation utilities for command validators.
 */

import { isBuiltInTypeName } from "../../shared/builtInTypes.js";
import { splitQName } from "../../shared/qNames.js";
import type { NamespacePrefixes } from "../../shared/types.js";

/** A validation check that passed. */
export interface ValidationSuccess {
  valid: true;
}

/** A validation check that failed, with a required error message. */
export interface ValidationFailure {
  valid: false;
  error: string;
}

/** Discriminated union of all possible validation outcomes. */
export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Validates if a string is a valid XML name.
 * XML names must start with a letter or underscore, and contain only
 * letters, digits, hyphens, underscores, and periods.
 *
 * @param name - The name to validate
 * @returns true if valid XML name, false otherwise
 *
 * TODO: This is a simplified pattern for Phase 1 that validates basic ASCII
 * XML names. It does not support namespace-prefixed names (e.g., `xs:element`)
 * or Unicode characters beyond ASCII. XSD element/type names typically don't
 * use prefixes in schema definitions.
 */
export function isValidXmlName(name: string): boolean {
  if (!name || name.trim().length === 0) {
    return false;
  }
  // XML name pattern: starts with letter or underscore,
  // followed by letters, digits, hyphens, underscores, or periods
  const xmlNamePattern = /^[a-zA-Z_][\w.-]*$/;
  return xmlNamePattern.test(name);
}

/**
 * Validates `minOccurs` value.
 *
 * @param minOccurs - The `minOccurs` value to validate
 * @returns Validation result
 */
function validateMinOccurs(minOccurs: number | undefined): ValidationResult {
  if (minOccurs === undefined) {
    return { valid: true };
  }

  if (minOccurs < 0) {
    return {
      valid: false,
      error: "minOccurs must be a non-negative integer",
    };
  }

  if (!Number.isInteger(minOccurs)) {
    return { valid: false, error: "minOccurs must be an integer" };
  }

  return { valid: true };
}

/**
 * Validates `maxOccurs` value.
 *
 * @param maxOccurs - The `maxOccurs` value to validate
 * @returns Validation result
 */
function validateMaxOccurs(maxOccurs: number | string | undefined): ValidationResult {
  if (maxOccurs === undefined) {
    return { valid: true };
  }

  if (maxOccurs === "unbounded") {
    return { valid: true };
  }

  if (typeof maxOccurs === "number") {
    if (maxOccurs < 0) {
      return {
        valid: false,
        error: "maxOccurs must be a non-negative integer or 'unbounded'",
      };
    }
    if (!Number.isInteger(maxOccurs)) {
      return {
        valid: false,
        error: "maxOccurs must be an integer or 'unbounded'",
      };
    }
  }

  return { valid: true };
}

/**
 * Validates that `minOccurs <= maxOccurs` when both are provided.
 *
 * @param minOccurs - The `minOccurs` value
 * @param maxOccurs - The `maxOccurs` value
 * @returns Validation result
 */
function validateOccurrenceConstraint(
  minOccurs: number | undefined,
  maxOccurs: number | string | undefined
): ValidationResult {
  if (minOccurs !== undefined && typeof maxOccurs === "number" && minOccurs > maxOccurs) {
    return { valid: false, error: "minOccurs must be <= maxOccurs" };
  }

  return { valid: true };
}

/**
 * Validates all occurrence constraints (`minOccurs`, `maxOccurs`, and their relationship).
 *
 * @param minOccurs - The `minOccurs` value
 * @param maxOccurs - The `maxOccurs` value
 * @returns Validation result
 */
export function validateOccurrences(
  minOccurs: number | undefined,
  maxOccurs: number | string | undefined
): ValidationResult {
  // Validate minOccurs
  const minResult = validateMinOccurs(minOccurs);
  if (!minResult.valid) {
    return minResult;
  }

  // Validate maxOccurs
  const maxResult = validateMaxOccurs(maxOccurs);
  if (!maxResult.valid) {
    return maxResult;
  }

  // Validate constraint
  return validateOccurrenceConstraint(minOccurs, maxOccurs);
}

/**
 * Validates if a type name is a valid built-in or user-defined type.
 *
 * @param typeName - The type name to validate
 * @param schemaObj - The schema object to check for user-defined types
 * @returns Validation result
 */
export function validateElementType(
  typeName: string,
  schemaObj: {
    simpleType?: Array<{ name?: string }>;
    complexType?: Array<{ name?: string }>;
    import_?: Array<{ namespace?: string }>;
    include?: Array<{ schemaLocation?: string }>;
    _namespacePrefixes?: NamespacePrefixes;
  }
): ValidationResult {
  if (!typeName || typeName.trim().length === 0) {
    return { valid: false, error: "Element type is required" };
  }

  const trimmedType = typeName.trim();
  const { prefix, localName } = splitQName(trimmedType);

  // A built-in XSD type, with any prefix or none (see "Built-in types are recognized by their local name
  // only" in docs/known-issues.md)
  if (isBuiltInTypeName(localName)) {
    return { valid: true };
  }

  // Check if it's a user-defined simple type
  if ((schemaObj.simpleType ?? []).some((type) => type.name === localName)) {
    return { valid: true };
  }

  // Check if it's a user-defined complex type
  if ((schemaObj.complexType ?? []).some((type) => type.name === localName)) {
    return { valid: true };
  }

  // If the type has a prefix, validate it against imports
  // Note: Types from includes are in the same namespace and don't need prefixes
  if (prefix !== undefined) {
    // Check if we have namespace prefix mappings
    if (schemaObj._namespacePrefixes) {
      // Look up the namespace URI for this prefix
      // _namespacePrefixes structure: { prefix: namespaceUri }
      const namespaceUri = schemaObj._namespacePrefixes[prefix];

      if (namespaceUri) {
        // Check if there's an import for this namespace
        const hasMatchingImport = (schemaObj.import_ ?? []).some((imp) => imp.namespace === namespaceUri);
        if (hasMatchingImport) {
          // Type is from a valid import with matching namespace, allow it
          return { valid: true };
        }
      }
    }
  } else {
    // Unqualified type name: allow it when the schema has xs:include elements,
    // since included schemas share the same target namespace and their types
    // are referenced without a prefix.
    if ((schemaObj.include ?? []).length > 0 && isValidXmlName(localName)) {
      return { valid: true };
    }
  }

  return {
    valid: false,
    error: `Invalid element type '${trimmedType}': must be a built-in XSD type, a user-defined type in the schema, a type from a valid import with a matching namespace prefix, or a type from an included schema`,
  };
}
