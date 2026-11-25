/**
 * Command-building helpers for simpleType editing in the properties panel.
 */

import type { SchemaCommand, SimpleTypeDerivationKind } from "../../shared/types";
import { getSimpleDerivation, type DiagramItem, type SimpleDerivation } from "../diagram";
import { resolveSimpleTypeId } from "./propertiesPanelTargets";
import { normalizeTypeReference } from "./propertiesPanelTypeReferences";

/**
 * Builds a simpleType list item-type update command for the selected node.
 *
 * @param node - Diagram item being edited
 * @param nextItemType - Proposed list item type from the UI
 * @returns A schema command or null when the node/item type is not editable
 */
export function createSimpleTypeListCommand(node: DiagramItem, nextItemType: string): SchemaCommand | null {
  const itemType = normalizeTypeReference(node, nextItemType);
  if (!itemType) {
    return null;
  }
  const simpleTypeId = resolveSimpleTypeId(node);
  if (!simpleTypeId) {
    return null;
  }
  return {
    type: "modifySimpleType",
    payload: {
      typeId: simpleTypeId,
      listItemType: itemType,
    },
  };
}

/**
 * Builds a simpleType union member-types update command for the selected node.
 *
 * @param node - Diagram item being edited
 * @param nextMemberTypes - Proposed union member type names from the UI
 * @returns A schema command or null when the node/member types are not editable
 */
export function createSimpleTypeUnionCommand(node: DiagramItem, nextMemberTypes: string[]): SchemaCommand | null {
  const simpleTypeId = resolveSimpleTypeId(node);
  if (!simpleTypeId) {
    return null;
  }
  const normalized = nextMemberTypes
    .map((memberType) => normalizeTypeReference(node, memberType))
    .map((memberType) => memberType.trim())
    .filter((memberType) => memberType.length > 0);
  if (normalized.length === 0) {
    return null;
  }
  return {
    type: "modifySimpleType",
    payload: {
      typeId: simpleTypeId,
      unionMemberTypes: normalized,
    },
  };
}

/**
 * Returns the type that a simple type's body names, from which another body can be derived: the item type
 * of a list, the first member type of a union or the base type of a restriction.
 *
 * @param derivation - The body
 * @returns The type, or `undefined` if the body names none
 */
function typeOfBody(derivation: SimpleDerivation | undefined): string | undefined {
  switch (derivation?.kind) {
    case "list":
      return derivation.itemType;
    case "union":
      return derivation.memberTypes[0];
    default:
      return derivation?.base;
  }
}

/**
 * Builds the command that switches a simple type to another derivation kind. The new body is derived
 * from the current one: from the item type of a list, the first member type of a union or the base
 * type of a restriction. The properties panel only calls it with a kind other than the current one,
 * so a list or a union has no facets to keep.
 *
 * @param node - Diagram item being edited
 * @param nextKind - The new simpleType derivation kind, which differs from the current one
 * @returns A schema command, or null when the node has no simple type or no type to derive the new body from
 */
export function createSimpleTypeKindCommand(
  node: DiagramItem,
  nextKind: SimpleTypeDerivationKind
): SchemaCommand | null {
  const simpleTypeId = resolveSimpleTypeId(node);
  const baseType = typeOfBody(getSimpleDerivation(node));
  if (!simpleTypeId || !baseType) {
    return null;
  }

  switch (nextKind) {
    case "list":
      return { type: "modifySimpleType", payload: { typeId: simpleTypeId, listItemType: baseType } };
    case "union":
      return { type: "modifySimpleType", payload: { typeId: simpleTypeId, unionMemberTypes: [baseType] } };
    case "restriction":
      return { type: "modifySimpleType", payload: { typeId: simpleTypeId, baseType } };
  }
}
