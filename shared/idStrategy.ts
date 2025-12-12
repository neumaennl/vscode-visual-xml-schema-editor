/**
 * ID Strategy for schema elements.
 * Provides a robust identifier system for mapping between webview DiagramItems
 * and extension schema nodes using XPath-like identifiers.
 *
 * Design Goals:
 * 1. Stable identifiers that survive schema re-parsing
 * 2. Human-readable for debugging
 * 3. Unique within a schema document
 * 4. Support bidirectional mapping (webview ↔ extension)
 * 5. Handle elements without explicit IDs
 */

/**
 * Type of schema node for ID generation.
 */
export enum SchemaNodeType {
  /** Root schema node */
  Schema = "schema",
  /** Top-level element definition */
  Element = "element",
  /** Top-level complex type definition */
  ComplexType = "complexType",
  /** Top-level simple type definition */
  SimpleType = "simpleType",
  /** Element group definition */
  Group = "group",
  /** Attribute group definition */
  AttributeGroup = "attributeGroup",
  /** Attribute definition */
  Attribute = "attribute",
  /** Anonymous complex type within an element */
  AnonymousComplexType = "anonymousComplexType",
  /** Anonymous simple type within an element */
  AnonymousSimpleType = "anonymousSimpleType",
  /** Import statement */
  Import = "import",
  /** Include statement */
  Include = "include",
  /** Annotation */
  Annotation = "annotation",
  /** Documentation */
  Documentation = "documentation",
}

/**
 * Parameters for generating a schema node ID.
 */
export interface IdGenerationParams {
  /** Type of the schema node */
  nodeType: SchemaNodeType;
  /** Name of the node (if it has one) */
  name?: string;
  /** Parent node ID (for hierarchical nodes) */
  parentId?: string;
  /** Position among siblings (for nodes without names) */
  position?: number;
  /** Namespace (for qualified names) */
  namespace?: string;
}

/**
 * Parsed schema node ID.
 */
export interface ParsedSchemaId {
  /** Type of the schema node */
  nodeType: SchemaNodeType;
  /** Name of the node */
  name?: string;
  /** Parent ID */
  parentId?: string;
  /** Position in parent */
  position?: number;
  /** Namespace */
  namespace?: string;
  /** Full path segments */
  path: string[];
}

/**
 * Generates a unique, stable ID for a schema node.
 *
 * ID Format: XPath-like path structure
 * - Top-level named elements: /element:elementName
 * - Top-level types: /complexType:typeName or /simpleType:typeName
 * - Child elements: /element:parent/element:child[position]
 * - Anonymous types: /element:parent/anonymousComplexType[0]
 * - With namespace: /element:{namespace}elementName
 *
 * @param params - Parameters for ID generation
 * @returns Generated unique ID string
 *
 * @example
 * ```typescript
 * // Top-level element
 * generateSchemaId({ nodeType: SchemaNodeType.Element, name: "person" })
 * // Returns: "/element:person"
 *
 * // Child element with position
 * generateSchemaId({
 *   nodeType: SchemaNodeType.Element,
 *   name: "address",
 *   parentId: "/element:person",
 *   position: 0
 * })
 * // Returns: "/element:person/element:address[0]"
 *
 * // Anonymous complex type
 * generateSchemaId({
 *   nodeType: SchemaNodeType.AnonymousComplexType,
 *   parentId: "/element:person",
 *   position: 0
 * })
 * // Returns: "/element:person/anonymousComplexType[0]"
 * ```
 */
export function generateSchemaId(params: IdGenerationParams): string {
  const { nodeType, name, parentId, position, namespace } = params;

  // Build the node identifier
  let nodeId: string;
  if (name) {
    // Include namespace if provided
    const qualifiedName = namespace ? `{${namespace}}${name}` : name;
    nodeId = `${nodeType}:${qualifiedName}`;
    // Add position if provided (for disambiguation)
    if (position !== undefined) {
      nodeId = `${nodeId}[${position}]`;
    }
  } else if (position !== undefined) {
    // For unnamed nodes, use position
    nodeId = `${nodeType}[${position}]`;
  } else {
    // For nodes without name or position, use just the type
    nodeId = nodeType;
  }

  // Build the full path
  if (parentId) {
    // Ensure parent ID starts with /
    const cleanParentId = parentId.startsWith("/") ? parentId : `/${parentId}`;
    return `${cleanParentId}/${nodeId}`;
  } else {
    // Top-level node
    return `/${nodeId}`;
  }
}

/**
 * Parses a schema ID string into its components.
 *
 * @param id - The ID string to parse
 * @returns Parsed ID components
 * @throws {Error} If the ID format is invalid
 *
 * @example
 * ```typescript
 * parseSchemaId("/element:person/element:address[0]")
 * // Returns: {
 * //   nodeType: SchemaNodeType.Element,
 * //   name: "address",
 * //   position: 0,
 * //   parentId: "/element:person",
 * //   path: ["element:person", "element:address[0]"]
 * // }
 * ```
 */
export function parseSchemaId(id: string): ParsedSchemaId {
  if (!id.startsWith("/")) {
    throw new Error(`Invalid schema ID format: must start with /: ${id}`);
  }

  // Remove leading slash and split by / (but not / inside {...})
  const segments = splitPath(id.substring(1));
  const path = segments;

  // Parse the last segment (the actual node)
  const lastSegment = segments[segments.length - 1];
  const nodeInfo = parseNodeSegment(lastSegment);

  // Build parent ID if there are parent segments
  const parentId =
    segments.length > 1 ? `/${segments.slice(0, -1).join("/")}` : undefined;

  return {
    ...nodeInfo,
    parentId,
    path,
  };
}

