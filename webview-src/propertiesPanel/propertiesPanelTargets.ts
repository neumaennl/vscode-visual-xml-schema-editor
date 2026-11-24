/**
 * Which schema node an edit in the properties panel changes: the node of the diagram item itself, or the
 * anonymous type of an element, which is no diagram item of its own.
 */

import { SCHEMA_ROOT_ID, SchemaNodeType } from "../../shared/idStrategy";
import { anonymousTypeId, type TypeKind } from "../../shared/schemaUtils";
import { hasInlineComplexType, hasInlineSimpleType, type DiagramItem } from "../diagram";
import { getNodeType } from "./propertiesPanelNodeKinds";

/** The node types of the named and of the anonymous types of each kind. */
const TYPE_NODE_TYPES: Record<TypeKind, readonly [SchemaNodeType, SchemaNodeType]> = {
  simpleType: [SchemaNodeType.SimpleType, SchemaNodeType.AnonymousSimpleType],
  complexType: [SchemaNodeType.ComplexType, SchemaNodeType.AnonymousComplexType],
};

/**
 * Resolves the schema ID of the type that a node represents: the node itself if it is a type of the
 * kind, or the anonymous type of an element that has one.
 *
 * @param node - Diagram item to inspect
 * @param kind - The kind of the type
 * @param hasInlineType - Whether the node, if it is an element, has an anonymous type of the kind
 * @returns The type's schema ID, or null when no type of the kind applies
 */
function resolveTypeId(node: DiagramItem, kind: TypeKind, hasInlineType: boolean): string | null {
  const nodeType = getNodeType(node);
  if (nodeType !== null && TYPE_NODE_TYPES[kind].includes(nodeType)) {
    return node.id;
  }
  if (nodeType === SchemaNodeType.Element && hasInlineType) {
    return anonymousTypeId(node.id, kind);
  }
  return null;
}

/**
 * Resolves the schema ID of the simple type represented by the given node.
 *
 * @param node - Diagram item to inspect
 * @returns The simple-type schema ID or null when no simple type applies
 */
export function resolveSimpleTypeId(node: DiagramItem): string | null {
  return resolveTypeId(node, "simpleType", hasInlineSimpleType(node));
}

/**
 * Resolves the schema ID of the complex type represented by the given node.
 *
 * @param node - Diagram item to inspect
 * @returns The complex-type schema ID or null when no complex type applies
 */
export function resolveComplexTypeId(node: DiagramItem): string | null {
  return resolveTypeId(node, "complexType", hasInlineComplexType(node));
}

/**
 * Resolves the default annotation/documentation target for Docs-tab operations.
 * For element nodes that inline anonymous types, this returns the anonymous type ID
 * so documentation edits target the actual annotated schema node instead of the
 * parent element wrapper. Anonymous types are no diagram items of their own.
 *
 * @param node - Diagram item being edited in the Docs tab
 * @returns The schema ID that documentation commands should target, or null when unsupported
 */
export function resolveDocumentationTargetId(node: DiagramItem): string | null {
  const nodeType = getNodeType(node);
  switch (nodeType) {
    case SchemaNodeType.Schema:
      return SCHEMA_ROOT_ID;
    case SchemaNodeType.Element:
      return resolveComplexTypeId(node) ?? resolveSimpleTypeId(node) ?? node.id;
    case SchemaNodeType.SimpleType:
    case SchemaNodeType.ComplexType:
    case SchemaNodeType.Group:
    case SchemaNodeType.GroupRef:
      return node.id;
    default:
      return null;
  }
}
