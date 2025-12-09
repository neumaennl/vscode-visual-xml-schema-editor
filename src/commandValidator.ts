/**
 * CommandValidator: Validates commands before execution.
 * Implements validation logic for all schema editing commands.
 */

import {
  SchemaCommand,
  schema,
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
} from "../shared/types";

/**
 * Result of command validation.
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates schema commands before execution.
 */
export class CommandValidator {
  /**
   * Validate a command before execution.
   *
   * @param command - The command to validate
   * @param schemaObj - The schema object for context validation
   * @returns Validation result with success status and optional error message
   */
  public validate(
    command: SchemaCommand,
    schemaObj: schema
  ): ValidationResult {
    // Validate command type exists
    if (!command.type) {
      return { valid: false, error: "Command type is required" };
    }

    // Validate payload exists
    if (!command.payload) {
      return { valid: false, error: "Command payload is required" };
    }

    // Type-specific validation
    switch (command.type) {
      case "addElement":
        return this.validateAddElement(command, schemaObj);
      case "removeElement":
        return this.validateRemoveElement(command, schemaObj);
      case "modifyElement":
        return this.validateModifyElement(command, schemaObj);
      case "addAttribute":
        return this.validateAddAttribute(command, schemaObj);
      case "removeAttribute":
        return this.validateRemoveAttribute(command, schemaObj);
      case "modifyAttribute":
        return this.validateModifyAttribute(command, schemaObj);
      case "addSimpleType":
        return this.validateAddSimpleType(command, schemaObj);
      case "removeSimpleType":
        return this.validateRemoveSimpleType(command, schemaObj);
      case "modifySimpleType":
        return this.validateModifySimpleType(command, schemaObj);
      case "addComplexType":
        return this.validateAddComplexType(command, schemaObj);
      case "removeComplexType":
        return this.validateRemoveComplexType(command, schemaObj);
      case "modifyComplexType":
        return this.validateModifyComplexType(command, schemaObj);
      case "addGroup":
        return this.validateAddGroup(command, schemaObj);
      case "removeGroup":
        return this.validateRemoveGroup(command, schemaObj);
      case "modifyGroup":
        return this.validateModifyGroup(command, schemaObj);
      case "addAttributeGroup":
        return this.validateAddAttributeGroup(command, schemaObj);
      case "removeAttributeGroup":
        return this.validateRemoveAttributeGroup(command, schemaObj);
      case "modifyAttributeGroup":
        return this.validateModifyAttributeGroup(command, schemaObj);
      case "addAnnotation":
        return this.validateAddAnnotation(command, schemaObj);
      case "removeAnnotation":
        return this.validateRemoveAnnotation(command, schemaObj);
      case "modifyAnnotation":
        return this.validateModifyAnnotation(command, schemaObj);
      case "addDocumentation":
        return this.validateAddDocumentation(command, schemaObj);
      case "removeDocumentation":
        return this.validateRemoveDocumentation(command, schemaObj);
      case "modifyDocumentation":
        return this.validateModifyDocumentation(command, schemaObj);
      case "addImport":
        return this.validateAddImport(command, schemaObj);
      case "removeImport":
        return this.validateRemoveImport(command, schemaObj);
      case "modifyImport":
        return this.validateModifyImport(command, schemaObj);
      case "addInclude":
        return this.validateAddInclude(command, schemaObj);
      case "removeInclude":
        return this.validateRemoveInclude(command, schemaObj);
      case "modifyInclude":
        return this.validateModifyInclude(command, schemaObj);
      default:
        return {
          valid: false,
          error: `Unknown command type: ${
            (command as SchemaCommand).type ?? "undefined"
          }`,
        };
    }
  }

  // ===== Element Command Validation =====

