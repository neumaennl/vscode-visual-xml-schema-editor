/**
 * Shared assertion helpers for validation tests.
 * Provides TypeScript-narrowing assertion functions for ValidationResult.
 * Uses plain throws (not Jest matchers). This file is excluded from the
 * production build via tsconfig.json ("**/*TestHelpers.ts" in exclude).
 */
import type { ValidationResult, ValidationFailure } from "./validationUtils";

/**
 * Asserts that a ValidationResult represents a failure and narrows its type to
 * ValidationFailure, enabling access to the required `.error` property.
 * Throws a plain Error (surfaced as a test failure) when `valid` is true.
 */
export function expectInvalid(
  result: ValidationResult
): asserts result is ValidationFailure {
  if (result.valid !== false)
    throw new Error("Expected validation to fail but it passed");
}
