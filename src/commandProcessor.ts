/**
 * CommandProcessor: Central dispatcher for all editing commands.
 * Implements validation, execution, and rollback logic for schema transformations.
 */

import { marshal, unmarshal } from "@neumaennl/xmlbind-ts";
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
      const validationResult = this.validateCommand(command, schemaObj);
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
      this.executeCommand(command, workingSchema);

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
   */
  private cloneSchema(schemaObj: schema): schema {
    // Use unmarshal/marshal for deep cloning
    const xml = marshal(schemaObj);
    return unmarshal(schema, xml);
  }

  /**
   * Validate a command before execution.
   * Checks that the command has valid structure and references exist.
   */
  private validateCommand(
    command: SchemaCommand,
    schemaObj: schema
  ): { valid: boolean; error?: string } {
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
          error: `Unknown command type: ${(command as SchemaCommand).type}`,
        };
    }
  }

  /**
   * Execute a validated command on the schema.
   * This method modifies the schema object in place.
   */
  private executeCommand(command: SchemaCommand, schemaObj: schema): void {
    switch (command.type) {
      case "addElement":
        this.executeAddElement(command, schemaObj);
        break;
      case "removeElement":
        this.executeRemoveElement(command, schemaObj);
        break;
      case "modifyElement":
        this.executeModifyElement(command, schemaObj);
        break;
      case "addAttribute":
        this.executeAddAttribute(command, schemaObj);
        break;
      case "removeAttribute":
        this.executeRemoveAttribute(command, schemaObj);
        break;
      case "modifyAttribute":
        this.executeModifyAttribute(command, schemaObj);
        break;
      case "addSimpleType":
        this.executeAddSimpleType(command, schemaObj);
        break;
      case "removeSimpleType":
        this.executeRemoveSimpleType(command, schemaObj);
        break;
      case "modifySimpleType":
        this.executeModifySimpleType(command, schemaObj);
        break;
      case "addComplexType":
        this.executeAddComplexType(command, schemaObj);
        break;
      case "removeComplexType":
        this.executeRemoveComplexType(command, schemaObj);
        break;
      case "modifyComplexType":
        this.executeModifyComplexType(command, schemaObj);
        break;
      case "addGroup":
        this.executeAddGroup(command, schemaObj);
        break;
      case "removeGroup":
        this.executeRemoveGroup(command, schemaObj);
        break;
      case "modifyGroup":
        this.executeModifyGroup(command, schemaObj);
        break;
      case "addAttributeGroup":
        this.executeAddAttributeGroup(command, schemaObj);
        break;
      case "removeAttributeGroup":
        this.executeRemoveAttributeGroup(command, schemaObj);
        break;
      case "modifyAttributeGroup":
        this.executeModifyAttributeGroup(command, schemaObj);
        break;
      case "addAnnotation":
        this.executeAddAnnotation(command, schemaObj);
        break;
      case "removeAnnotation":
        this.executeRemoveAnnotation(command, schemaObj);
        break;
      case "modifyAnnotation":
        this.executeModifyAnnotation(command, schemaObj);
        break;
      case "addDocumentation":
        this.executeAddDocumentation(command, schemaObj);
        break;
      case "removeDocumentation":
        this.executeRemoveDocumentation(command, schemaObj);
        break;
      case "modifyDocumentation":
        this.executeModifyDocumentation(command, schemaObj);
        break;
      case "addImport":
        this.executeAddImport(command, schemaObj);
        break;
      case "removeImport":
        this.executeRemoveImport(command, schemaObj);
        break;
      case "modifyImport":
        this.executeModifyImport(command, schemaObj);
        break;
      case "addInclude":
        this.executeAddInclude(command, schemaObj);
        break;
      case "removeInclude":
        this.executeRemoveInclude(command, schemaObj);
        break;
      case "modifyInclude":
        this.executeModifyInclude(command, schemaObj);
        break;
      default:
        throw new Error(
          `Unknown command type: ${(command as SchemaCommand).type}`
        );
    }
  }

  // ===== Validation Methods =====

  private validateAddElement(
    command: AddElementCommand,
    _schemaObj: schema
  ): { valid: boolean; error?: string } {
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
  ): { valid: boolean; error?: string } {
    if (!command.payload.elementId) {
      return { valid: false, error: "Element ID is required" };
    }
    return { valid: true };
  }

  private validateModifyElement(
    command: ModifyElementCommand,
    _schemaObj: schema
  ): { valid: boolean; error?: string } {
    if (!command.payload.elementId) {
      return { valid: false, error: "Element ID is required" };
    }
    return { valid: true };
  }

  private validateAddAttribute(
    command: AddAttributeCommand,
    _schemaObj: schema
  ): { valid: boolean; error?: string } {
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
  ): { valid: boolean; error?: string } {
    if (!command.payload.attributeId) {
      return { valid: false, error: "Attribute ID is required" };
    }
    return { valid: true };
  }

  private validateModifyAttribute(
    command: ModifyAttributeCommand,
    _schemaObj: schema
  ): { valid: boolean; error?: string } {
    if (!command.payload.attributeId) {
      return { valid: false, error: "Attribute ID is required" };
    }
    return { valid: true };
  }

  private validateAddSimpleType(
    command: AddSimpleTypeCommand,
    _schemaObj: schema
  ): { valid: boolean; error?: string } {
    if (!command.payload.typeName) {
      return { valid: false, error: "Type name is required" };
    }
    return { valid: true };
  }

  private validateRemoveSimpleType(
    command: RemoveSimpleTypeCommand,
    _schemaObj: schema
  ): { valid: boolean; error?: string } {
    if (!command.payload.typeId) {
      return { valid: false, error: "Type ID is required" };
    }
    return { valid: true };
  }

  private validateModifySimpleType(
    command: ModifySimpleTypeCommand,
    _schemaObj: schema
  ): { valid: boolean; error?: string } {
    if (!command.payload.typeId) {
      return { valid: false, error: "Type ID is required" };
    }
    return { valid: true };
  }

  private validateAddComplexType(
    command: AddComplexTypeCommand,
    _schemaObj: schema
  ): { valid: boolean; error?: string } {
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
  ): { valid: boolean; error?: string } {
    if (!command.payload.typeId) {
      return { valid: false, error: "Type ID is required" };
    }
    return { valid: true };
  }

  private validateModifyComplexType(
    command: ModifyComplexTypeCommand,
    _schemaObj: schema
  ): { valid: boolean; error?: string } {
    if (!command.payload.typeId) {
      return { valid: false, error: "Type ID is required" };
    }
    return { valid: true };
  }

  private validateAddGroup(
    command: AddGroupCommand,
    _schemaObj: schema
  ): { valid: boolean; error?: string } {
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
  ): { valid: boolean; error?: string } {
    if (!command.payload.groupId) {
      return { valid: false, error: "Group ID is required" };
    }
    return { valid: true };
  }

  private validateModifyGroup(
    command: ModifyGroupCommand,
    _schemaObj: schema
  ): { valid: boolean; error?: string } {
    if (!command.payload.groupId) {
      return { valid: false, error: "Group ID is required" };
    }
    return { valid: true };
  }

  private validateAddAttributeGroup(
    command: AddAttributeGroupCommand,
    _schemaObj: schema
  ): { valid: boolean; error?: string } {
    if (!command.payload.groupName) {
      return { valid: false, error: "Attribute group name is required" };
    }
    return { valid: true };
  }

  private validateRemoveAttributeGroup(
    command: RemoveAttributeGroupCommand,
    _schemaObj: schema
  ): { valid: boolean; error?: string } {
    if (!command.payload.groupId) {
      return { valid: false, error: "Attribute group ID is required" };
    }
    return { valid: true };
  }

  private validateModifyAttributeGroup(
    command: ModifyAttributeGroupCommand,
    _schemaObj: schema
  ): { valid: boolean; error?: string } {
    if (!command.payload.groupId) {
      return { valid: false, error: "Attribute group ID is required" };
    }
    return { valid: true };
  }

  private validateAddAnnotation(
    command: AddAnnotationCommand,
    _schemaObj: schema
  ): { valid: boolean; error?: string } {
    if (!command.payload.targetId) {
      return { valid: false, error: "Target ID is required" };
    }
    return { valid: true };
  }

  private validateRemoveAnnotation(
    command: RemoveAnnotationCommand,
    _schemaObj: schema
  ): { valid: boolean; error?: string } {
    if (!command.payload.annotationId) {
      return { valid: false, error: "Annotation ID is required" };
    }
    return { valid: true };
  }

  private validateModifyAnnotation(
    command: ModifyAnnotationCommand,
    _schemaObj: schema
  ): { valid: boolean; error?: string } {
    if (!command.payload.annotationId) {
      return { valid: false, error: "Annotation ID is required" };
    }
    return { valid: true };
  }

  private validateAddDocumentation(
    command: AddDocumentationCommand,
    _schemaObj: schema
  ): { valid: boolean; error?: string } {
    if (!command.payload.targetId) {
      return { valid: false, error: "Target ID is required" };
    }
    return { valid: true };
  }

  private validateRemoveDocumentation(
    command: RemoveDocumentationCommand,
    _schemaObj: schema
  ): { valid: boolean; error?: string } {
    if (!command.payload.documentationId) {
      return { valid: false, error: "Documentation ID is required" };
    }
    return { valid: true };
  }

  private validateModifyDocumentation(
    command: ModifyDocumentationCommand,
    _schemaObj: schema
  ): { valid: boolean; error?: string } {
    if (!command.payload.documentationId) {
      return { valid: false, error: "Documentation ID is required" };
    }
    return { valid: true };
  }

  private validateAddImport(
    command: AddImportCommand,
    _schemaObj: schema
  ): { valid: boolean; error?: string } {
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
  ): { valid: boolean; error?: string } {
    if (!command.payload.importId) {
      return { valid: false, error: "Import ID is required" };
    }
    return { valid: true };
  }

  private validateModifyImport(
    command: ModifyImportCommand,
    _schemaObj: schema
  ): { valid: boolean; error?: string } {
    if (!command.payload.importId) {
      return { valid: false, error: "Import ID is required" };
    }
    return { valid: true };
  }

  private validateAddInclude(
    command: AddIncludeCommand,
    _schemaObj: schema
  ): { valid: boolean; error?: string } {
    if (!command.payload.schemaLocation) {
      return { valid: false, error: "Schema location is required" };
    }
    return { valid: true };
  }

  private validateRemoveInclude(
    command: RemoveIncludeCommand,
    _schemaObj: schema
  ): { valid: boolean; error?: string } {
    if (!command.payload.includeId) {
      return { valid: false, error: "Include ID is required" };
    }
    return { valid: true };
  }

  private validateModifyInclude(
    command: ModifyIncludeCommand,
    _schemaObj: schema
  ): { valid: boolean; error?: string } {
    if (!command.payload.includeId) {
      return { valid: false, error: "Include ID is required" };
    }
    return { valid: true };
  }

  // ===== Execution Methods (Stubs for now) =====
  // These methods will be implemented as part of Phase 2 when actual schema manipulation is needed

  private executeAddElement(
    _command: AddElementCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("addElement execution not yet implemented");
  }

  private executeRemoveElement(
    _command: RemoveElementCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("removeElement execution not yet implemented");
  }

  private executeModifyElement(
    _command: ModifyElementCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("modifyElement execution not yet implemented");
  }

  private executeAddAttribute(
    _command: AddAttributeCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("addAttribute execution not yet implemented");
  }

  private executeRemoveAttribute(
    _command: RemoveAttributeCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("removeAttribute execution not yet implemented");
  }

  private executeModifyAttribute(
    _command: ModifyAttributeCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("modifyAttribute execution not yet implemented");
  }

  private executeAddSimpleType(
    _command: AddSimpleTypeCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("addSimpleType execution not yet implemented");
  }

  private executeRemoveSimpleType(
    _command: RemoveSimpleTypeCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("removeSimpleType execution not yet implemented");
  }

  private executeModifySimpleType(
    _command: ModifySimpleTypeCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("modifySimpleType execution not yet implemented");
  }

  private executeAddComplexType(
    _command: AddComplexTypeCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("addComplexType execution not yet implemented");
  }

  private executeRemoveComplexType(
    _command: RemoveComplexTypeCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("removeComplexType execution not yet implemented");
  }

  private executeModifyComplexType(
    _command: ModifyComplexTypeCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("modifyComplexType execution not yet implemented");
  }

  private executeAddGroup(
    _command: AddGroupCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("addGroup execution not yet implemented");
  }

  private executeRemoveGroup(
    _command: RemoveGroupCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("removeGroup execution not yet implemented");
  }

  private executeModifyGroup(
    _command: ModifyGroupCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("modifyGroup execution not yet implemented");
  }

  private executeAddAttributeGroup(
    _command: AddAttributeGroupCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("addAttributeGroup execution not yet implemented");
  }

  private executeRemoveAttributeGroup(
    _command: RemoveAttributeGroupCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("removeAttributeGroup execution not yet implemented");
  }

  private executeModifyAttributeGroup(
    _command: ModifyAttributeGroupCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("modifyAttributeGroup execution not yet implemented");
  }

  private executeAddAnnotation(
    _command: AddAnnotationCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("addAnnotation execution not yet implemented");
  }

  private executeRemoveAnnotation(
    _command: RemoveAnnotationCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("removeAnnotation execution not yet implemented");
  }

  private executeModifyAnnotation(
    _command: ModifyAnnotationCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("modifyAnnotation execution not yet implemented");
  }

  private executeAddDocumentation(
    _command: AddDocumentationCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("addDocumentation execution not yet implemented");
  }

  private executeRemoveDocumentation(
    _command: RemoveDocumentationCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("removeDocumentation execution not yet implemented");
  }

  private executeModifyDocumentation(
    _command: ModifyDocumentationCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("modifyDocumentation execution not yet implemented");
  }

  private executeAddImport(
    _command: AddImportCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("addImport execution not yet implemented");
  }

  private executeRemoveImport(
    _command: RemoveImportCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("removeImport execution not yet implemented");
  }

  private executeModifyImport(
    _command: ModifyImportCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("modifyImport execution not yet implemented");
  }

  private executeAddInclude(
    _command: AddIncludeCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("addInclude execution not yet implemented");
  }

  private executeRemoveInclude(
    _command: RemoveIncludeCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("removeInclude execution not yet implemented");
  }

  private executeModifyInclude(
    _command: ModifyIncludeCommand,
    _schemaObj: schema
  ): void {
    // TODO: Implement in Phase 2
    throw new Error("modifyInclude execution not yet implemented");
  }
}
