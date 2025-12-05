/**
 * DiagramBuilder creates a Diagram from an unmarshalled XSD schema.
 * Ported and adapted from XSD Diagram project.
 * 
 * This class orchestrates the building process by delegating to specialized modules:
 * - TypeNodeCreators: Creates diagram nodes from schema type definitions
 * - SchemaProcessors: Processes schema structures and builds hierarchies
 * - DiagramBuilderHelpers: Provides utility functions for common operations
 */

import { Diagram } from "./Diagram";
import { DiagramItem } from "./DiagramItem";
import { DiagramItemType } from "./DiagramTypes";
import { schema } from "../../shared/types";
import {
  generateId,
  resetIdCounter,
} from "./DiagramBuilderHelpers";
import {
  createElementNode,
  createComplexTypeNode,
  createSimpleTypeNode,
} from "./TypeNodeCreators";
import {
  processChildCollection,
  processAnonymousComplexType,
  processAnonymousSimpleType,
  processComplexType,
  processRestriction,
} from "./SchemaProcessors";

/**
 * Builds diagram visualizations from XSD schema objects.
 * Coordinates the parsing and transformation of schema structures into diagram items.
 */
export class DiagramBuilder {
  private diagram: Diagram;
  private elementMap: Map<string, DiagramItem> = new Map();

  /**
   * Creates a new DiagramBuilder.
   */
  constructor() {
    this.diagram = new Diagram();
  }

  /**
   * Builds a diagram from a schema object.
   * Parses the schema structure and creates a hierarchical diagram representation.
   * 
   * @param schemaObj - The XSD schema object to build from
   * @returns The constructed diagram with all schema elements visualized
   */
  public buildFromSchema(schemaObj: schema | any): Diagram {
    this.diagram = new Diagram();
    this.elementMap.clear();
    resetIdCounter();

    console.log("DiagramBuilder - Building from schema:", schemaObj);

    // Create a root node representing the schema
    const targetNs = schemaObj?.targetNamespace?.toString() || "no namespace";
    const schemaNode = new DiagramItem(
      generateId(),
      `Schema: ${targetNs}`,
      DiagramItemType.element,
      this.diagram
    );

    // Process schema child elements
    processChildCollection(
      schemaNode,
      (schemaObj as any).element,
      (elem) => this.createElementNodeWithProcessing(elem)
    );

    processChildCollection(
      schemaNode,
      (schemaObj as any).complexType,
      (ct) => this.createComplexTypeNodeWithProcessing(ct)
    );

    processChildCollection(
      schemaNode,
      (schemaObj as any).simpleType,
      (st) => this.createSimpleTypeNodeWithProcessing(st)
    );

    // If no children were added, add a placeholder
    if (schemaNode.childElements.length === 0) {
      const placeholder = new DiagramItem(
        generateId(),
        "No elements found",
        DiagramItemType.element,
        this.diagram
      );
      schemaNode.addChild(placeholder);
    }

    this.diagram.addRootElement(schemaNode);
    return this.diagram;
  }

  /**
   * Creates a diagram item node from an element definition and processes anonymous types.
   * Wrapper around createElementNode that also handles inline type definitions.
   * 
   * @param element - Element definition from schema
   * @returns The created diagram item or null if element is invalid
   */
  private createElementNodeWithProcessing(element: any): DiagramItem | null {
    const item = createElementNode(element, this.diagram);
    if (!item) {
      return null;
    }

    // Process anonymous inline complex type
    if (element.complexType) {
      processAnonymousComplexType(item, element.complexType);
    }

    // Process anonymous inline simple type
    if (element.simpleType) {
      processAnonymousSimpleType(item, element.simpleType);
    }

    return item;
  }

  /**
   * Creates a diagram item node from a complex type definition and processes its structure.
   * Wrapper around createComplexTypeNode that also processes the type's content.
   * 
   * @param complexType - Complex type definition from schema
   * @returns The created diagram item or null if type is invalid
   */
  private createComplexTypeNodeWithProcessing(complexType: any): DiagramItem | null {
    const item = createComplexTypeNode(complexType, this.diagram);
    if (!item) {
      return null;
    }

    processComplexType(item, complexType);

    return item;
  }

  /**
   * Creates a diagram item node from a simple type definition and processes restrictions.
   * Wrapper around createSimpleTypeNode that also processes restrictions.
   * 
   * @param simpleType - Simple type definition from schema
   * @returns The created diagram item or null if type is invalid
   */
  private createSimpleTypeNodeWithProcessing(simpleType: any): DiagramItem | null {
    const item = createSimpleTypeNode(simpleType, this.diagram);
    if (!item) {
      return null;
    }

    // Process restriction/list/union if present to extract base type
    if (simpleType.restriction) {
      processRestriction(item, simpleType.restriction);
    }

    return item;
  }
}
