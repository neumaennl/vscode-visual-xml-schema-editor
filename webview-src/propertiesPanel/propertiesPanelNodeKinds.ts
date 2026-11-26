/**
 * What kind of schema node a diagram item stands for, read from its ID: the node type, the label of the
 * kind, and what the properties panel may change on it.
 */

import { SCHEMA_ROOT_ID, isCompositorNodeType, parseSchemaId, SchemaNodeType } from "../../shared/idStrategy";
import type { DiagramItem } from "../diagram";
import { DiagramItemType } from "../diagram/DiagramTypes";

/**
 * Determines the schema node type represented by a diagram item.
 *
 * @param node - Diagram item to inspect
 * @returns The resolved schema node type or null when it cannot be inferred
 */
export function getNodeType(node: DiagramItem): SchemaNodeType | null {
  if (node.id === SCHEMA_ROOT_ID) {
    return SchemaNodeType.Schema;
  }
  try {
    return parseSchemaId(node.id).nodeType;
  } catch {
    switch (node.itemType) {
      case DiagramItemType.element:
        return SchemaNodeType.Element;
      case DiagramItemType.type:
        return SchemaNodeType.SimpleType;
      case DiagramItemType.group:
        return SchemaNodeType.Group;
      default:
        return null;
    }
  }
}

/**
 * Resolves a user-facing label for the selected node type.
 *
 * @param node - Diagram item to inspect
 * @returns A short node-type label for the properties panel header
 */
export function getNodeTypeLabel(node: DiagramItem): string {
  const nodeType = getNodeType(node);
  switch (nodeType) {
    case SchemaNodeType.Schema:
      return "Schema";
    case SchemaNodeType.Element:
      return "Element";
    case SchemaNodeType.ComplexType:
      return "Complex Type";
    case SchemaNodeType.SimpleType:
      return "Simple Type";
    case SchemaNodeType.Group:
      return "Group";
    case SchemaNodeType.GroupRef:
      return "Group Reference";
    case SchemaNodeType.Sequence:
    case SchemaNodeType.Choice:
    case SchemaNodeType.All:
      return "Compositor";
    default:
      return node.itemType;
  }
}

/**
 * Returns whether the given diagram item represents a top-level element declaration.
 *
 * @param node - Diagram item to inspect
 * @returns True when the node is a top-level element
 */
export function isTopLevelElement(node: DiagramItem): boolean {
  try {
    const parsed = parseSchemaId(node.id);
    return parsed.nodeType === SchemaNodeType.Element && !parsed.parentId;
  } catch {
    return false;
  }
}

/**
 * Returns whether occurrence fields should be editable for the given node.
 *
 * @param node - Diagram item to inspect
 * @returns True when `minOccurs`/`maxOccurs` may be edited
 */
export function canEditCardinality(node: DiagramItem): boolean {
  const nodeType = getNodeType(node);
  if (nodeType === SchemaNodeType.Schema || isTopLevelElement(node)) {
    return false;
  }
  if (nodeType === SchemaNodeType.Element || node.itemType === DiagramItemType.element) {
    return true;
  }
  if (nodeType === SchemaNodeType.GroupRef) {
    return true;
  }
  if (nodeType !== null && isCompositorNodeType(nodeType)) {
    // XML Schema allows no occurrences on the compositor of a group definition
    const { parentId } = parseSchemaId(node.id);
    return parentId !== undefined && parseSchemaId(parentId).nodeType !== SchemaNodeType.Group;
  }
  return false;
}
