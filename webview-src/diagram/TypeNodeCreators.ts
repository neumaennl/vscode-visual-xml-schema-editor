/**
 * Functions for creating diagram nodes from XSD schema type definitions.
 * Handles creation of element, complex type, and simple type nodes.
 */

import { Diagram } from "./Diagram";
import { DiagramItem } from "./DiagramItem";
import { DiagramItemType } from "./DiagramTypes";
import {
  topLevelElement,
  topLevelComplexType,
  topLevelSimpleType,
} from "../../shared/types";
import {
  generateSchemaId,
  SchemaNodeType,
} from "../../shared/idStrategy";
import { extractDocumentation } from "./DiagramBuilderHelpers";

/**
 * Creates a diagram item node from an element definition in the schema.
 * Extracts element properties such as name, type, namespace, and occurrence constraints.
 * 
 * @param element - Element definition from schema
 * @param diagram - The diagram instance to associate with the item
 * @returns The created diagram item or null if element is invalid
 */
export function createElementNode(
  element: topLevelElement,
  diagram: Diagram
): DiagramItem | null {
  if (!element.name) {
    return null;
  }

  const item = new DiagramItem(
    generateSchemaId({
      nodeType: SchemaNodeType.Element,
      name: element.name.toString(),
    }),
    element.name.toString(),
    DiagramItemType.element,
    diagram
  );

  // Extract type information
  if (element.type_) {
    item.type = element.type_.toString();
  }

  // Extract documentation
  item.documentation = extractDocumentation(element.annotation) ?? "";

  // Note: topLevelElement does not have occurrence constraints (minOccurs/maxOccurs)
  // Those only exist on localElement within complex types

  return item;
}

/**
 * Creates a diagram item node from a complex type definition.
 * Extracts type properties such as name and documentation.
 * 
 * @param complexType - Complex type definition from schema
 * @param diagram - The diagram instance to associate with the item
 * @returns The created diagram item or null if type is invalid
 */
export function createComplexTypeNode(
  complexType: topLevelComplexType,
  diagram: Diagram
): DiagramItem | null {
  if (!complexType.name) {
    return null;
  }

  const item = new DiagramItem(
    generateSchemaId({
      nodeType: SchemaNodeType.ComplexType,
      name: complexType.name.toString(),
    }),
    complexType.name.toString(),
    DiagramItemType.type,
    diagram
  );

  item.type = "complexType";

  // Extract documentation
  item.documentation = extractDocumentation(complexType.annotation) ?? "";

  return item;
}

/**
 * Creates a diagram item node from a simple type definition.
 * Marks the item as having simple content.
 * 
 * @param simpleType - Simple type definition from schema
 * @param diagram - The diagram instance to associate with the item
 * @returns The created diagram item or null if type is invalid
 */
export function createSimpleTypeNode(
  simpleType: topLevelSimpleType,
  diagram: Diagram
): DiagramItem | null {
  if (!simpleType.name) {
    return null;
  }

  const item = new DiagramItem(
    generateSchemaId({
      nodeType: SchemaNodeType.SimpleType,
      name: simpleType.name.toString(),
    }),
    simpleType.name.toString(),
    DiagramItemType.type,
    diagram
  );

  item.type = "simpleType";
  item.isSimpleContent = true;

  // Extract documentation
  item.documentation = extractDocumentation(simpleType.annotation) ?? "";

  return item;
}
