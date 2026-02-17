/**
 * CommandExecutor: Executes validated commands on the schema.
 * Implements execution logic for all schema editing commands.
 * 
 * Note: All execution methods are stubbed for Phase 2 implementation.
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
  topLevelElement,
  localElement,
  annotationType,
  documentationType,
  explicitGroup,
  all,
} from "../shared/types";
import { toArray } from "../shared/schemaUtils";
import { locateNodeById } from "./schemaNavigator";

/**
 * Executes validated schema commands.
 */
export class CommandExecutor {
  /**
   * Execute a validated command on the schema.
   * This method modifies the schema object in place.
   *
   * @param command - The command to execute
   * @param schemaObj - The schema object to modify
   * @throws Error if command type is unknown or execution fails
   */
  public execute(command: SchemaCommand, schemaObj: schema): void {
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
          `Unknown command type: ${
            (command as SchemaCommand).type ?? "undefined"
          }`
        );
    }
  }

  // ===== Execution Methods (Stubs for Phase 2) =====

  private executeAddElement(
    command: AddElementCommand,
    schemaObj: schema
  ): void {
    const { parentId, elementName, elementType, minOccurs, maxOccurs, documentation } = command.payload;

    // Locate the parent node
    const location = locateNodeById(schemaObj, parentId);
    if (!location.found || !location.parent) {
      throw new Error(`Parent node not found: ${parentId}`);
    }

    // Create the new element
    const newElement = this.createNewElement(
      elementName,
      elementType,
      minOccurs,
      maxOccurs,
      documentation,
      location.parentType === "schema"
    );

    // Add the element to the appropriate parent
    this.addElementToParent(location.parent, location.parentType!, newElement);
  }

  /**
   * Creates a new element (either top-level or local).
   */
  private createNewElement(
    name: string,
    type: string,
    minOccurs?: number,
    maxOccurs?: number | "unbounded",
    documentation?: string,
    isTopLevel: boolean = false
  ): topLevelElement | localElement {
    const element: topLevelElement | localElement = isTopLevel
      ? new topLevelElement()
      : new localElement();

    element.name = name;
    element.type_ = type;

    // For local elements, set minOccurs and maxOccurs
    if (!isTopLevel) {
      const localElem = element as localElement;
      if (minOccurs !== undefined) {
        localElem.minOccurs = minOccurs;
      }
      if (maxOccurs !== undefined) {
        localElem.maxOccurs = maxOccurs;
      }
    }

    // Add documentation if provided
    if (documentation) {
      const annotation = new annotationType();
      const doc = new documentationType();
      doc.value = documentation;
      annotation.documentation = [doc];
      element.annotation = annotation;
    }

    return element;
  }

  /**
   * Adds an element to its parent container.
   */
  private addElementToParent(
    parent: unknown,
    parentType: string,
    element: topLevelElement | localElement
  ): void {
    if (parentType === "schema") {
      const schemaObj = parent as schema;
      const elements = toArray(schemaObj.element);
      elements.push(element as topLevelElement);
      schemaObj.element = elements;
    } else if (
      parentType === "sequence" ||
      parentType === "choice"
    ) {
      const group = parent as explicitGroup;
      const elements = toArray(group.element);
      elements.push(element as localElement);
      group.element = elements;
    } else if (parentType === "all") {
      const allGroup = parent as all;
      const elements = toArray(allGroup.element);
      // For 'all' groups, elements must use narrowMaxMin type
      // We need to cast the localElement to the correct type
      const allElement = element as localElement;
      elements.push(allElement as any);
      allGroup.element = elements as any;
    } else {
      throw new Error(`Cannot add element to parent of type: ${parentType}`);
    }
  }

  private executeRemoveElement(
    _command: RemoveElementCommand,
    _schemaObj: schema
  ): void {
    throw new Error("removeElement execution not yet implemented");
  }

  private executeModifyElement(
    _command: ModifyElementCommand,
    _schemaObj: schema
  ): void {
    throw new Error("modifyElement execution not yet implemented");
  }

  private executeAddAttribute(
    _command: AddAttributeCommand,
    _schemaObj: schema
  ): void {
    throw new Error("addAttribute execution not yet implemented");
  }

  private executeRemoveAttribute(
    _command: RemoveAttributeCommand,
    _schemaObj: schema
  ): void {
    throw new Error("removeAttribute execution not yet implemented");
  }

  private executeModifyAttribute(
    _command: ModifyAttributeCommand,
    _schemaObj: schema
  ): void {
    throw new Error("modifyAttribute execution not yet implemented");
  }

  private executeAddSimpleType(
    _command: AddSimpleTypeCommand,
    _schemaObj: schema
  ): void {
    throw new Error("addSimpleType execution not yet implemented");
  }

  private executeRemoveSimpleType(
    _command: RemoveSimpleTypeCommand,
    _schemaObj: schema
  ): void {
    throw new Error("removeSimpleType execution not yet implemented");
  }

  private executeModifySimpleType(
    _command: ModifySimpleTypeCommand,
    _schemaObj: schema
  ): void {
    throw new Error("modifySimpleType execution not yet implemented");
  }

  private executeAddComplexType(
    _command: AddComplexTypeCommand,
    _schemaObj: schema
  ): void {
    throw new Error("addComplexType execution not yet implemented");
  }

  private executeRemoveComplexType(
    _command: RemoveComplexTypeCommand,
    _schemaObj: schema
  ): void {
    throw new Error("removeComplexType execution not yet implemented");
  }

  private executeModifyComplexType(
    _command: ModifyComplexTypeCommand,
    _schemaObj: schema
  ): void {
    throw new Error("modifyComplexType execution not yet implemented");
  }

  private executeAddGroup(
    _command: AddGroupCommand,
    _schemaObj: schema
  ): void {
    throw new Error("addGroup execution not yet implemented");
  }

  private executeRemoveGroup(
    _command: RemoveGroupCommand,
    _schemaObj: schema
  ): void {
    throw new Error("removeGroup execution not yet implemented");
  }

  private executeModifyGroup(
    _command: ModifyGroupCommand,
    _schemaObj: schema
  ): void {
    throw new Error("modifyGroup execution not yet implemented");
  }

  private executeAddAttributeGroup(
    _command: AddAttributeGroupCommand,
    _schemaObj: schema
  ): void {
    throw new Error("addAttributeGroup execution not yet implemented");
  }

  private executeRemoveAttributeGroup(
    _command: RemoveAttributeGroupCommand,
    _schemaObj: schema
  ): void {
    throw new Error("removeAttributeGroup execution not yet implemented");
  }

  private executeModifyAttributeGroup(
    _command: ModifyAttributeGroupCommand,
    _schemaObj: schema
  ): void {
    throw new Error("modifyAttributeGroup execution not yet implemented");
  }

  private executeAddAnnotation(
    _command: AddAnnotationCommand,
    _schemaObj: schema
  ): void {
    throw new Error("addAnnotation execution not yet implemented");
  }

  private executeRemoveAnnotation(
    _command: RemoveAnnotationCommand,
    _schemaObj: schema
  ): void {
    throw new Error("removeAnnotation execution not yet implemented");
  }

  private executeModifyAnnotation(
    _command: ModifyAnnotationCommand,
    _schemaObj: schema
  ): void {
    throw new Error("modifyAnnotation execution not yet implemented");
  }

  private executeAddDocumentation(
    _command: AddDocumentationCommand,
    _schemaObj: schema
  ): void {
    throw new Error("addDocumentation execution not yet implemented");
  }

  private executeRemoveDocumentation(
    _command: RemoveDocumentationCommand,
    _schemaObj: schema
  ): void {
    throw new Error("removeDocumentation execution not yet implemented");
  }

  private executeModifyDocumentation(
    _command: ModifyDocumentationCommand,
    _schemaObj: schema
  ): void {
    throw new Error("modifyDocumentation execution not yet implemented");
  }

  private executeAddImport(
    _command: AddImportCommand,
    _schemaObj: schema
  ): void {
    throw new Error("addImport execution not yet implemented");
  }

  private executeRemoveImport(
    _command: RemoveImportCommand,
    _schemaObj: schema
  ): void {
    throw new Error("removeImport execution not yet implemented");
  }

  private executeModifyImport(
    _command: ModifyImportCommand,
    _schemaObj: schema
  ): void {
    throw new Error("modifyImport execution not yet implemented");
  }

  private executeAddInclude(
    _command: AddIncludeCommand,
    _schemaObj: schema
  ): void {
    throw new Error("addInclude execution not yet implemented");
  }

  private executeRemoveInclude(
    _command: RemoveIncludeCommand,
    _schemaObj: schema
  ): void {
    throw new Error("removeInclude execution not yet implemented");
  }

  private executeModifyInclude(
    _command: ModifyIncludeCommand,
    _schemaObj: schema
  ): void {
    throw new Error("modifyInclude execution not yet implemented");
  }
}
