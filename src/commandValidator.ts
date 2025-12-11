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
import { ValidationResult } from "./commandValidators/validationUtils";

// Import validation functions from specialized modules
import {
  validateAddElement,
  validateRemoveElement,
  validateModifyElement,
  validateAddAttribute,
  validateRemoveAttribute,
  validateModifyAttribute,
} from "./commandValidators/elementValidators";

import {
  validateAddSimpleType,
  validateRemoveSimpleType,
  validateModifySimpleType,
  validateAddComplexType,
  validateRemoveComplexType,
  validateModifyComplexType,
} from "./commandValidators/typeValidators";

import {
  validateAddGroup,
  validateRemoveGroup,
  validateModifyGroup,
  validateAddAttributeGroup,
  validateRemoveAttributeGroup,
  validateModifyAttributeGroup,
} from "./commandValidators/groupValidators";

import {
  validateAddAnnotation,
  validateRemoveAnnotation,
  validateModifyAnnotation,
  validateAddDocumentation,
  validateRemoveDocumentation,
  validateModifyDocumentation,
} from "./commandValidators/annotationValidators";

import {
  validateAddImport,
  validateRemoveImport,
  validateModifyImport,
  validateAddInclude,
  validateRemoveInclude,
  validateModifyInclude,
} from "./commandValidators/schemaValidators";

/**
 * CommandValidator class.
 * Validates commands before execution by delegating to specialized validator modules.
 */
export class CommandValidator {
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
        return validateAddElement(command, schemaObj);
      case "removeElement":
        return validateRemoveElement(command, schemaObj);
      case "modifyElement":
        return validateModifyElement(command, schemaObj);
      case "addAttribute":
        return validateAddAttribute(command, schemaObj);
      case "removeAttribute":
        return validateRemoveAttribute(command, schemaObj);
      case "modifyAttribute":
        return validateModifyAttribute(command, schemaObj);
      case "addSimpleType":
        return validateAddSimpleType(command, schemaObj);
      case "removeSimpleType":
        return validateRemoveSimpleType(command, schemaObj);
      case "modifySimpleType":
        return validateModifySimpleType(command, schemaObj);
      case "addComplexType":
        return validateAddComplexType(command, schemaObj);
      case "removeComplexType":
        return validateRemoveComplexType(command, schemaObj);
      case "modifyComplexType":
        return validateModifyComplexType(command, schemaObj);
      case "addGroup":
        return validateAddGroup(command, schemaObj);
      case "removeGroup":
        return validateRemoveGroup(command, schemaObj);
      case "modifyGroup":
        return validateModifyGroup(command, schemaObj);
      case "addAttributeGroup":
        return validateAddAttributeGroup(command, schemaObj);
      case "removeAttributeGroup":
        return validateRemoveAttributeGroup(command, schemaObj);
      case "modifyAttributeGroup":
        return validateModifyAttributeGroup(command, schemaObj);
      case "addAnnotation":
        return validateAddAnnotation(command, schemaObj);
      case "removeAnnotation":
        return validateRemoveAnnotation(command, schemaObj);
      case "modifyAnnotation":
        return validateModifyAnnotation(command, schemaObj);
      case "addDocumentation":
        return validateAddDocumentation(command, schemaObj);
      case "removeDocumentation":
        return validateRemoveDocumentation(command, schemaObj);
      case "modifyDocumentation":
        return validateModifyDocumentation(command, schemaObj);
      case "addImport":
        return validateAddImport(command, schemaObj);
      case "removeImport":
        return validateRemoveImport(command, schemaObj);
      case "modifyImport":
        return validateModifyImport(command, schemaObj);
      case "addInclude":
        return validateAddInclude(command, schemaObj);
      case "removeInclude":
        return validateRemoveInclude(command, schemaObj);
      case "modifyInclude":
        return validateModifyInclude(command, schemaObj);
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
