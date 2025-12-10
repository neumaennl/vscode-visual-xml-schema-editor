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
   * Validates if a string is a valid XML name.
   * XML names must start with a letter or underscore, and contain only
   * letters, digits, hyphens, underscores, and periods.
   *
   * @param name - The name to validate
   * @returns true if valid XML name, false otherwise
   */
  private isValidXmlName(name: string): boolean {
    if (!name || name.trim().length === 0) {
      return false;
    }
    // XML name pattern: starts with letter or underscore, 
    // followed by letters, digits, hyphens, underscores, or periods
    const xmlNamePattern = /^[a-zA-Z_][\w.-]*$/;
    return xmlNamePattern.test(name);
  }

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
    // Validate element name is a valid XML name
    if (!this.isValidXmlName(command.payload.elementName)) {
      return { valid: false, error: "Element name must be a valid XML name" };
    }
    
    // Validate parentId is not empty
    // TODO Phase 2: Validate that parentId exists in the schema
    if (!command.payload.parentId.trim()) {
      return { valid: false, error: "Parent ID cannot be empty" };
    }
    
    // Validate elementType is not empty
    // TODO Phase 2: Validate that elementType is a valid built-in or user-defined type
    if (!command.payload.elementType.trim()) {
      return { valid: false, error: "Element type is required" };
    }
    
    // Validate minOccurs if provided
    if (command.payload.minOccurs !== undefined) {
      if (command.payload.minOccurs < 0) {
        return { valid: false, error: "minOccurs must be >= 0" };
      }
      if (!Number.isInteger(command.payload.minOccurs)) {
        return { valid: false, error: "minOccurs must be an integer" };
      }
    }
    
    // Validate maxOccurs if provided
    if (command.payload.maxOccurs !== undefined) {
      if (command.payload.maxOccurs !== "unbounded") {
        if (typeof command.payload.maxOccurs !== "number" || command.payload.maxOccurs < 0) {
          return { valid: false, error: "maxOccurs must be a positive integer or 'unbounded'" };
        }
        if (!Number.isInteger(command.payload.maxOccurs)) {
          return { valid: false, error: "maxOccurs must be an integer or 'unbounded'" };
        }
        // Validate minOccurs <= maxOccurs
        if (command.payload.minOccurs !== undefined && 
            typeof command.payload.maxOccurs === "number" &&
            command.payload.minOccurs > command.payload.maxOccurs) {
          return { valid: false, error: "minOccurs must be <= maxOccurs" };
        }
      }
    }
    
    return { valid: true };
  }

  private validateRemoveElement(
    command: RemoveElementCommand,
    _schemaObj: schema
  ): ValidationResult {
    // In Phase 2, we would validate that elementId exists in the schema
    // For now, just validate it's not empty
    if (!command.payload.elementId.trim()) {
      return { valid: false, error: "Element ID cannot be empty" };
    }
    return { valid: true };
  }

  private validateModifyElement(
    command: ModifyElementCommand,
    _schemaObj: schema
  ): ValidationResult {
    // In Phase 2, we would validate that elementId exists in the schema
    if (!command.payload.elementId.trim()) {
      return { valid: false, error: "Element ID cannot be empty" };
    }
    
    // Validate element name if provided
    if (command.payload.elementName !== undefined && 
        !this.isValidXmlName(command.payload.elementName)) {
      return { valid: false, error: "Element name must be a valid XML name" };
    }
    
    // Validate minOccurs if provided
    if (command.payload.minOccurs !== undefined) {
      if (command.payload.minOccurs < 0) {
        return { valid: false, error: "minOccurs must be >= 0" };
      }
      if (!Number.isInteger(command.payload.minOccurs)) {
        return { valid: false, error: "minOccurs must be an integer" };
      }
    }
    
    // Validate maxOccurs if provided
    if (command.payload.maxOccurs !== undefined) {
      if (command.payload.maxOccurs !== "unbounded") {
        if (typeof command.payload.maxOccurs !== "number" || command.payload.maxOccurs < 0) {
          return { valid: false, error: "maxOccurs must be a positive integer or 'unbounded'" };
        }
        if (!Number.isInteger(command.payload.maxOccurs)) {
          return { valid: false, error: "maxOccurs must be an integer or 'unbounded'" };
        }
      }
    }
    
    return { valid: true };
  }

  // ===== Attribute Command Validation =====

  private validateAddAttribute(
    command: AddAttributeCommand,
    _schemaObj: schema
  ): ValidationResult {
    // Validate attribute name is a valid XML name
    if (!this.isValidXmlName(command.payload.attributeName)) {
      return { valid: false, error: "Attribute name must be a valid XML name" };
    }
    
    // In Phase 2, validate that parentId exists in the schema
    if (!command.payload.parentId.trim()) {
      return { valid: false, error: "Parent ID cannot be empty" };
    }
    
    return { valid: true };
  }

  private validateRemoveAttribute(
    command: RemoveAttributeCommand,
    _schemaObj: schema
  ): ValidationResult {
    // In Phase 2, validate that attributeId exists in the schema
    if (!command.payload.attributeId.trim()) {
      return { valid: false, error: "Attribute ID cannot be empty" };
    }
    return { valid: true };
  }

  private validateModifyAttribute(
    command: ModifyAttributeCommand,
    _schemaObj: schema
  ): ValidationResult {
    // In Phase 2, validate that attributeId exists in the schema
    if (!command.payload.attributeId.trim()) {
      return { valid: false, error: "Attribute ID cannot be empty" };
    }
    return { valid: true };
  }

  // ===== SimpleType Command Validation =====

  private validateAddSimpleType(
    command: AddSimpleTypeCommand,
    _schemaObj: schema
  ): ValidationResult {
    // Validate type name is a valid XML name
    if (!this.isValidXmlName(command.payload.typeName)) {
      return { valid: false, error: "Type name must be a valid XML name" };
    }
    // TODO Phase 2: Check if type name already exists in schema
    // TODO Phase 2: Validate baseType exists if specified
    return { valid: true };
  }

  private validateRemoveSimpleType(
    command: RemoveSimpleTypeCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.typeId.trim()) {
      return { valid: false, error: "Type ID cannot be empty" };
    }
    // TODO Phase 2: Validate that typeId exists in schema
    // TODO Phase 2: Check if type is being used by other elements/types
    return { valid: true };
  }

  private validateModifySimpleType(
    command: ModifySimpleTypeCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.typeId.trim()) {
      return { valid: false, error: "Type ID cannot be empty" };
    }
    // TODO Phase 2: Validate that typeId exists in schema
    return { valid: true };
  }

  // ===== ComplexType Command Validation =====

  private validateAddComplexType(
    command: AddComplexTypeCommand,
    _schemaObj: schema
  ): ValidationResult {
    // Validate type name is a valid XML name
    if (!this.isValidXmlName(command.payload.typeName)) {
      return { valid: false, error: "Type name must be a valid XML name" };
    }
    if (!command.payload.contentModel) {
      return { valid: false, error: "Content model is required" };
    }
    // Validate content model is one of the valid options
    const validModels = ["sequence", "choice", "all", "simpleContent", "complexContent"];
    if (!validModels.includes(command.payload.contentModel)) {
      return { valid: false, error: `Content model must be one of: ${validModels.join(", ")}` };
    }
    // TODO Phase 2: Check if type name already exists in schema
    return { valid: true };
  }

  private validateRemoveComplexType(
    command: RemoveComplexTypeCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.typeId.trim()) {
      return { valid: false, error: "Type ID cannot be empty" };
    }
    // TODO Phase 2: Validate that typeId exists in schema
    // TODO Phase 2: Check if type is being used by other elements/types
    return { valid: true };
  }

  private validateModifyComplexType(
    command: ModifyComplexTypeCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.typeId.trim()) {
      return { valid: false, error: "Type ID cannot be empty" };
    }
    // TODO Phase 2: Validate that typeId exists in schema
    return { valid: true };
  }

  // ===== Group Command Validation =====

  private validateAddGroup(
    command: AddGroupCommand,
    _schemaObj: schema
  ): ValidationResult {
    // Validate group name is a valid XML name
    if (!this.isValidXmlName(command.payload.groupName)) {
      return { valid: false, error: "Group name must be a valid XML name" };
    }
    if (!command.payload.contentModel) {
      return { valid: false, error: "Content model is required" };
    }
    // Validate content model
    const validModels = ["sequence", "choice", "all"];
    if (!validModels.includes(command.payload.contentModel)) {
      return { valid: false, error: `Content model must be one of: ${validModels.join(", ")}` };
    }
    // TODO Phase 2: Check if group name already exists
    return { valid: true };
  }

  private validateRemoveGroup(
    command: RemoveGroupCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.groupId.trim()) {
      return { valid: false, error: "Group ID cannot be empty" };
    }
    // TODO Phase 2: Validate that groupId exists in schema
    // TODO Phase 2: Check if group is being referenced
    return { valid: true };
  }

  private validateModifyGroup(
    command: ModifyGroupCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.groupId.trim()) {
      return { valid: false, error: "Group ID cannot be empty" };
    }
    // TODO Phase 2: Validate that groupId exists in schema
    return { valid: true };
  }

  // ===== AttributeGroup Command Validation =====

  private validateAddAttributeGroup(
    command: AddAttributeGroupCommand,
    _schemaObj: schema
  ): ValidationResult {
    // Validate group name is a valid XML name
    if (!this.isValidXmlName(command.payload.groupName)) {
      return { valid: false, error: "Attribute group name must be a valid XML name" };
    }
    // TODO Phase 2: Check if attribute group name already exists
    return { valid: true };
  }

  private validateRemoveAttributeGroup(
    command: RemoveAttributeGroupCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.groupId.trim()) {
      return { valid: false, error: "Attribute group ID cannot be empty" };
    }
    // TODO Phase 2: Validate that groupId exists in schema
    // TODO Phase 2: Check if attribute group is being referenced
    return { valid: true };
  }

  private validateModifyAttributeGroup(
    command: ModifyAttributeGroupCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.groupId.trim()) {
      return { valid: false, error: "Attribute group ID cannot be empty" };
    }
    // TODO Phase 2: Validate that groupId exists in schema
    return { valid: true };
  }

  // ===== Annotation Command Validation =====

  private validateAddAnnotation(
    command: AddAnnotationCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.targetId.trim()) {
      return { valid: false, error: "Target ID cannot be empty" };
    }
    // TODO Phase 2: Validate that targetId exists in schema
    return { valid: true };
  }

  private validateRemoveAnnotation(
    command: RemoveAnnotationCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.annotationId.trim()) {
      return { valid: false, error: "Annotation ID cannot be empty" };
    }
    // TODO Phase 2: Validate that annotationId exists in schema
    return { valid: true };
  }

  private validateModifyAnnotation(
    command: ModifyAnnotationCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.annotationId.trim()) {
      return { valid: false, error: "Annotation ID cannot be empty" };
    }
    // TODO Phase 2: Validate that annotationId exists in schema
    return { valid: true };
  }

  // ===== Documentation Command Validation =====

  private validateAddDocumentation(
    command: AddDocumentationCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.targetId.trim()) {
      return { valid: false, error: "Target ID cannot be empty" };
    }
    // TODO Phase 2: Validate that targetId exists in schema
    return { valid: true };
  }

  private validateRemoveDocumentation(
    command: RemoveDocumentationCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.documentationId.trim()) {
      return { valid: false, error: "Documentation ID cannot be empty" };
    }
    // TODO Phase 2: Validate that documentationId exists in schema
    return { valid: true };
  }

  private validateModifyDocumentation(
    command: ModifyDocumentationCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.documentationId.trim()) {
      return { valid: false, error: "Documentation ID cannot be empty" };
    }
    // TODO Phase 2: Validate that documentationId exists in schema
    return { valid: true };
  }

  // ===== Import Command Validation =====

  private validateAddImport(
    command: AddImportCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.namespace.trim()) {
      return { valid: false, error: "Namespace cannot be empty" };
    }
    if (!command.payload.schemaLocation.trim()) {
      return { valid: false, error: "Schema location cannot be empty" };
    }
    // TODO Phase 2: Validate namespace URI format
    // TODO Phase 2: Check if import already exists
    // TODO Phase 2: Validate schemaLocation is a valid path/URI
    return { valid: true };
  }

  private validateRemoveImport(
    command: RemoveImportCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.importId.trim()) {
      return { valid: false, error: "Import ID cannot be empty" };
    }
    // TODO Phase 2: Validate that importId exists in schema
    return { valid: true };
  }

  private validateModifyImport(
    command: ModifyImportCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.importId.trim()) {
      return { valid: false, error: "Import ID cannot be empty" };
    }
    // TODO Phase 2: Validate that importId exists in schema
    return { valid: true };
  }

  // ===== Include Command Validation =====

  private validateAddInclude(
    command: AddIncludeCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.schemaLocation.trim()) {
      return { valid: false, error: "Schema location cannot be empty" };
    }
    // TODO Phase 2: Validate schemaLocation is a valid path/URI
    // TODO Phase 2: Check if include already exists
    return { valid: true };
  }

  private validateRemoveInclude(
    command: RemoveIncludeCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.includeId.trim()) {
      return { valid: false, error: "Include ID cannot be empty" };
    }
    // TODO Phase 2: Validate that includeId exists in schema
    return { valid: true };
  }

  private validateModifyInclude(
    command: ModifyIncludeCommand,
    _schemaObj: schema
  ): ValidationResult {
    if (!command.payload.includeId.trim()) {
      return { valid: false, error: "Include ID cannot be empty" };
    }
    // TODO Phase 2: Validate that includeId exists in schema
    return { valid: true };
  }
}