/**
 * Splits a path string by '/' but not when '/' is inside namespace braces {...}.
 *
 * @param path - The path to split
 * @returns Array of path segments
 */
function splitPath(path: string): string[] {
  const segments: string[] = [];
  let currentSegment = "";
  let inBraces = false;

  for (let i = 0; i < path.length; i++) {
    const char = path[i];
    if (char === "{") {
      inBraces = true;
      currentSegment += char;
    } else if (char === "}") {
      inBraces = false;
      currentSegment += char;
    } else if (char === "/" && !inBraces) {
      if (currentSegment) {
        segments.push(currentSegment);
        currentSegment = "";
      }
    } else {
      currentSegment += char;
    }
  }

  if (currentSegment) {
    segments.push(currentSegment);
  }

  return segments;
}

/**
 * Parses a single node segment from an ID path.
 *
 * @param segment - The segment to parse (e.g., "element:person" or "anonymousComplexType[0]")
 * @returns Parsed node information
 */
function parseNodeSegment(segment: string): {
  nodeType: SchemaNodeType;
  name?: string;
  namespace?: string;
  position?: number;
} {
  // Check for position indicator [N]
  const positionMatch = segment.match(/^([^[]+)\[(\d+)\]$/);
  if (positionMatch) {
    const [, typeOrTypeName, posStr] = positionMatch;
    const position = parseInt(posStr, 10);

    // Check if it has a name (type:name format)
    // Need to be careful because namespace URLs can contain ':'
    const colonIndex = findTypeNameSeparator(typeOrTypeName);
    if (colonIndex > 0) {
      const nodeType = typeOrTypeName.substring(
        0,
        colonIndex
      ) as SchemaNodeType;
      const nameWithNs = typeOrTypeName.substring(colonIndex + 1);
      const { name, namespace } = parseQualifiedName(nameWithNs);
      return { nodeType, name, namespace, position };
    } else {
      return { nodeType: typeOrTypeName as SchemaNodeType, position };
    }
  }

  // Check for type:name format
  const colonIndex = findTypeNameSeparator(segment);
  if (colonIndex > 0) {
    const nodeType = segment.substring(0, colonIndex) as SchemaNodeType;
    const nameWithNs = segment.substring(colonIndex + 1);
    const { name, namespace } = parseQualifiedName(nameWithNs);
    return { nodeType, name, namespace };
  }

  // Just a type
  return { nodeType: segment as SchemaNodeType };
}

/**
 * Finds the colon that separates the type from the name.
 * Handles namespaced names like "element:{http://...}name" correctly.
 *
 * @param segment - The segment to search
 * @returns Index of the separator colon, or -1 if not found
 */
function findTypeNameSeparator(segment: string): number {
  // Look for patterns like "element:{namespace}name" or "element:name"
  // The first colon that's not inside {...} is the separator
  let inBraces = false;
  for (let i = 0; i < segment.length; i++) {
    if (segment[i] === "{") {
      inBraces = true;
    } else if (segment[i] === "}") {
      inBraces = false;
    } else if (segment[i] === ":" && !inBraces) {
      return i;
    }
  }
  return -1;
}

/**
 * Parses a qualified name that may include a namespace.
 *
 * @param qualifiedName - Name potentially in {namespace}localName format
 * @returns Parsed name and namespace
 */
function parseQualifiedName(qualifiedName: string): {
  name: string;
  namespace?: string;
} {
  const nsMatch = qualifiedName.match(/^\{([^}]+)\}(.+)$/);
  if (nsMatch) {
    return { namespace: nsMatch[1], name: nsMatch[2] };
  }
  return { name: qualifiedName };
}

/**
 * Checks if an ID represents a top-level schema node.
 *
 * @param id - The ID to check
 * @returns True if the ID represents a top-level node
 *
 * @example
 * ```typescript
 * isTopLevelId("/element:person") // true
 * isTopLevelId("/element:person/element:address[0]") // false
 * ```
 */
export function isTopLevelId(id: string): boolean {
  const segments = splitPath(id.substring(1));
  return segments.length === 1;
}

/**
 * Gets the parent ID from a schema ID.
 *
 * @param id - The ID to get the parent from
 * @returns Parent ID or undefined if this is a top-level node
 *
 * @example
 * ```typescript
 * getParentId("/element:person/element:address[0]") // "/element:person"
 * getParentId("/element:person") // undefined
 * ```
 */
export function getParentId(id: string): string | undefined {
  const parsed = parseSchemaId(id);
  return parsed.parentId;
}

/**
 * Gets the node type from a schema ID.
 *
 * @param id - The ID to extract the type from
 * @returns The schema node type
 *
 * @example
 * ```typescript
 * getNodeType("/element:person") // SchemaNodeType.Element
 * getNodeType("/complexType:PersonType") // SchemaNodeType.ComplexType
 * ```
 */
export function getNodeType(id: string): SchemaNodeType {
  const parsed = parseSchemaId(id);
  return parsed.nodeType;
}

/**
 * Gets the name from a schema ID (if it has one).
 *
 * @param id - The ID to extract the name from
 * @returns The node name or undefined if unnamed
 *
 * @example
 * ```typescript
 * getNodeName("/element:person") // "person"
 * getNodeName("/anonymousComplexType[0]") // undefined
 * ```
 */
export function getNodeName(id: string): string | undefined {
  const parsed = parseSchemaId(id);
  return parsed.name;
}
