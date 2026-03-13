/**
 * CommandExecutor: Executes validated commands on the schema.
 * Implements execution logic by delegating to specialized executor modules.
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

// Import execution functions from specialized modules
import * as elementExecutors from "./commandExecutors/elementExecutors";
import * as attributeExecutors from "./commandExecutors/attributeExecutors";
import * as typeExecutors from "./commandExecutors/typeExecutors";
import * as groupExecutors from "./commandExecutors/groupExecutors";
import * as annotationExecutors from "./commandExecutors/annotationExecutors";
import * as schemaExecutors from "./commandExecutors/schemaExecutors";

/**
 * Generic type for executor functions that execute commands.
 * Allows specifying a specific SchemaCommand subtype for type safety.
 */
type ExecutorFunction<T extends SchemaCommand = SchemaCommand> = (
  command: T,
  schemaObj: schema
) => void;

/**
 * Interface for all executor functions used by CommandExecutor.
 * Enables dependency injection for testing.
 */
export interface ExecutorFunctions {
  executeAddElement: ExecutorFunction<AddElementCommand>;
  executeRemoveElement: ExecutorFunction<RemoveElementCommand>;
  executeModifyElement: ExecutorFunction<ModifyElementCommand>;
  executeAddAttribute: ExecutorFunction<AddAttributeCommand>;
  executeRemoveAttribute: ExecutorFunction<RemoveAttributeCommand>;
  executeModifyAttribute: ExecutorFunction<ModifyAttributeCommand>;
  executeAddSimpleType: ExecutorFunction<AddSimpleTypeCommand>;
  executeRemoveSimpleType: ExecutorFunction<RemoveSimpleTypeCommand>;
  executeModifySimpleType: ExecutorFunction<ModifySimpleTypeCommand>;
  executeAddComplexType: ExecutorFunction<AddComplexTypeCommand>;
  executeRemoveComplexType: ExecutorFunction<RemoveComplexTypeCommand>;
  executeModifyComplexType: ExecutorFunction<ModifyComplexTypeCommand>;
  executeAddGroup: ExecutorFunction<AddGroupCommand>;
  executeRemoveGroup: ExecutorFunction<RemoveGroupCommand>;
  executeModifyGroup: ExecutorFunction<ModifyGroupCommand>;
  executeAddAttributeGroup: ExecutorFunction<AddAttributeGroupCommand>;
  executeRemoveAttributeGroup: ExecutorFunction<RemoveAttributeGroupCommand>;
  executeModifyAttributeGroup: ExecutorFunction<ModifyAttributeGroupCommand>;
  executeAddAnnotation: ExecutorFunction<AddAnnotationCommand>;
  executeRemoveAnnotation: ExecutorFunction<RemoveAnnotationCommand>;
  executeModifyAnnotation: ExecutorFunction<ModifyAnnotationCommand>;
  executeAddDocumentation: ExecutorFunction<AddDocumentationCommand>;
  executeRemoveDocumentation: ExecutorFunction<RemoveDocumentationCommand>;
  executeModifyDocumentation: ExecutorFunction<ModifyDocumentationCommand>;
  executeAddImport: ExecutorFunction<AddImportCommand>;
  executeRemoveImport: ExecutorFunction<RemoveImportCommand>;
  executeModifyImport: ExecutorFunction<ModifyImportCommand>;
  executeAddInclude: ExecutorFunction<AddIncludeCommand>;
  executeRemoveInclude: ExecutorFunction<RemoveIncludeCommand>;
  executeModifyInclude: ExecutorFunction<ModifyIncludeCommand>;
}

/**
 * CommandExecutor class.
 * Executes validated commands by delegating to specialized executor modules.
 */
export class CommandExecutor {
  private readonly executors: ExecutorFunctions;

