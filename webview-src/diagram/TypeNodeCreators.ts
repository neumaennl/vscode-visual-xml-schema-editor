/**
 * Functions for creating diagram nodes from XSD schema type definitions.
 * Handles creation of element, complex type, and simple type nodes.
 */

import type { Diagram } from "./Diagram";
import { DiagramItem } from "./DiagramItem";
import { DiagramItemType } from "./DiagramTypes";
import type {
  annotationType,
  topLevelElement,
  topLevelComplexType,
  topLevelSimpleType,
} from "../../shared/types";
import {
  generateSchemaId,
  SchemaNodeType,
} from "../../shared/idStrategy";
import {
  extractDocumentation,
  extractDocumentationAnnotations,
} from "./DiagramBuilderHelpers";

/**
 * Creates the diagram item of a named top-level component, with its ID, name and documentation.
 *
 * @param component - The component
 * @param nodeType - The node type of the component in its ID
 * @param itemType - The type of the diagram item
 * @param diagram - The diagram instance to associate with the item
 * @returns The created diagram item, or null if the component has no name
 */
export function createTopLevelNode(
  component: { name?: string; annotation?: annotationType },
  nodeType: SchemaNodeType,
  itemType: DiagramItemType,
  diagram: Diagram
): DiagramItem | null {
  if (!component.name) {
    return null;
  }
  const name = component.name;
  const item = new DiagramItem(generateSchemaId({ nodeType, name }), name, itemType, diagram);
  item.documentationAnnotations = extractDocumentationAnnotations(item.id, component.annotation);
  item.documentation = extractDocumentation(component.annotation) ?? "";
  return item;
}

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
  const item = createTopLevelNode(element, SchemaNodeType.Element, DiagramItemType.element, diagram);
  if (!item) {
    return null;
  }

  // Extract type information
  if (element.type_) {
    item.type = element.type_;
  }

  // Extract element-level boolean and value constraints
  item.isNillable = element.nillable === true;
  item.isAbstract = element.abstract === true;
  item.elementDefault = element.default_?.toString();
  item.elementFixed = element.fixed?.toString();

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
  const item = createTopLevelNode(complexType, SchemaNodeType.ComplexType, DiagramItemType.type, diagram);
  return item && Object.assign(item, {
    type: "complexType",
    isAbstract: complexType.abstract === true,
    isMixed: complexType.mixed === true,
  });
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
  const item = createTopLevelNode(simpleType, SchemaNodeType.SimpleType, DiagramItemType.type, diagram);
  return item && Object.assign(item, { type: "simpleType", isSimpleContent: true });
}
