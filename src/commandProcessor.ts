/**
 * CommandProcessor: Central dispatcher for all editing commands.
 * Implements validation, execution, and rollback logic for schema transformations.
 */

import { SchemaCommand, schema } from "../shared/types";
import { CommandValidator } from "./commandValidator";
import { CommandExecutor } from "./commandExecutor";
import { SchemaModelManager } from "./schemaModelManager";

/**
 * Classifies the origin of a command execution failure.
 *
 * - `'validation'` – the command was rejected by the validator (bad input, wrong
 *   state, etc.).  The caller should report this as a `commandResult` message so
 *   the webview can surface actionable feedback to the user.
 * - `'runtime'` – an unexpected exception was thrown during execution (a bug or
 *   an unrecoverable system error).  The caller should report this as an `error`
 *   message that includes an optional stack trace so developers can diagnose it.
 */
export type CommandErrorKind = "validation" | "runtime";

/** Successful command execution. */
export interface CommandExecutionSuccess {
  success: true;
  /** Updated schema object after applying the command. */
  schema: schema;
  /** Serialized XML content after applying the command. */
  xmlContent: string;
}

/** Command was rejected by the validator (bad input or incompatible schema state). */
export interface CommandExecutionValidationFailure {
  success: false;
  errorKind: "validation";
  /** Human-readable validation error message. */
  error: string;
  schema: null;
  xmlContent: null;
}

/** An unexpected exception was thrown during command execution. */
export interface CommandExecutionRuntimeFailure {
  success: false;
  errorKind: "runtime";
  /** Human-readable error message derived from the thrown exception. */
  error: string;
  /** Stack trace of the thrown exception. */
  stack?: string;
  schema: null;
  xmlContent: null;
}

/** Union of the two failure result types. */
export type CommandExecutionFailure =
  | CommandExecutionValidationFailure
  | CommandExecutionRuntimeFailure;

/** Discriminated union of all possible command execution outcomes. */
export type CommandExecutionResult =
  | CommandExecutionSuccess
  | CommandExecutionFailure;

/**
 * CommandProcessor manages the execution of schema editing commands.
 * Ensures validation, transactionality, and rollback support.
 * Prevents concurrent command executions to maintain state consistency.
 */
export class CommandProcessor {
  private readonly validator: CommandValidator;
  private readonly executor: CommandExecutor;
  private readonly modelManager: SchemaModelManager;
  private isExecuting: boolean = false;

  /**
   * Creates a new CommandProcessor.
   *
   * @param validator - Command validator instance (optional, creates default if not provided)
   * @param executor - Command executor instance (optional, creates default if not provided)
   * @param modelManager - Schema model manager instance (optional, creates default if not provided)
   */
  constructor(
    validator?: CommandValidator,
    executor?: CommandExecutor,
    modelManager?: SchemaModelManager
  ) {
    this.validator = validator ?? new CommandValidator();
    this.executor = executor ?? new CommandExecutor();
    this.modelManager = modelManager ?? new SchemaModelManager();
  }

  /**
   * Execute a command on the given schema.
   * Validates the command, executes it, and returns the result.
   * If execution fails, the original schema is preserved.
   * Prevents concurrent executions to maintain state consistency.
   *
   * @param command - The command to execute
   * @param currentXml - The current XML content of the schema
   * @returns Result containing success status, updated schema and XML, or error message
   */
  public execute(
    command: SchemaCommand,
    currentXml: string
  ): CommandExecutionResult {
    // Prevent concurrent executions
    if (this.isExecuting) {
      return {
        success: false,
        error: "Another command is currently being executed. Please wait for it to complete.",
        errorKind: "validation",
        schema: null,
        xmlContent: null,
      };
    }

    this.isExecuting = true;

    try {
      // Step 1: Parse current XML to schema object using SchemaModelManager
      this.modelManager.loadFromXml(currentXml);
      const schemaObj = this.modelManager.getSchema();
      
      if (!schemaObj) {
        throw new Error("Failed to load schema from XML");
      }

      // Step 2: Validate the command
      const validationResult = this.validator.validate(command, schemaObj);
      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.error,
          errorKind: "validation",
          schema: null,
          xmlContent: null,
        };
      }

      // Step 3: Create a deep copy for transactional execution
      const workingSchema = this.modelManager.cloneSchema();

      // Step 4: Execute the command on the working copy
      this.executor.execute(command, workingSchema);

      // Step 5: Update the model manager with the working schema and serialize
      this.modelManager.setSchema(workingSchema);
      const updatedXml = this.modelManager.toXml();

      // Step 6: Validate the resulting XML can be parsed (round-trip validation)
      this.modelManager.loadFromXml(updatedXml);
      
      // Restore the working schema to maintain consistency in modelManager state
      this.modelManager.setSchema(workingSchema);

      return {
        success: true,
        schema: workingSchema,
        xmlContent: updatedXml,
      };
    } catch (error) {
      // Rollback: any error during execution returns failure with original state preserved
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        success: false,
        error: `Command execution failed: ${err.message}`,
        errorKind: "runtime",
        stack: err.stack,
        schema: null,
        xmlContent: null,
      };
    } finally {
      // Always release the lock, even if an error occurred
      this.isExecuting = false;
    }
  }
}
