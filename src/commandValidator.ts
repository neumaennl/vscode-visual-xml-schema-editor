/**
 * `CommandValidator`: Validates commands before execution.
 * Implements validation logic for all schema editing commands.
 *
 * Current Implementation (Phase 1 - Syntactic Validation):
 * - XML name syntax validation for all name fields
 * - Occurrence constraints validation (`minOccurs >= 0`, `maxOccurs` logic, consistency)
 * - Content model validation for complexType and group commands
 * - Required field validation (non-empty strings where appropriate)
 *
 * IMPORTANT: The IDs in commands (`parentId`, `elementId`, etc.) are UI-generated identifiers
 * for diagram nodes, NOT the XSD schema 'id' attributes. These are managed by the UI layer
 * and cannot be validated against the schema structure at this stage.
 *
 * Future Enhancements (Phase 2+ - Semantic Validation):
 * - Validate that UI node IDs correspond to actual nodes when execution logic is implemented
 * - Check for duplicate element/type names before adding (requires execution context)
 * - Validate type references (ensure referenced types are valid built-in or user-defined)
 * - Check for circular dependencies in type hierarchies
 * - Validate XPath expressions in key/keyref/unique constraints
 * - Verify namespace URI format and declarations
 * - Check if types/groups are being used before allowing removal
 * - Validate facet restrictions for simple types
 * - Ensure complex content model semantics (e.g., all can't contain choice)
 */

import type { SchemaCommand, schema } from "../shared/types.js";
import type { ValidationResult } from "./commandValidators/validationUtils.js";
import type { CommandHandlers } from "./commandHandlers.js";
import { findCommandHandler } from "./commandHandlers.js";

// Import validation functions from specialized modules for default usage
import * as elementValidators from "./commandValidators/elementValidators.js";
import * as attributeValidators from "./commandValidators/attributeValidators.js";
import * as simpleTypeValidators from "./commandValidators/simpleTypeValidators.js";
import * as complexTypeValidators from "./commandValidators/complexTypeValidators.js";
import * as groupValidators from "./commandValidators/groupValidators.js";
import * as attributeGroupValidators from "./commandValidators/attributeGroupValidators.js";
import * as annotationValidators from "./commandValidators/annotationValidators.js";
import * as schemaValidators from "./commandValidators/schemaValidators.js";

/**
 * The validator functions used by `CommandValidator`, one per command type, such as
 * `validateAddElement` for `addElement`. Enables dependency injection for testing.
 */
export type ValidatorFunctions = CommandHandlers<"validate", ValidationResult>;

/**
 * The validator functions of the validator modules, which `CommandValidator` uses unless others are
 * injected. The modules also export constants, which the lookup by name never finds.
 */
export const defaultValidators: ValidatorFunctions = {
  ...elementValidators,
  ...attributeValidators,
  ...simpleTypeValidators,
  ...complexTypeValidators,
  ...groupValidators,
  ...attributeGroupValidators,
  ...annotationValidators,
  ...schemaValidators,
};

/**
 * `CommandValidator` class.
 * Validates commands before execution by delegating to specialized validator modules.
 */
export class CommandValidator {
  private readonly validators: ValidatorFunctions;

  /**
   * Creates a new `CommandValidator`.
   *
   * @param validators - Validator functions (optional, uses actual validators if not provided)
   */
  constructor(validators?: ValidatorFunctions) {
    // Use provided validators or default to actual validator modules
    this.validators = validators ?? defaultValidators;
  }

  /**
   * Validate a command before execution.
   *
   * @param command - The command to validate
   * @param schemaObj - The schema object for context validation
   * @returns Validation result with success status and optional error message
   */
  public validate(command: SchemaCommand, schemaObj: schema): ValidationResult {
    const validator = findCommandHandler<"validate", ValidationResult>(this.validators, "validate", command);
    if (!validator) {
      return { valid: false, error: `Unknown command type: ${command.type}` };
    }
    return validator(command, schemaObj);
  }
}

// Re-export ValidationResult and utility functions
export type { ValidationResult };
