/**
 * CommandProcessor: Central dispatcher for all editing commands.
 * Implements validation, execution, and rollback logic for schema transformations.
 */

import { marshal, unmarshal } from "@neumaennl/xmlbind-ts";
import { SchemaCommand, schema } from "../shared/types";
import { CommandValidator } from "./commandValidator";
import { CommandExecutor } from "./commandExecutor";

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

  /**
   * Creates a new CommandProcessor.
   *
   * @param validator - Command validator instance (optional, creates default if not provided)
   * @param executor - Command executor instance (optional, creates default if not provided)
   */
  constructor(
    validator?: CommandValidator,
    executor?: CommandExecutor
  ) {
    this.validator = validator ?? new CommandValidator();
    this.executor = executor ?? new CommandExecutor();
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
      // Step 1: Parse current XML to schema object
      const schemaObj = this.parseSchema(currentXml);

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
      const workingSchema = this.cloneSchema(schemaObj);

      // Step 4: Execute the command on the working copy
      this.executor.execute(command, workingSchema);

      // Step 5: Serialize back to XML
      const updatedXml = this.serializeSchema(workingSchema);

      // Step 6: Validate the resulting XML can be parsed (round-trip validation)
      this.parseSchema(updatedXml);

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

  /**
   * Parse XML string to schema object.
   *
   * @param xmlContent - The XML content to parse
   * @returns The parsed schema object
   * @throws Error if parsing fails
   */
  private parseSchema(xmlContent: string): schema {
    try {
      return unmarshal(schema, xmlContent);
    } catch (error) {
      throw new Error(`Failed to parse schema XML: ${(error as Error).message}`);
    }
  }

  /**
   * Serialize schema object to XML string.
   *
   * @param schemaObj - The schema object to serialize
   * @returns The serialized XML string
   * @throws Error if serialization fails
   */
  private serializeSchema(schemaObj: schema): string {
    try {
      return marshal(schemaObj);
    } catch (error) {
      throw new Error(
        `Failed to serialize schema to XML: ${(error as Error).message}`
      );
    }
  }

  /**
   * Create a deep copy of the schema for transactional execution.
   * This allows rollback if execution fails.
   * 
   * Note: Uses marshal/unmarshal for cloning to ensure perfect fidelity
   * with actual XML representation. While less efficient than JSON cloning,
   * this guarantees that the cloned schema can be serialized identically.
   *
   * @param schemaObj - The schema object to clone
   * @returns A deep copy of the schema object
   */
  private cloneSchema(schemaObj: schema): schema {
    // Use unmarshal/marshal for deep cloning to ensure XML fidelity
    const xml = marshal(schemaObj);
    return unmarshal(schema, xml);
  }
}
