/**
 * Shared validation utilities for command validators.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates if a string is a valid XML name.
 * XML names must start with a letter or underscore, and contain only
 * letters, digits, hyphens, underscores, and periods.
 *
 * @param name - The name to validate
 * @returns true if valid XML name, false otherwise
 *
 * TODO: This is a simplified pattern for Phase 1 that validates basic ASCII
 * XML names. It does not support namespace-prefixed names (e.g., xs:element)
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
 * Validates minOccurs value.
 *
 * @param minOccurs - The minOccurs value to validate
 * @returns Validation result
 */
export function validateMinOccurs(
  minOccurs: number | undefined
): ValidationResult {
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
 * Validates maxOccurs value.
 *
 * @param maxOccurs - The maxOccurs value to validate
 * @returns Validation result
 */
export function validateMaxOccurs(
  maxOccurs: number | string | undefined
): ValidationResult {
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
 * Validates that minOccurs <= maxOccurs when both are provided.
 *
 * @param minOccurs - The minOccurs value
 * @param maxOccurs - The maxOccurs value
 * @returns Validation result
 */
export function validateOccurrenceConstraint(
  minOccurs: number | undefined,
  maxOccurs: number | string | undefined
): ValidationResult {
  if (
    minOccurs !== undefined &&
    typeof maxOccurs === "number" &&
    minOccurs > maxOccurs
  ) {
    return { valid: false, error: "minOccurs must be <= maxOccurs" };
  }

  return { valid: true };
}

/**
 * Validates all occurrence constraints (minOccurs, maxOccurs, and their relationship).
 *
 * @param minOccurs - The minOccurs value
 * @param maxOccurs - The maxOccurs value
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
