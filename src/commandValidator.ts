/**
 * CommandValidator: Validates commands before execution.
 * Implements validation logic for all schema editing commands.
 *
 * Current Implementation (Phase 1 - Syntactic Validation):
 * - XML name syntax validation for all name fields
 * - Occurrence constraints validation (minOccurs >= 0, maxOccurs logic, consistency)
 * - Content model validation for complexType and group commands
 * - Required field validation (non-empty strings where appropriate)
 *
 * IMPORTANT: The IDs in commands (parentId, elementId, etc.) are UI-generated identifiers
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

import { SchemaCommand, schema } from "../shared/types";
import {
  AddElementCommand,
  RemoveElementCommand,
  ModifyElementCommand,
  AddAttributeCommand,
  RemoveAttributeCommand,
  ModifyAttributeCommand,
  AddSimpleTypeCommand,
  RemoveSimpleTypeCommand,
  ModifySimpleTypeCommand,
  AddComplexTypeCommand,
  RemoveComplexTypeCommand,
  ModifyComplexTypeCommand,
  AddGroupCommand,
  RemoveGroupCommand,
  ModifyGroupCommand,
  AddAttributeGroupCommand,
  RemoveAttributeGroupCommand,
  ModifyAttributeGroupCommand,
  AddAnnotationCommand,
  RemoveAnnotationCommand,
  ModifyAnnotationCommand,
  AddDocumentationCommand,
  RemoveDocumentationCommand,
  ModifyDocumentationCommand,
  AddImportCommand,
  RemoveImportCommand,
  ModifyImportCommand,
  AddIncludeCommand,
  RemoveIncludeCommand,
  ModifyIncludeCommand,
} from "../shared/commands";
import { ValidationResult } from "./commandValidators/validationUtils";

// Import validation functions from specialized modules for default usage
import * as elementValidators from "./commandValidators/elementValidators";
import * as typeValidators from "./commandValidators/typeValidators";
import * as groupValidators from "./commandValidators/groupValidators";
import * as annotationValidators from "./commandValidators/annotationValidators";
import * as schemaValidators from "./commandValidators/schemaValidators";

/**
 * Generic type for validator functions that validate commands.
 * Allows specifying a specific SchemaCommand subtype for type safety.
 */
type ValidatorFunction<T extends SchemaCommand = SchemaCommand> = (
  command: T,
  schemaObj: schema
) => ValidationResult;

/**
 * Interface for all validator functions used by CommandValidator.
 * Enables dependency injection for testing.
 */
export interface ValidatorFunctions {
  validateAddElement: ValidatorFunction<AddElementCommand>;
  validateRemoveElement: ValidatorFunction<RemoveElementCommand>;
  validateModifyElement: ValidatorFunction<ModifyElementCommand>;
  validateAddAttribute: ValidatorFunction<AddAttributeCommand>;
  validateRemoveAttribute: ValidatorFunction<RemoveAttributeCommand>;
  validateModifyAttribute: ValidatorFunction<ModifyAttributeCommand>;
  validateAddSimpleType: ValidatorFunction<AddSimpleTypeCommand>;
  validateRemoveSimpleType: ValidatorFunction<RemoveSimpleTypeCommand>;
  validateModifySimpleType: ValidatorFunction<ModifySimpleTypeCommand>;
  validateAddComplexType: ValidatorFunction<AddComplexTypeCommand>;
  validateRemoveComplexType: ValidatorFunction<RemoveComplexTypeCommand>;
  validateModifyComplexType: ValidatorFunction<ModifyComplexTypeCommand>;
  validateAddGroup: ValidatorFunction<AddGroupCommand>;
  validateRemoveGroup: ValidatorFunction<RemoveGroupCommand>;
  validateModifyGroup: ValidatorFunction<ModifyGroupCommand>;
  validateAddAttributeGroup: ValidatorFunction<AddAttributeGroupCommand>;
  validateRemoveAttributeGroup: ValidatorFunction<RemoveAttributeGroupCommand>;
  validateModifyAttributeGroup: ValidatorFunction<ModifyAttributeGroupCommand>;
  validateAddAnnotation: ValidatorFunction<AddAnnotationCommand>;
  validateRemoveAnnotation: ValidatorFunction<RemoveAnnotationCommand>;
  validateModifyAnnotation: ValidatorFunction<ModifyAnnotationCommand>;
  validateAddDocumentation: ValidatorFunction<AddDocumentationCommand>;
  validateRemoveDocumentation: ValidatorFunction<RemoveDocumentationCommand>;
  validateModifyDocumentation: ValidatorFunction<ModifyDocumentationCommand>;
  validateAddImport: ValidatorFunction<AddImportCommand>;
  validateRemoveImport: ValidatorFunction<RemoveImportCommand>;
  validateModifyImport: ValidatorFunction<ModifyImportCommand>;
  validateAddInclude: ValidatorFunction<AddIncludeCommand>;
  validateRemoveInclude: ValidatorFunction<RemoveIncludeCommand>;
  validateModifyInclude: ValidatorFunction<ModifyIncludeCommand>;
}

/**
 * CommandValidator class.
 * Validates commands before execution by delegating to specialized validator modules.
 */
export class CommandValidator {
  private readonly validators: ValidatorFunctions;

