/**
 * Creates the diagram items of the named top-level components: elements, complex types, simple types and
 * group definitions.
 */

import type { Diagram } from "./Diagram";
import { DiagramItem } from "./DiagramItem";
import type { DiagramItemType } from "./DiagramTypes";
import type { namedGroup, topLevelElement, topLevelComplexType, topLevelSimpleType } from "../../shared/types";
import type { SchemaNodeType } from "../../shared/idStrategy";
import { generateSchemaId } from "../../shared/idStrategy";

/**
 * Creates the diagram item of a named top-level component, with its ID, name, schema object and
 * documentation.
 *
 * @param component - The component
 * @param nodeType - The node type of the component in its ID
 * @param itemType - The type of the diagram item
 * @param diagram - The diagram instance to associate with the item
 * @returns The created diagram item, or null if the component has no name
 */
export function createTopLevelNode(
  component: topLevelElement | topLevelComplexType | topLevelSimpleType | namedGroup,
  nodeType: SchemaNodeType,
  itemType: DiagramItemType,
  diagram: Diagram
): DiagramItem | null {
  if (!component.name) {
    return null;
  }
  const name = component.name;
  const item = new DiagramItem(generateSchemaId({ nodeType, name }), name, itemType, component, diagram);
  item.nodeType = nodeType;
  return item;
}
