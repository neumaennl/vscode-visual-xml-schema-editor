/**
 * Helpers for processing simple-type derivations such as restrictions, lists, and unions.
 */

import type { DiagramItem } from "./DiagramItem";
import { isWhiteSpaceValue, LIST_FACETS, SINGLE_VALUE_FACETS, type FacetName } from "../../shared/facets";
import type { RestrictionFacets } from "../../shared/types";
import type { listType } from "../../shared/generated/listType";
import type { unionType } from "../../shared/generated/unionType";
import type { ContentTypeLike } from "./DiagramTypes";

/** A restriction as far as its facets are read: each facet is a list of elements with a value. */
type FacetHolder = Partial<Record<FacetName, ReadonlyArray<{ value: string | number }>>>;

/**
 * Extracts restriction facets from a restriction definition and stores them on the diagram item. The facets
 * are read by their values, so a restriction of complex content, which has none, adds nothing.
 *
 * @param parent - Diagram item receiving the extracted restriction facets.
 * @param restriction - Restriction definition from the schema.
 */
function extractRestrictionFacets(parent: DiagramItem, restriction: ContentTypeLike): void {
  const holder = restriction as FacetHolder;
  // The values have the types of the generated facet classes: numbers for the lengths and digits
  const restrictions: Record<string, string | number | string[]> = {};
  for (const key of LIST_FACETS) {
    const values = (holder[key] ?? []).map((facet) => String(facet.value));
    if (values.length > 0) {
      restrictions[key] = values;
    }
  }
  for (const key of SINGLE_VALUE_FACETS) {
    const value = holder[key]?.[0]?.value;
    if (value !== undefined && (key !== "whiteSpace" || isWhiteSpaceValue(String(value)))) {
      restrictions[key] = value;
    }
  }
  if (Object.keys(restrictions).length > 0) {
    parent.restrictions = { ...parent.restrictions, ...(restrictions as RestrictionFacets) };
  }
}

/**
 * Processes a restriction definition and applies its derived metadata to a diagram item.
 *
 * @param parent - Diagram item being restricted.
 * @param restriction - Restriction definition from the schema.
 */
export function processRestriction(parent: DiagramItem, restriction: ContentTypeLike): void {
  parent.simpleTypeDerivationKind = "restriction";
  parent.simpleTypeListItemType = undefined;
  parent.simpleTypeUnionMemberTypes = undefined;

  if (restriction.base) {
    parent.type += ` (restricts ${restriction.base})`;
  }

  extractRestrictionFacets(parent, restriction);
}

/**
 * Processes a list definition and applies its derived metadata to a diagram item.
 *
 * @param parent - Diagram item being described as a list.
 * @param list - List definition from the schema.
 */
export function processList(parent: DiagramItem, list: listType): void {
  parent.simpleTypeDerivationKind = "list";
  parent.simpleTypeListItemType = list.itemType;
  parent.simpleTypeUnionMemberTypes = undefined;
  parent.restrictions = undefined;

  if (list.itemType) {
    parent.type += ` (list of ${list.itemType})`;
    return;
  }

  if (list.simpleType?.restriction?.base) {
    const nestedBase = list.simpleType.restriction.base;
    parent.simpleTypeListItemType = nestedBase;
    parent.type += ` (list of ${nestedBase})`;
    return;
  }

  parent.type += " (list)";
}

/**
 * Processes a union definition and applies its derived metadata to a diagram item.
 *
 * @param parent - Diagram item being described as a union.
 * @param union - Union definition from the schema.
 */
export function processUnion(parent: DiagramItem, union: unionType): void {
  parent.simpleTypeDerivationKind = "union";
  parent.simpleTypeListItemType = undefined;
  parent.restrictions = undefined;

  const memberTypes = union.memberTypes
    ?.split(/\s+/)
    .map((memberType) => memberType.trim())
    .filter((memberType) => memberType.length > 0);
  parent.simpleTypeUnionMemberTypes = memberTypes && memberTypes.length > 0 ? memberTypes : undefined;

  if (parent.simpleTypeUnionMemberTypes?.length) {
    parent.type += ` (union of ${parent.simpleTypeUnionMemberTypes.join(", ")})`;
    return;
  }

  parent.type += " (union)";
}
