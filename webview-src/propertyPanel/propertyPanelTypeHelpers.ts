/**
 * Shared helpers for property-panel type editing.
 * Keeps reusable type-label and hint logic separate from rendering orchestration.
 */

import { SchemaNodeType } from "../../shared/idStrategy";
import { DiagramComplexDerivationKind, DiagramItem } from "../diagram";

export function isInlineSimpleTypeElement(
  node: DiagramItem,
  nodeType: SchemaNodeType | null
): boolean {
  return nodeType === SchemaNodeType.Element && node.isSimpleContent;
}

export function isInlineComplexTypeElement(
  node: DiagramItem,
  nodeType: SchemaNodeType | null
): boolean {
  return nodeType === SchemaNodeType.Element && node.hasAnonymousComplexType;
}

export function hasInlineAnonymousElementType(
  node: DiagramItem,
  nodeType: SchemaNodeType | null
): boolean {
  return (
    isInlineComplexTypeElement(node, nodeType) ||
    isInlineSimpleTypeElement(node, nodeType)
  );
}

export function getReadOnlyTypeValue(node: DiagramItem, baseType: string | undefined): string {
  if (node.hasAnonymousComplexType) {
    const derivationRelation = node.complexDerivationKind ? getDerivationRelation(node.complexDerivationKind) : undefined;
    return derivationRelation && baseType ? `Inline complexType (${derivationRelation} ${baseType})` : "Inline complexType";
  }
  if (node.isSimpleContent) {
    return baseType ? `Inline simpleType (restricts ${baseType})` : "Inline simpleType";
  }
  return node.type;
}

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

export function getDerivationRelation(derivationKind: DiagramComplexDerivationKind): string {
  return derivationKind === "restriction" ? "restricts" : "extends";
}
