/**
 * The checks of `minOccurs` and `maxOccurs`: each value on its own, which the properties panel checks in
 * its fields, and both together, which the validators of the extension host check.
 */

import type { allNNI } from "./types.js";
import type { ValidationResult } from "./validation.js";

/** A value of `maxOccurs`: a non-negative integer or `unbounded`. */
export type MaxOccurs = allNNI;

/**
 * Validates `minOccurs` value.
 *
 * @param minOccurs - The `minOccurs` value to validate
 * @returns Validation result
 */
export function validateMinOccurs(minOccurs: number | undefined): ValidationResult {
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
export function validateMaxOccurs(maxOccurs: number | string | undefined): ValidationResult {
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
