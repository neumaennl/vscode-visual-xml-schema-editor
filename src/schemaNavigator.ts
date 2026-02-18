/**
 * SchemaNavigator: Utilities for navigating and locating nodes in a schema.
 * Provides functions to find schema nodes by their XPath-like IDs.
 */

import {
  schema,
  topLevelElement,
  localElement,
  topLevelComplexType,
  localComplexType,
  explicitGroup,
} from "../shared/types";
import { parseSchemaId, SchemaNodeType } from "../shared/idStrategy";
import { toArray } from "../shared/schemaUtils";

/**
 * Result of a node location operation.
 */
export interface NodeLocation {
  /** Whether the node was found */
  found: boolean;
  /** The parent container object (schema, complex type, sequence, etc.) */
  parent?: unknown;
  /** The type of the parent container */
  parentType?: string;
  /** Error message if not found */
  error?: string;
}

/**
 * Locates a node in the schema by its ID path.
 * Returns the parent container where new child nodes can be added.
 *
 * @param schemaObj - The schema object to search
 * @param nodeId - The XPath-like ID of the node
 * @returns Location information including the parent container
 *
 * @example
 * ```typescript
 * // Find the schema root (for adding top-level elements)
 * locateNodeById(schema, "schema") // Returns { found: true, parent: schema, parentType: "schema" }
 *
 * // Find a sequence within a complex type
 * locateNodeById(schema, "/complexType:PersonType/sequence[0]")
 * // Returns the sequence group where elements can be added
 * ```
 */
export function locateNodeById(
  schemaObj: schema,
  nodeId: string
): NodeLocation {
  // Special case: "schema" refers to the schema root
  if (nodeId === "schema" || nodeId === "/schema") {
    return {
      found: true,
      parent: schemaObj,
      parentType: "schema",
    };
  }

  try {
    const parsed = parseSchemaId(nodeId);
    
    // Navigate through the path segments
    const segments = parsed.path;
    let currentNode: unknown = schemaObj;
    let currentType = "schema";

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentInfo = parseSegment(segment);
      
      const result = navigateToChild(
        currentNode,
        currentType,
        segmentInfo
      );

      if (!result.found) {
        return {
          found: false,
          error: `Node not found at segment: ${segment}`,
        };
      }

      currentNode = result.node;
      currentType = result.nodeType ?? "";
    }

    return {
      found: true,
      parent: currentNode,
      parentType: currentType,
    };
  } catch (error) {
    return {
      found: false,
      error: `Failed to parse or locate node: ${(error as Error).message}`,
    };
  }
}

/**
 * Information parsed from a segment.
 */
interface SegmentInfo {
  nodeType: SchemaNodeType;
  name?: string;
  position?: number;
}

/**
 * Parse a path segment to extract node type, name, and position.
 */
