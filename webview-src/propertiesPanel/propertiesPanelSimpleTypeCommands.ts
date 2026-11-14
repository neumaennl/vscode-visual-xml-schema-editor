/**
 * Command-building helpers for simpleType editing in the properties panel.
 */

import { SchemaCommand } from "../../shared/types";
import { DiagramItem, parseDerivationBaseType, toRestrictionFacets } from "../diagram";
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
 * Builds a simpleType derivation-kind switch command for the selected node.
 *
 * @param node - Diagram item being edited
 * @param nextKind - The new simpleType derivation kind
 * @returns A schema command or null when the node/kind is not editable
 */
export function createSimpleTypeKindCommand(
  node: DiagramItem,
  nextKind: "restriction" | "list" | "union"
): SchemaCommand | null {
  const simpleTypeId = resolveSimpleTypeId(node);
  if (!simpleTypeId) {
    return null;
  }

  const inferredBaseType =
    node.simpleTypeListItemType ||
    node.simpleTypeUnionMemberTypes?.[0] ||
    extractBaseType(node.type);

  switch (nextKind) {
    case "list": {
      if (!inferredBaseType) {
        return null;
      }
      return {
        type: "modifySimpleType",
        payload: {
          typeId: simpleTypeId,
          listItemType: inferredBaseType,
        },
      };
    }
    case "union": {
      let memberTypes = node.simpleTypeUnionMemberTypes;
      if (!memberTypes?.length) {
        memberTypes = inferredBaseType ? [inferredBaseType] : undefined;
      }
      if (!memberTypes?.length) {
        return null;
      }
      return {
        type: "modifySimpleType",
        payload: {
          typeId: simpleTypeId,
          unionMemberTypes: memberTypes,
        },
      };
    }
    case "restriction": {
      if (!inferredBaseType && !node.restrictions) {
        return null;
      }
      const restrictions = toRestrictionFacets(node.restrictions);
      return {
        type: "modifySimpleType",
        payload: {
          typeId: simpleTypeId,
          baseType: inferredBaseType ?? "",
          ...(restrictions ? { restrictions } : {}),
        },
      };
    }
  }
}