  /**
   * Creates a new CommandExecutor.
   *
   * @param executors - Executor functions (optional, uses actual executors if not provided)
   */
  constructor(executors?: ExecutorFunctions) {
    // Use provided executors or default to actual executor modules
    this.executors = executors ?? {
      executeAddElement: elementExecutors.executeAddElement,
      executeRemoveElement: elementExecutors.executeRemoveElement,
      executeModifyElement: elementExecutors.executeModifyElement,
      executeAddAttribute: attributeExecutors.executeAddAttribute,
      executeRemoveAttribute: attributeExecutors.executeRemoveAttribute,
      executeModifyAttribute: attributeExecutors.executeModifyAttribute,
      executeAddSimpleType: typeExecutors.executeAddSimpleType,
      executeRemoveSimpleType: typeExecutors.executeRemoveSimpleType,
      executeModifySimpleType: typeExecutors.executeModifySimpleType,
      executeAddComplexType: typeExecutors.executeAddComplexType,
      executeRemoveComplexType: typeExecutors.executeRemoveComplexType,
      executeModifyComplexType: typeExecutors.executeModifyComplexType,
      executeAddGroup: groupExecutors.executeAddGroup,
      executeRemoveGroup: groupExecutors.executeRemoveGroup,
      executeModifyGroup: groupExecutors.executeModifyGroup,
      executeAddAttributeGroup: groupExecutors.executeAddAttributeGroup,
      executeRemoveAttributeGroup: groupExecutors.executeRemoveAttributeGroup,
      executeModifyAttributeGroup: groupExecutors.executeModifyAttributeGroup,
      executeAddAnnotation: annotationExecutors.executeAddAnnotation,
      executeRemoveAnnotation: annotationExecutors.executeRemoveAnnotation,
      executeModifyAnnotation: annotationExecutors.executeModifyAnnotation,
      executeAddDocumentation: annotationExecutors.executeAddDocumentation,
      executeRemoveDocumentation: annotationExecutors.executeRemoveDocumentation,
      executeModifyDocumentation: annotationExecutors.executeModifyDocumentation,
      executeAddImport: schemaExecutors.executeAddImport,
      executeRemoveImport: schemaExecutors.executeRemoveImport,
      executeModifyImport: schemaExecutors.executeModifyImport,
      executeAddInclude: schemaExecutors.executeAddInclude,
      executeRemoveInclude: schemaExecutors.executeRemoveInclude,
      executeModifyInclude: schemaExecutors.executeModifyInclude,
    };
  }

  /**
   * Execute a validated command on the schema.
   * This method modifies the schema object in place.
   *
   * @param command - The command to execute
   * @param schemaObj - The schema object to modify
   * @throws Error if command type is unknown or execution fails
   */
  public execute(command: SchemaCommand, schemaObj: schema): void {
    // Type-specific execution - delegate to specialized executors
    switch (command.type) {
      case "addElement":
        this.executors.executeAddElement(command, schemaObj);
        break;
      case "removeElement":
        this.executors.executeRemoveElement(command, schemaObj);
        break;
      case "modifyElement":
        this.executors.executeModifyElement(command, schemaObj);
        break;
      case "addAttribute":
        this.executors.executeAddAttribute(command, schemaObj);
        break;
      case "removeAttribute":
        this.executors.executeRemoveAttribute(command, schemaObj);
        break;
      case "modifyAttribute":
        this.executors.executeModifyAttribute(command, schemaObj);
        break;
      case "addSimpleType":
        this.executors.executeAddSimpleType(command, schemaObj);
        break;
      case "removeSimpleType":
        this.executors.executeRemoveSimpleType(command, schemaObj);
        break;
      case "modifySimpleType":
        this.executors.executeModifySimpleType(command, schemaObj);
        break;
      case "addComplexType":
        this.executors.executeAddComplexType(command, schemaObj);
        break;
      case "removeComplexType":
        this.executors.executeRemoveComplexType(command, schemaObj);
        break;
      case "modifyComplexType":
        this.executors.executeModifyComplexType(command, schemaObj);
        break;
      case "addGroup":
        this.executors.executeAddGroup(command, schemaObj);
        break;
      case "removeGroup":
        this.executors.executeRemoveGroup(command, schemaObj);
        break;
      case "modifyGroup":
        this.executors.executeModifyGroup(command, schemaObj);
        break;
      case "addAttributeGroup":
        this.executors.executeAddAttributeGroup(command, schemaObj);
        break;
      case "removeAttributeGroup":
        this.executors.executeRemoveAttributeGroup(command, schemaObj);
        break;
      case "modifyAttributeGroup":
        this.executors.executeModifyAttributeGroup(command, schemaObj);
        break;
      case "addAnnotation":
        this.executors.executeAddAnnotation(command, schemaObj);
        break;
      case "removeAnnotation":
        this.executors.executeRemoveAnnotation(command, schemaObj);
        break;
      case "modifyAnnotation":
        this.executors.executeModifyAnnotation(command, schemaObj);
        break;
      case "addDocumentation":
        this.executors.executeAddDocumentation(command, schemaObj);
        break;
      case "removeDocumentation":
        this.executors.executeRemoveDocumentation(command, schemaObj);
        break;
      case "modifyDocumentation":
        this.executors.executeModifyDocumentation(command, schemaObj);
        break;
      case "addImport":
        this.executors.executeAddImport(command, schemaObj);
        break;
      case "removeImport":
        this.executors.executeRemoveImport(command, schemaObj);
        break;
      case "modifyImport":
        this.executors.executeModifyImport(command, schemaObj);
        break;
      case "addInclude":
        this.executors.executeAddInclude(command, schemaObj);
        break;
      case "removeInclude":
        this.executors.executeRemoveInclude(command, schemaObj);
        break;
      case "modifyInclude":
        this.executors.executeModifyInclude(command, schemaObj);
        break;
      default:
        throw new Error(
          `Unknown command type: ${
            (command as SchemaCommand).type ?? "undefined"
          }`
        );
    }
  }
}
