/**
 * Command-building helpers for simpleType editing in the properties panel.
 */

import type { SchemaCommand } from "../../shared/types";
import type { DiagramItem } from "../diagram";
import { parseDerivationBaseType } from "../diagram";
import { normalizeTypeReferenceForCurrentSchema, resolveSimpleTypeId } from "./propertiesPanelCommands";

/**
 * Extracts the simple base type from the user-facing type label shown in the panel.
 *
 * @param typeText - Display text from the Type field
 * @returns The extracted base type or undefined when none can be inferred
 */
export function extractBaseType(typeText: string): string | undefined {
  const baseType = parseDerivationBaseType(typeText);
  if (baseType) {
    return baseType;
  }
  if (typeText.startsWith("xs:")) {
    return typeText.trim();
  }
  return undefined;
}

/**
 * Builds a simpleType list item-type update command for the selected node.
 *
 * @param node - Diagram item being edited
 * @param nextItemType - Proposed list item type from the UI
 * @returns A schema command or null when the node/item type is not editable
 */
export function createSimpleTypeListCommand(
  node: DiagramItem,
  nextItemType: string
): SchemaCommand | null {
  const itemType = normalizeTypeReferenceForCurrentSchema(node, nextItemType);
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
export function createSimpleTypeUnionCommand(
  node: DiagramItem,
  nextMemberTypes: string[]
): SchemaCommand | null {
  const simpleTypeId = resolveSimpleTypeId(node);
  if (!simpleTypeId) {
    return null;
  }
  const normalized = nextMemberTypes
    .map((memberType) => normalizeTypeReferenceForCurrentSchema(node, memberType))
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
  nextKind: "restriction" | "list" | "union"
): SchemaCommand | null {
  const simpleTypeId = resolveSimpleTypeId(node);
  const baseType =
    node.simpleTypeListItemType ||
    node.simpleTypeUnionMemberTypes?.[0] ||
    extractBaseType(node.type);
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
