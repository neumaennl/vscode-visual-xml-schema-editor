/**
 * CommandProcessor: Central dispatcher for all editing commands.
 * Implements validation, execution, and rollback logic for schema transformations.
 */

import { SchemaCommand, schema } from "../shared/types";
import { CommandValidator } from "./commandValidator";
import { CommandExecutor } from "./commandExecutor";
import { SchemaModelManager } from "./schemaModelManager";

/**
 * Result of a command execution including the updated schema and XML.
 */
export interface CommandExecutionResult {
  /** Whether the command was executed successfully */
  success: boolean;
  /** Error message if execution failed */
  error?: string;
  /** Updated schema object (null if execution failed) */
  schema: schema | null;
  /** Serialized XML content (null if execution failed) */
  xmlContent: string | null;
}

/**
 * CommandProcessor manages the execution of schema editing commands.
 * Ensures validation, transactionality, and rollback support.
 */
export class CommandProcessor {
  private readonly validator: CommandValidator;
  private readonly executor: CommandExecutor;
  private readonly modelManager: SchemaModelManager;

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
   *
   * @param command - The command to execute
   * @param currentXml - The current XML content of the schema
   * @returns Result containing success status, updated schema and XML, or error message
   */
  public execute(
    command: SchemaCommand,
    currentXml: string
  ): CommandExecutionResult {
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

      return {
        success: true,
        schema: workingSchema,
        xmlContent: updatedXml,
      };
    } catch (error) {
      // Rollback: any error during execution returns failure with original state preserved
      return {
        success: false,
        error: `Command execution failed: ${(error as Error).message}`,
        schema: null,
        xmlContent: null,
      };
    }
  }
}
