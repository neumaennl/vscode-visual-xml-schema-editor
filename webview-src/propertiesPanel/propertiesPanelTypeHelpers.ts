/**
 * Shared helpers for properties-panel type editing.
 * Keeps reusable type-label and hint logic separate from rendering orchestration.
 */

import { SchemaNodeType } from "../../shared/idStrategy";
import { DiagramComplexDerivationKind, DiagramItem } from "../diagram";

/**
 * Tells whether the node is an element with an inline (anonymous) simple type.
 *
 * @param node - Diagram item to inspect
 * @param nodeType - Schema node type of the item
 * @returns True when the item is an element with an inline simple type
 */
export function isInlineSimpleTypeElement(
  node: DiagramItem,
  nodeType: SchemaNodeType | null
): boolean {
  return nodeType === SchemaNodeType.Element && node.isSimpleContent;
}

/**
 * Tells whether the node is an element with an inline (anonymous) complex type.
 *
 * @param node - Diagram item to inspect
 * @param nodeType - Schema node type of the item
 * @returns True when the item is an element with an inline complex type
 */
export function isInlineComplexTypeElement(
  node: DiagramItem,
  nodeType: SchemaNodeType | null
): boolean {
  return nodeType === SchemaNodeType.Element && node.hasAnonymousComplexType;
}

/**
 * Tells whether the node is an element with an inline simple or complex type.
 *
 * @param node - Diagram item to inspect
 * @param nodeType - Schema node type of the item
 * @returns True when the item is an element with an inline type
 */
export function hasInlineAnonymousElementType(
  node: DiagramItem,
  nodeType: SchemaNodeType | null
): boolean {
  return (
    isInlineComplexTypeElement(node, nodeType) ||
    isInlineSimpleTypeElement(node, nodeType)
  );
}

/**
 * Returns the text of a read-only Type or Base Type field: a summary of an inline complex type with its
 * base type, of an inline simple type with its base type, item type or member types, or the type of the node.
 *
 * @param node - Diagram item to describe
 * @param baseType - Base type of an inline restriction or derived complex type, if it has one
 * @returns The text of the field
 */
export function getReadOnlyTypeValue(node: DiagramItem, baseType: string | undefined): string {
  if (node.hasAnonymousComplexType) {
    const derivationRelation = node.complexDerivationKind ? getDerivationRelation(node.complexDerivationKind) : undefined;
    return derivationRelation && baseType ? `Inline complexType (${derivationRelation} ${baseType})` : "Inline complexType";
  }
  if (node.isSimpleContent) {
    const body = describeSimpleTypeBody(node, baseType);
    return body ? `Inline simpleType (${body})` : "Inline simpleType";
  }
  return node.type;
}

/**
 * Describes the body of a simple type like the diagram builder does in its labels: the base type of a
 * restriction, the item type of a list or the member types of a union.
 *
 * @param node - Diagram item with the simple type
 * @param baseType - Base type of a restriction, if it has one
 * @returns The description, or undefined when the body names no type
 */
function describeSimpleTypeBody(node: DiagramItem, baseType: string | undefined): string | undefined {
  switch (node.simpleTypeDerivationKind) {
    case "list":
      return node.simpleTypeListItemType ? `list of ${node.simpleTypeListItemType}` : undefined;
    case "union":
      return node.simpleTypeUnionMemberTypes?.length ? `union of ${node.simpleTypeUnionMemberTypes.join(", ")}` : undefined;
    default:
      return baseType ? `restricts ${baseType}` : undefined;
  }
}

/**
 * Returns the hint shown below the type fields: that a replacement type removes an inline type, or
 * that a simple type has no single base type to edit.
 *
 * @param node - Diagram item being edited
 * @param nodeType - Schema node type of the item
 * @param baseType - Base type of the simple type, if it has one
 * @returns The hint, or null when there is none
 */
export function getTypeEditHint(
  node: DiagramItem,
  nodeType: SchemaNodeType | null,
  baseType: string | undefined
): string | null {
  if (isInlineComplexTypeElement(node, nodeType)) {
    return "Setting a replacement type removes the current inline complexType from this element.";
  }
  if (
    isInlineSimpleTypeElement(node, nodeType)
  ) {
    return "Setting a replacement type removes the current inline simpleType from this element.";
  }
  if (
    (nodeType === SchemaNodeType.SimpleType || nodeType === SchemaNodeType.AnonymousSimpleType) &&
    !baseType
  ) {
    return "This simpleType does not expose a single base type that can be edited here.";
  }
  return null;
}

/**
 * Returns the verb that describes a complex derivation in the type summary.
 *
 * @param derivationKind - The derivation kind of the complex type
 * @returns "restricts" for a restriction, "extends" for an extension
 */
export function getDerivationRelation(derivationKind: DiagramComplexDerivationKind): string {
  return derivationKind === "restriction" ? "restricts" : "extends";
}