  private validateAddElement(
    command: AddElementCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.elementName) {
      return { valid: false, error: "Element name is required" };
    }
    if (!command.payload.elementType) {
      return { valid: false, error: "Element type is required" };
    }
    if (!command.payload.parentId) {
      return { valid: false, error: "Parent ID is required" };
    }
    return { valid: true };
  }

  private validateRemoveElement(
    command: RemoveElementCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.elementId) {
      return { valid: false, error: "Element ID is required" };
    }
    return { valid: true };
  }

  private validateModifyElement(
    command: ModifyElementCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.elementId) {
      return { valid: false, error: "Element ID is required" };
    }
    return { valid: true };
  }

  // ===== Attribute Command Validation =====

  private validateAddAttribute(
    command: AddAttributeCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.attributeName) {
      return { valid: false, error: "Attribute name is required" };
    }
    if (!command.payload.parentId) {
      return { valid: false, error: "Parent ID is required" };
    }
    return { valid: true };
  }

  private validateRemoveAttribute(
    command: RemoveAttributeCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.attributeId) {
      return { valid: false, error: "Attribute ID is required" };
    }
    return { valid: true };
  }

  private validateModifyAttribute(
    command: ModifyAttributeCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.attributeId) {
      return { valid: false, error: "Attribute ID is required" };
    }
    return { valid: true };
  }

  // ===== SimpleType Command Validation =====

  private validateAddSimpleType(
    command: AddSimpleTypeCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.typeName) {
      return { valid: false, error: "Type name is required" };
    }
    return { valid: true };
  }

  private validateRemoveSimpleType(
    command: RemoveSimpleTypeCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.typeId) {
      return { valid: false, error: "Type ID is required" };
    }
    return { valid: true };
  }

  private validateModifySimpleType(
    command: ModifySimpleTypeCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.typeId) {
      return { valid: false, error: "Type ID is required" };
    }
    return { valid: true };
  }

  // ===== ComplexType Command Validation =====

  private validateAddComplexType(
    command: AddComplexTypeCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.typeName) {
      return { valid: false, error: "Type name is required" };
    }
    if (!command.payload.contentModel) {
      return { valid: false, error: "Content model is required" };
    }
    return { valid: true };
  }

  private validateRemoveComplexType(
    command: RemoveComplexTypeCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.typeId) {
      return { valid: false, error: "Type ID is required" };
    }
    return { valid: true };
  }

  private validateModifyComplexType(
    command: ModifyComplexTypeCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.typeId) {
      return { valid: false, error: "Type ID is required" };
    }
    return { valid: true };
  }

  // ===== Group Command Validation =====

  private validateAddGroup(
    command: AddGroupCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.groupName) {
      return { valid: false, error: "Group name is required" };
    }
    if (!command.payload.contentModel) {
      return { valid: false, error: "Content model is required" };
    }
    return { valid: true };
  }

  private validateRemoveGroup(
    command: RemoveGroupCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.groupId) {
      return { valid: false, error: "Group ID is required" };
    }
    return { valid: true };
  }

  private validateModifyGroup(
    command: ModifyGroupCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.groupId) {
      return { valid: false, error: "Group ID is required" };
    }
    return { valid: true };
  }

  // ===== AttributeGroup Command Validation =====

  private validateAddAttributeGroup(
    command: AddAttributeGroupCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.groupName) {
      return { valid: false, error: "Attribute group name is required" };
    }
    return { valid: true };
  }

  private validateRemoveAttributeGroup(
    command: RemoveAttributeGroupCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.groupId) {
      return { valid: false, error: "Attribute group ID is required" };
    }
    return { valid: true };
  }

  private validateModifyAttributeGroup(
    command: ModifyAttributeGroupCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.groupId) {
      return { valid: false, error: "Attribute group ID is required" };
    }
    return { valid: true };
  }

  // ===== Annotation Command Validation =====

  private validateAddAnnotation(
    command: AddAnnotationCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.targetId) {
      return { valid: false, error: "Target ID is required" };
    }
    return { valid: true };
  }

  private validateRemoveAnnotation(
    command: RemoveAnnotationCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.annotationId) {
      return { valid: false, error: "Annotation ID is required" };
    }
    return { valid: true };
  }

  private validateModifyAnnotation(
    command: ModifyAnnotationCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.annotationId) {
      return { valid: false, error: "Annotation ID is required" };
    }
    return { valid: true };
  }

  // ===== Documentation Command Validation =====

  private validateAddDocumentation(
    command: AddDocumentationCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.targetId) {
      return { valid: false, error: "Target ID is required" };
    }
    return { valid: true };
  }

  private validateRemoveDocumentation(
    command: RemoveDocumentationCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.documentationId) {
      return { valid: false, error: "Documentation ID is required" };
    }
    return { valid: true };
  }

  private validateModifyDocumentation(
    command: ModifyDocumentationCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.documentationId) {
      return { valid: false, error: "Documentation ID is required" };
    }
    return { valid: true };
  }

  // ===== Import Command Validation =====

  private validateAddImport(
    command: AddImportCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.namespace) {
      return { valid: false, error: "Namespace is required" };
    }
    if (!command.payload.schemaLocation) {
      return { valid: false, error: "Schema location is required" };
    }
    return { valid: true };
  }

  private validateRemoveImport(
    command: RemoveImportCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.importId) {
      return { valid: false, error: "Import ID is required" };
    }
    return { valid: true };
  }

  private validateModifyImport(
    command: ModifyImportCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.importId) {
      return { valid: false, error: "Import ID is required" };
    }
    return { valid: true };
  }

  // ===== Include Command Validation =====

  private validateAddInclude(
    command: AddIncludeCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.schemaLocation) {
      return { valid: false, error: "Schema location is required" };
    }
    return { valid: true };
  }

  private validateRemoveInclude(
    command: RemoveIncludeCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.includeId) {
      return { valid: false, error: "Include ID is required" };
    }
    return { valid: true };
  }

  private validateModifyInclude(
    command: ModifyIncludeCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.includeId) {
      return { valid: false, error: "Include ID is required" };
    }
    return { valid: true };
  }
}
