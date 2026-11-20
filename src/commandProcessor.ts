/**
 * `CommandProcessor`: runs a schema command on the text of a document: parses the text, validates the
 * command, executes it and serializes the result.
 */

import type { SchemaCommand } from "../shared/types.js";
import { CommandValidator } from "./commandValidator.js";
import { CommandExecutor } from "./commandExecutor.js";
import { parseSchema, serializeSchema } from "./schemaXml.js";
import { findConstraintViolations } from "./schemaConstraints/schemaConstraints.js";
import { findAddedViolations } from "./schemaConstraints/constraintViolation.js";

/** Successful command execution. */
export interface CommandExecutionSuccess {
  success: true;
  /** Serialized XML content after applying the command. */
  xmlContent: string;
}

/**
 * Command was rejected by the validator (bad input or incompatible schema state), or its result would
 * violate a constraint of XML Schema that the schema did not violate before.
 * The caller reports it as a `commandResult` message, so that the webview can show
 * actionable feedback to the user.
 */
export interface CommandExecutionValidationFailure {
  success: false;
  errorKind: "validation";
  /** Human-readable validation error message. */
  error: string;
  xmlContent: null;
}

/**
 * An unexpected exception was thrown during command execution (a bug or an
 * unrecoverable system error). The caller reports it as an `error` message with the
 * stack trace, so that developers can diagnose it.
 */
export interface CommandExecutionRuntimeFailure {
  success: false;
  errorKind: "runtime";
  /** Human-readable error message derived from the thrown exception. */
  error: string;
  /** Stack trace of the thrown exception. */
  stack?: string;
  xmlContent: null;
}

/** Union of the two failure result types. */
export type CommandExecutionFailure = CommandExecutionValidationFailure | CommandExecutionRuntimeFailure;

/** Discriminated union of all possible command execution outcomes. */
export type CommandExecutionResult = CommandExecutionSuccess | CommandExecutionFailure;

/**
 * `CommandProcessor` runs schema editing commands. It keeps no state: every command parses the document
 * text again, so a command that fails leaves nothing behind, and the document is only changed by the XML
 * that a successful command returns.
 */
export class CommandProcessor {
  private readonly validator: CommandValidator;
  private readonly executor: CommandExecutor;

  /**
   * Creates a new `CommandProcessor`.
   *
   * @param validator - Command validator instance (optional, creates default if not provided)
   * @param executor - Command executor instance (optional, creates default if not provided)
   */
  constructor(validator?: CommandValidator, executor?: CommandExecutor) {
    this.validator = validator ?? new CommandValidator();
    this.executor = executor ?? new CommandExecutor();
  }

  /**
   * Executes a command on the schema of a document: parses the text, validates the command, executes it
   * on the parsed schema, rejects it if the result violates a constraint of XML Schema that spans the schema
   * and that the schema did not violate before, serializes the schema and checks that the result can be
   * parsed again. Returns a result instead of throwing.
   *
   * @param command - The command to execute
   * @param currentXml - The current XML content of the schema
   * @returns The new XML content, or why the command was rejected or failed
   */
  public execute(command: SchemaCommand, currentXml: string): CommandExecutionResult {
    try {
      const schemaObj = parseSchema(currentXml);

      const validationResult = this.validator.validate(command, schemaObj);
      if (!validationResult.valid) {
        return { success: false, error: validationResult.error, errorKind: "validation", xmlContent: null };
      }

      const violationsBefore = findConstraintViolations(schemaObj);
      this.executor.execute(command, schemaObj);
      const [addedViolation] = findAddedViolations(violationsBefore, findConstraintViolations(schemaObj));
      if (addedViolation) {
        return { success: false, error: addedViolation.message, errorKind: "validation", xmlContent: null };
      }
      const updatedXml = serializeSchema(schemaObj);

      // The document must stay readable: reject a result that cannot be parsed again
      parseSchema(updatedXml);

      return { success: true, xmlContent: updatedXml };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        success: false,
        error: `Command execution failed: ${err.message}`,
        errorKind: "runtime",
        stack: err.stack,
        xmlContent: null,
      };
    }
  }
}