  /**
   * Creates a new CommandValidator.
   *
   * @param validators - Validator functions (optional, uses actual validators if not provided)
   */
  constructor(validators?: ValidatorFunctions) {
    // Use provided validators or default to actual validator modules
    this.validators = validators ?? {
      validateAddElement: elementValidators.validateAddElement,
      validateRemoveElement: elementValidators.validateRemoveElement,
      validateModifyElement: elementValidators.validateModifyElement,
      validateAddAttribute: elementValidators.validateAddAttribute,
      validateRemoveAttribute: elementValidators.validateRemoveAttribute,
      validateModifyAttribute: elementValidators.validateModifyAttribute,
      validateAddSimpleType: typeValidators.validateAddSimpleType,
      validateRemoveSimpleType: typeValidators.validateRemoveSimpleType,
      validateModifySimpleType: typeValidators.validateModifySimpleType,
      validateAddComplexType: typeValidators.validateAddComplexType,
      validateRemoveComplexType: typeValidators.validateRemoveComplexType,
      validateModifyComplexType: typeValidators.validateModifyComplexType,
      validateAddGroup: groupValidators.validateAddGroup,
      validateRemoveGroup: groupValidators.validateRemoveGroup,
      validateModifyGroup: groupValidators.validateModifyGroup,
      validateAddAttributeGroup: groupValidators.validateAddAttributeGroup,
      validateRemoveAttributeGroup: groupValidators.validateRemoveAttributeGroup,
      validateModifyAttributeGroup: groupValidators.validateModifyAttributeGroup,
      validateAddAnnotation: annotationValidators.validateAddAnnotation,
      validateRemoveAnnotation: annotationValidators.validateRemoveAnnotation,
      validateModifyAnnotation: annotationValidators.validateModifyAnnotation,
      validateAddDocumentation: annotationValidators.validateAddDocumentation,
      validateRemoveDocumentation: annotationValidators.validateRemoveDocumentation,
      validateModifyDocumentation: annotationValidators.validateModifyDocumentation,
      validateAddImport: schemaValidators.validateAddImport,
      validateRemoveImport: schemaValidators.validateRemoveImport,
      validateModifyImport: schemaValidators.validateModifyImport,
      validateAddInclude: schemaValidators.validateAddInclude,
      validateRemoveInclude: schemaValidators.validateRemoveInclude,
      validateModifyInclude: schemaValidators.validateModifyInclude,
    };
  }

  /**
   * Validate a command before execution.
   *
   * @param command - The command to validate
   * @param schemaObj - The schema object for context validation
   * @returns Validation result with success status and optional error message
   */
  public validate(command: SchemaCommand, schemaObj: schema): ValidationResult {
    // Type-specific validation - delegate to specialized validators
    switch (command.type) {
      case "addElement":
        return this.validators.validateAddElement(command, schemaObj);
      case "removeElement":
        return this.validators.validateRemoveElement(command, schemaObj);
      case "modifyElement":
        return this.validators.validateModifyElement(command, schemaObj);
      case "addAttribute":
        return this.validators.validateAddAttribute(command, schemaObj);
      case "removeAttribute":
        return this.validators.validateRemoveAttribute(command, schemaObj);
      case "modifyAttribute":
        return this.validators.validateModifyAttribute(command, schemaObj);
      case "addSimpleType":
        return this.validators.validateAddSimpleType(command, schemaObj);
      case "removeSimpleType":
        return this.validators.validateRemoveSimpleType(command, schemaObj);
      case "modifySimpleType":
        return this.validators.validateModifySimpleType(command, schemaObj);
      case "addComplexType":
        return this.validators.validateAddComplexType(command, schemaObj);
      case "removeComplexType":
        return this.validators.validateRemoveComplexType(command, schemaObj);
      case "modifyComplexType":
        return this.validators.validateModifyComplexType(command, schemaObj);
      case "addGroup":
        return this.validators.validateAddGroup(command, schemaObj);
      case "removeGroup":
        return this.validators.validateRemoveGroup(command, schemaObj);
      case "modifyGroup":
        return this.validators.validateModifyGroup(command, schemaObj);
      case "addAttributeGroup":
        return this.validators.validateAddAttributeGroup(command, schemaObj);
      case "removeAttributeGroup":
        return this.validators.validateRemoveAttributeGroup(command, schemaObj);
      case "modifyAttributeGroup":
        return this.validators.validateModifyAttributeGroup(command, schemaObj);
      case "addAnnotation":
        return this.validators.validateAddAnnotation(command, schemaObj);
      case "removeAnnotation":
        return this.validators.validateRemoveAnnotation(command, schemaObj);
      case "modifyAnnotation":
        return this.validators.validateModifyAnnotation(command, schemaObj);
      case "addDocumentation":
        return this.validators.validateAddDocumentation(command, schemaObj);
      case "removeDocumentation":
        return this.validators.validateRemoveDocumentation(command, schemaObj);
      case "modifyDocumentation":
        return this.validators.validateModifyDocumentation(command, schemaObj);
      case "addImport":
        return this.validators.validateAddImport(command, schemaObj);
      case "removeImport":
        return this.validators.validateRemoveImport(command, schemaObj);
      case "modifyImport":
        return this.validators.validateModifyImport(command, schemaObj);
      case "addInclude":
        return this.validators.validateAddInclude(command, schemaObj);
      case "removeInclude":
        return this.validators.validateRemoveInclude(command, schemaObj);
      case "modifyInclude":
        return this.validators.validateModifyInclude(command, schemaObj);
      default:
        return {
          valid: false,
          error: `Unknown command type: ${(command as SchemaCommand).type}`,
        };
    }
  }
}

// Re-export ValidationResult and utility functions
export type { ValidationResult };