function parseSegment(segment: string): SegmentInfo {
  // Check for position indicator [N]
  const positionMatch = segment.match(/^([^[]+)\[(\d+)\]$/);
  if (positionMatch) {
    const [, typeOrTypeName, posStr] = positionMatch;
    const position = parseInt(posStr, 10);

    // Check if it has a name (type:name format)
    const colonIndex = typeOrTypeName.indexOf(":");
    if (colonIndex > 0) {
      const nodeType = typeOrTypeName.substring(0, colonIndex) as SchemaNodeType;
      const name = typeOrTypeName.substring(colonIndex + 1);
      return { nodeType, name, position };
    } else {
      return { nodeType: typeOrTypeName as SchemaNodeType, position };
    }
  }

  // Check for type:name format
  const colonIndex = segment.indexOf(":");
  if (colonIndex > 0) {
    const nodeType = segment.substring(0, colonIndex) as SchemaNodeType;
    const name = segment.substring(colonIndex + 1);
    return { nodeType, name };
  }

  // Just a type
  return { nodeType: segment as SchemaNodeType };
}

/**
 * Navigate to a child node from a parent.
 */
function navigateToChild(
  parent: unknown,
  parentType: string,
  segmentInfo: SegmentInfo
): { found: boolean; node?: unknown; nodeType?: string } {
  const { nodeType, name, position } = segmentInfo;

  // Handle navigation based on parent type and target node type
  if (parentType === "schema") {
    return navigateFromSchema(parent as schema, nodeType, name, position);
  } else if (
    parentType === "topLevelElement" ||
    parentType === "localElement"
  ) {
    return navigateFromElement(
      parent as topLevelElement,
      nodeType,
      name,
      position
    );
  } else if (
    parentType === "topLevelComplexType" ||
    parentType === "localComplexType"
  ) {
    return navigateFromComplexType(
      parent as topLevelComplexType | localComplexType,
      nodeType,
      name,
      position
    );
  } else if (
    parentType === "sequence" ||
    parentType === "choice" ||
    parentType === "all"
  ) {
    return navigateFromGroup(parent as explicitGroup, nodeType, name, position);
  }

  return { found: false };
}

/**
 * Navigate from schema root to a child.
 */
function navigateFromSchema(
  schemaObj: schema,
  nodeType: SchemaNodeType,
  name?: string,
  position?: number
): { found: boolean; node?: unknown; nodeType?: string } {
  if (nodeType === SchemaNodeType.Element) {
    const elements = toArray(schemaObj.element);
    const element = findByNameOrPosition(elements, name, position);
    if (element) {
      return { found: true, node: element, nodeType: "topLevelElement" };
    }
  } else if (nodeType === SchemaNodeType.ComplexType) {
    const types = toArray(schemaObj.complexType);
    const type = findByNameOrPosition(types, name, position);
    if (type) {
      return { found: true, node: type, nodeType: "topLevelComplexType" };
    }
  } else if (nodeType === SchemaNodeType.SimpleType) {
    const types = toArray(schemaObj.simpleType);
    const type = findByNameOrPosition(types, name, position);
    if (type) {
      return { found: true, node: type, nodeType: "topLevelSimpleType" };
    }
  } else if (nodeType === SchemaNodeType.Group) {
    const groups = toArray(schemaObj.group);
    const group = findByNameOrPosition(groups, name, position);
    if (group) {
      return { found: true, node: group, nodeType: "namedGroup" };
    }
  }

  return { found: false };
}

/**
 * Navigate from an element to a child.
 */
function navigateFromElement(
  element: topLevelElement | localElement,
  nodeType: SchemaNodeType,
  _name?: string,
  _position?: number
): { found: boolean; node?: unknown; nodeType?: string } {
  if (nodeType === SchemaNodeType.AnonymousComplexType) {
    if (element.complexType) {
      return { found: true, node: element.complexType, nodeType: "localComplexType" };
    }
  }

  return { found: false };
}

/**
 * Navigate from a complex type to a child (sequence, choice, all).
 */
function navigateFromComplexType(
  complexType: topLevelComplexType | localComplexType,
  nodeType: SchemaNodeType,
  name?: string,
  position?: number
): { found: boolean; node?: unknown; nodeType?: string } {
  // Complex types can have sequence, choice, or all as children
  if (nodeType === SchemaNodeType.Group && name === "sequence") {
    if ((complexType as localComplexType).sequence) {
      return {
        found: true,
        node: (complexType as localComplexType).sequence,
        nodeType: "sequence",
      };
    }
  } else if (nodeType === SchemaNodeType.Group && name === "choice") {
    if ((complexType as localComplexType).choice) {
      return {
        found: true,
        node: (complexType as localComplexType).choice,
        nodeType: "choice",
      };
    }
  } else if (nodeType === SchemaNodeType.Group && name === "all") {
    if ((complexType as localComplexType).all) {
      return { found: true, node: (complexType as localComplexType).all, nodeType: "all" };
    }
  }

  // Handle direct navigation to sequence/choice/all without explicit "group:" prefix
  if (!name && !position) {
    if (nodeType === "sequence" as SchemaNodeType && (complexType as localComplexType).sequence) {
      return {
        found: true,
        node: (complexType as localComplexType).sequence,
        nodeType: "sequence",
      };
    } else if (nodeType === "choice" as SchemaNodeType && (complexType as localComplexType).choice) {
      return {
        found: true,
        node: (complexType as localComplexType).choice,
        nodeType: "choice",
      };
    } else if (nodeType === "all" as SchemaNodeType && (complexType as localComplexType).all) {
      return { found: true, node: (complexType as localComplexType).all, nodeType: "all" };
    }
  }

  return { found: false };
}

/**
 * Navigate from a group (sequence/choice/all) to a child element.
 */
function navigateFromGroup(
  group: explicitGroup,
  nodeType: SchemaNodeType,
  name?: string,
  position?: number
): { found: boolean; node?: unknown; nodeType?: string } {
  if (nodeType === SchemaNodeType.Element) {
    const elements = toArray(group.element);
    const element = findByNameOrPosition(elements, name, position);
    if (element) {
      return { found: true, node: element, nodeType: "localElement" };
    }
  }

  return { found: false };
}

/**
 * Find an item by name or position in an array.
 */
function findByNameOrPosition<T extends { name?: string }>(
  items: T[],
  name?: string,
  position?: number
): T | undefined {
  if (name !== undefined) {
    return items.find((item) => item.name === name);
  } else if (position !== undefined) {
    return items[position];
  }
  return undefined;
}
