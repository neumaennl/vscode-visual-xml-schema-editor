/**
 * SchemaNavigator: Utilities for navigating and locating nodes in a schema.
 * Provides functions to find schema nodes by their XPath-like IDs.
 */

import type {
  schema,
  topLevelComplexType,
  localComplexType,
  namedGroup,
  explicitGroup,
  simpleExplicitGroup,
  all as allGroup,
  allType,
  attribute,
  localSimpleType,
} from "../shared/types.js";
import { parseSchemaId, SchemaNodeType, toNodeType } from "../shared/idStrategy.js";
import { getContentContainer, isSchemaRoot } from "../shared/schemaUtils.js";

/**
 * Result of a node location operation: the node and its type if it was found, otherwise an error.
 * The node is called `parent` because callers usually add children to it.
 */
export type NodeLocation =
  | {
      found: true;
      /** The node: the schema, a complex type, a sequence and so on */
      parent: unknown;
      /** The type of the node, for example `topLevelComplexType` or `sequence` */
      parentType: string;
    }
  | {
      found: false;
      /** Why the node was not found */
      error: string;
    };

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
 * locateNodeById(schema, "/schema") // Returns { found: true, parent: schema, parentType: "schema" }
 *
 * // Find a sequence within a complex type
 * locateNodeById(schema, "/complexType:PersonType/group:sequence[0]")
 * // Returns the sequence group where elements can be added
 * ```
 */
export function locateNodeById(
  schemaObj: schema,
  nodeId: string
): NodeLocation {
  // Special case: the canonical schema root ID refers to the schema root
  if (isSchemaRoot(nodeId)) {
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
    // eslint-disable-next-line no-restricted-syntax -- `currentNode` is a heterogeneous traversal variable reassigned to different child-node types; `unknown` is the correct annotation here
    let currentNode: unknown = schemaObj;
    let currentType = "schema";

    for (const segment of segments) {
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
      currentType = result.nodeType;
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
 * Result of navigating from a node to one of its children: the child and its type, if found.
 */
type NavigationResult = { found: true; node: unknown; nodeType: string } | { found: false };

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
  const positionMatch = /^([^[]+)\[(\d+)\]$/.exec(segment);
  if (positionMatch) {
    const [, typeOrTypeName, posStr] = positionMatch;
    const position = parseInt(posStr, 10);

    // Check if it has a name (type:name format)
    const colonIndex = typeOrTypeName.indexOf(":");
    if (colonIndex > 0) {
      const nodeType = toNodeType(typeOrTypeName.substring(0, colonIndex));
      const name = typeOrTypeName.substring(colonIndex + 1);
      return { nodeType, name, position };
    } else {
      return { nodeType: toNodeType(typeOrTypeName), position };
    }
  }

  // Check for type:name format
  const colonIndex = segment.indexOf(":");
  if (colonIndex > 0) {
    const nodeType = toNodeType(segment.substring(0, colonIndex));
    const name = segment.substring(colonIndex + 1);
    return { nodeType, name };
  }

  // Just a type
  return { nodeType: toNodeType(segment) };
}

/**
 * Navigate to a child node from a parent.
 */
function navigateToChild(
  parent: unknown,
  parentType: string,
  segmentInfo: SegmentInfo
): NavigationResult {
  const { nodeType, name, position } = segmentInfo;

  // Handle navigation based on parent type and target node type
  if (parentType === "schema") {
    return navigateFromSchema(parent as schema, nodeType, name, position);
  } else if (
    parentType === "topLevelElement" ||
    parentType === "localElement" ||
    parentType === "topLevelAttribute" ||
    parentType === "attribute"
  ) {
    return navigateToAnonymousType(parent as AnonymousTypeHolder, nodeType);
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
  } else if (parentType === "namedGroup") {
    return navigateFromNamedGroup(parent as namedGroup, nodeType, name, position);
  } else if (
    parentType === "sequence" ||
    parentType === "choice" ||
    parentType === "all"
  ) {
    return navigateFromGroup(parent as explicitGroup, nodeType, name, position);
  }

  return { found: false };
}

/** The property of the schema that holds each kind of top-level component, and the type of the node. */
const TOP_LEVEL_KINDS: Partial<
  Record<SchemaNodeType, { property: "element" | "complexType" | "simpleType" | "group" | "attributeGroup" | "attribute"; nodeType: string }>
> = {
  [SchemaNodeType.Element]: { property: "element", nodeType: "topLevelElement" },
  [SchemaNodeType.ComplexType]: { property: "complexType", nodeType: "topLevelComplexType" },
  [SchemaNodeType.SimpleType]: { property: "simpleType", nodeType: "topLevelSimpleType" },
  [SchemaNodeType.Group]: { property: "group", nodeType: "namedGroup" },
  [SchemaNodeType.AttributeGroup]: { property: "attributeGroup", nodeType: "namedAttributeGroup" },
  [SchemaNodeType.Attribute]: { property: "attribute", nodeType: "topLevelAttribute" },
};

/**
 * Navigate from schema root to a child.
 */
function navigateFromSchema(
  schemaObj: schema,
  nodeType: SchemaNodeType,
  name?: string,
  position?: number
): NavigationResult {
  const kind = TOP_LEVEL_KINDS[nodeType];
  if (!kind) {
    return { found: false };
  }
  const components: Array<{ name?: string }> = schemaObj[kind.property] ?? [];
  const node = findByNameOrPosition(components, name, position);
  return node ? { found: true, node, nodeType: kind.nodeType } : { found: false };
}

/** An element or attribute, which can hold an anonymous type; attributes only hold simple types. */
interface AnonymousTypeHolder { complexType?: localComplexType; simpleType?: localSimpleType }

/**
 * Navigate from an element or attribute to its anonymous complexType or simpleType.
 */
function navigateToAnonymousType(holder: AnonymousTypeHolder, nodeType: SchemaNodeType): NavigationResult {
  if (nodeType === SchemaNodeType.AnonymousComplexType && holder.complexType) {
    return { found: true, node: holder.complexType, nodeType: "localComplexType" };
  }
  if (nodeType === SchemaNodeType.AnonymousSimpleType && holder.simpleType) {
    return { found: true, node: holder.simpleType, nodeType: "localSimpleType" };
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
): NavigationResult {
  // Complex types can have sequence, choice, or all as children
  if (nodeType === SchemaNodeType.Group && name === "sequence") {
    const sequence = resolveComplexTypeGroup(complexType, "sequence");
    if (sequence) {
      return {
        found: true,
        node: sequence,
        nodeType: "sequence",
      };
    }
  } else if (nodeType === SchemaNodeType.Group && name === "choice") {
    const choice = resolveComplexTypeGroup(complexType, "choice");
    if (choice) {
      return {
        found: true,
        node: choice,
        nodeType: "choice",
      };
    }
  } else if (nodeType === SchemaNodeType.Group && name === "all") {
    const all = resolveComplexTypeGroup(complexType, "all");
    if (all) {
      return { found: true, node: all, nodeType: "all" };
    }
  }

  if (nodeType === SchemaNodeType.Attribute) {
    const attrs = getContentContainer<ComplexTypeContent>(complexType).attribute ?? [];
    const attr = findByNameOrPosition(attrs, name, position);
    if (attr) {
      return { found: true, node: attr, nodeType: "attribute" };
    }
  }

  return { found: false };
}

/**
 * The content that a complex type, or the extension or restriction of its content, can hold. An
 * extension or restriction of simple content has attributes but no compositors.
 */
interface ComplexTypeContent {
  sequence?: explicitGroup;
  choice?: explicitGroup;
  all?: allGroup;
  attribute?: attribute[];
}

/**
 * Returns the compositor of the given kind of a complex type, which lives in the extension or restriction
 * of its content if it has complex content (see {@link getContentContainer}).
 */
function resolveComplexTypeGroup(
  complexType: topLevelComplexType | localComplexType,
  groupKind: "sequence" | "choice" | "all"
): explicitGroup | allGroup | undefined {
  return getContentContainer<ComplexTypeContent>(complexType)[groupKind];
}

function navigateFromNamedGroup(
  group: namedGroup,
  nodeType: SchemaNodeType,
  name?: string,
  _position?: number
): NavigationResult {
  if (nodeType === SchemaNodeType.Group && name === "sequence" && group.sequence) {
    return { found: true, node: group.sequence, nodeType: "sequence" };
  }
  if (nodeType === SchemaNodeType.Group && name === "choice" && group.choice) {
    return { found: true, node: group.choice, nodeType: "choice" };
  }
  if (nodeType === SchemaNodeType.Group && name === "all" && group.all) {
    return { found: true, node: group.all, nodeType: "all" };
  }

  return { found: false };
}

/**
 * Navigate from a group (sequence/choice/all) to a child element.
 */
function navigateFromGroup(
  group: explicitGroup | simpleExplicitGroup | allGroup | allType,
  nodeType: SchemaNodeType,
  name?: string,
  position?: number
): NavigationResult {
  if (nodeType === SchemaNodeType.Element) {
    const elements: Array<{ name?: string; ref?: string }> = group.element ?? [];
    const element = findByNameOrPosition(elements, name, position);
    if (element) {
      return { found: true, node: element, nodeType: "localElement" };
    }
  }

  if (nodeType === SchemaNodeType.Group && name === "choice") {
    const choice = ((group as { choice?: explicitGroup[] }).choice ?? [])[position ?? 0] as explicitGroup | undefined;
    if (choice) {
      return { found: true, node: choice, nodeType: "choice" };
    }
  }

  if (nodeType === SchemaNodeType.Group && name === "sequence") {
    const sequence = ((group as { sequence?: explicitGroup[] }).sequence ?? [])[position ?? 0] as explicitGroup | undefined;
    if (sequence) {
      return { found: true, node: sequence, nodeType: "sequence" };
    }
  }

  return { found: false };
}

/**
 * Find an item by name or position in an array.
 * Also matches items whose `ref` equals the given name, enabling navigation to reference nodes.
 */
function findByNameOrPosition<T extends { name?: string; ref?: string }>(
  items: T[],
  name?: string,
  position?: number
): T | undefined {
  if (name !== undefined) {
    return items.find((item) => item.name === name || item.ref === name);
  } else if (position !== undefined) {
    return items[position];
  }
  return undefined;
}
