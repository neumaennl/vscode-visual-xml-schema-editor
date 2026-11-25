/**
 * Shared helpers for properties-panel type editing.
 * Keeps reusable type-label and hint logic separate from rendering orchestration.
 */

import { SchemaNodeType } from "../../shared/idStrategy";
import type { ComplexTypeDerivationKind } from "../../shared/types";
import {
  getBaseType,
  getComplexDerivation,
  getSimpleDerivation,
  getTypeText,
  hasInlineComplexType,
  hasInlineSimpleType,
  type DiagramItem,
} from "../diagram";
import { getNodeType } from "./propertiesPanelNodeKinds";

/**
 * Returns the text of a read-only Type or Base Type field: a summary of an inline complex type with its
 * base type, of an inline simple type with its base type, item type or member types, or the type of the node.
 *
 * @param node - Diagram item to describe
 * @returns The text of the field
 */
export function getReadOnlyTypeValue(node: DiagramItem): string {
  if (hasInlineComplexType(node)) {
    const derivation = getComplexDerivation(node);
    return derivation?.base
      ? `Inline complexType (${getDerivationRelation(derivation.kind)} ${derivation.base})`
      : "Inline complexType";
  }
  if (hasInlineSimpleType(node)) {
    const body = describeSimpleTypeBody(node);
    return body ? `Inline simpleType (${body})` : "Inline simpleType";
  }
  return getTypeText(node);
}

/**
 * Describes the body of a simple type like the diagram builder does in its labels: the base type of a
 * restriction, the item type of a list or the member types of a union.
 *
 * @param node - Diagram item with the simple type
 * @returns The description, or undefined when the body names no type
 */
function describeSimpleTypeBody(node: DiagramItem): string | undefined {
  const derivation = getSimpleDerivation(node);
  switch (derivation?.kind) {
    case "list":
      return derivation.itemType ? `list of ${derivation.itemType}` : undefined;
    case "union":
      return derivation.memberTypes.length > 0 ? `union of ${derivation.memberTypes.join(", ")}` : undefined;
    case "restriction":
      return derivation.base ? `restricts ${derivation.base}` : undefined;
    default:
      return undefined;
  }
}

/**
 * Returns the hint shown below the type fields: that a replacement type removes an inline type, or
 * that a simple type has no single base type to edit.
 *
 * @param node - Diagram item being edited
 * @returns The hint, or null when there is none
 */
export function getTypeEditHint(node: DiagramItem): string | null {
  const nodeType = getNodeType(node);
  if (hasInlineComplexType(node)) {
    return "Setting a replacement type removes the current inline complexType from this element.";
  }
  if (hasInlineSimpleType(node)) {
    return "Setting a replacement type removes the current inline simpleType from this element.";
  }
  if (
    (nodeType === SchemaNodeType.SimpleType || nodeType === SchemaNodeType.AnonymousSimpleType) &&
    !getBaseType(node)
  ) {
    return "This simpleType does not expose a single base type that can be edited here.";
  }
  return null;
}

/**
 * Returns the verb that describes a complex derivation in the type summary.
 *
 * @param derivationKind - The derivation kind of the complex type
 * @returns `"restricts"` for a restriction, `"extends"` for an extension
 */
function getDerivationRelation(derivationKind: ComplexTypeDerivationKind): string {
  return derivationKind === "restriction" ? "restricts" : "extends";
}
