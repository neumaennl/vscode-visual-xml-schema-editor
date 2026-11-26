/**
 * The result of a check: valid, or invalid with a message that says why. The checks in `shared/` return it,
 * so that the properties panel can show the message below a field and the validators of the extension
 * host can reject a command with it.
 */

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
 * The result of a check that, when it passes, also gives what it found, such as the node that an ID
 * identifies.
 */
export type ValidationResultWith<T> = ValidationFailure | (ValidationSuccess & T);
