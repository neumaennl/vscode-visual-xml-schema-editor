/**
 * Shared assertion helpers for validation tests.
 * Provides TypeScript-narrowing assertion functions for `ValidationResult`.
 * Uses plain throws (not test framework matchers).
 */
import type { ValidationResult, ValidationFailure } from "../commandValidators/validationUtils.js";

/**
 * Asserts that a `ValidationResult` represents a failure and narrows its type to
 * `ValidationFailure`, enabling access to the required `.error` property.
 * Throws a plain Error (surfaced as a test failure) when `valid` is true.
 *
 * @param result - The validation result
 * @throws An {@link Error} if the result is valid
 */
export function expectInvalid(
  result: ValidationResult
): asserts result is ValidationFailure {
  if (result.valid)
    throw new Error("Expected validation to fail but it passed");
}
