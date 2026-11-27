/**
 * Shared assertion helpers for validation tests.
 * Provides TypeScript-narrowing assertion functions for `ValidationResult`.
 * They assert with `expect`, so that their checks count as assertions of the test.
 */
import type { ValidationResult, ValidationFailure } from "../validation.js";

/** A rule of a validator, the result of a command that breaks it, and the error that the rule gives. */
export interface RuleCase {
  rule: string;
  result: ValidationResult;
  error: string;
}

/**
 * Asserts that a `ValidationResult` represents a failure and narrows its type to
 * `ValidationFailure`, enabling access to the required `.error` property.
 *
 * @param result - The validation result
 * @throws The assertion error of `expect`, which fails the test, when `valid` is true
 */
export function expectInvalid(result: ValidationResult): asserts result is ValidationFailure {
  expect(result.valid, "Expected validation to fail but it passed").toBe(false);
}
