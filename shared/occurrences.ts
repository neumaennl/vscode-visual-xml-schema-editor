/**
 * The values of `minOccurs` and `maxOccurs` and their checks: each value on its own, which the properties
 * panel checks in its fields, and both together, which the validators of the extension host check.
 */

import type { allNNI } from "./generated/types.js";
import type { ValidationResult } from "./validation.js";

/** A value of `maxOccurs`: a non-negative integer or `unbounded`. */
export type MaxOccurs = allNNI;

/** The value of `maxOccurs` for a particle that can occur any number of times. */
export const UNBOUNDED = "unbounded" satisfies MaxOccurs;

/**
 * Reads a value of `maxOccurs`, from the text of a field or from a schema object, some of whose classes store
 * it as a string.
 *
 * @param value - The value, such as `unbounded`, `3` or `" 3 "`
 * @returns The value, or `undefined` if it is neither `unbounded` nor a number
 */
export function parseMaxOccurs(value: number | string): MaxOccurs | undefined {
  if (typeof value === "number") {
    return value;
  }
  const text = value.trim();
  if (text === UNBOUNDED) {
    return UNBOUNDED;
  }
  const number = Number(text);
  return text === "" || Number.isNaN(number) ? undefined : number;
}

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
export function validateMaxOccurs(maxOccurs: MaxOccurs | undefined): ValidationResult {
  if (maxOccurs === undefined) {
    return { valid: true };
  }

  if (maxOccurs === UNBOUNDED) {
    return { valid: true };
  }

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
  maxOccurs: MaxOccurs | undefined
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
export function validateOccurrences(minOccurs: number | undefined, maxOccurs: MaxOccurs | undefined): ValidationResult {
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
