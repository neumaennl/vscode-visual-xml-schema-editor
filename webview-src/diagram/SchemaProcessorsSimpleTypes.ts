/**
 * Helpers for processing simple-type derivations such as restrictions, lists, and unions.
 */

import type { DiagramItem } from "./DiagramItem";
import type { restrictionType } from "../../shared/generated/restrictionType";
import type { restrictionType_1 } from "../../shared/generated/restrictionType_1";
import type { listType } from "../../shared/generated/listType";
import type { unionType } from "../../shared/generated/unionType";
import type { ContentTypeLike } from "./DiagramTypes";

/**
 * Union type for restriction structures that may contain facets.
 */
type RestrictionTypeLike = restrictionType | restrictionType_1 | ContentTypeLike;

/** The facets that can have several values, which are all kept. */
const LIST_FACETS = ["enumeration", "pattern"] as const;

/** The facets that have one value; only the first element is read. */
const SINGLE_VALUE_FACETS = [
  "length",
  "minLength",
  "maxLength",
  "minInclusive",
  "maxInclusive",
  "minExclusive",
  "maxExclusive",
  "totalDigits",
  "fractionDigits",
  "whiteSpace",
] as const;

/**
 * Checks whether a restriction-like structure contains simple-type facets.
 *
 * @param restriction - Restriction-like payload to inspect.
 * @returns True when the structure exposes simple-type facet properties.
 */
function hasSimpleTypeFacets(restriction: RestrictionTypeLike): restriction is restrictionType | restrictionType_1 {
  return (
    "enumeration" in restriction ||
    "pattern" in restriction ||
    "length" in restriction ||
    "minLength" in restriction ||
    "maxLength" in restriction ||
    "minInclusive" in restriction ||
    "maxInclusive" in restriction ||
    "minExclusive" in restriction ||
    "maxExclusive" in restriction ||
    "totalDigits" in restriction ||
    "fractionDigits" in restriction ||
    "whiteSpace" in restriction
  );
}

/**
 * Extracts restriction facets from a restriction definition and stores them on the diagram item.
 *
 * @param parent - Diagram item receiving the extracted restriction facets.
 * @param restriction - Restriction definition from the schema.
 */
function extractRestrictionFacets(parent: DiagramItem, restriction: RestrictionTypeLike): void {
  if (!hasSimpleTypeFacets(restriction)) {
    return;
  }

  const restrictions: Record<string, string | number | string[]> = {};
  for (const key of LIST_FACETS) {
    const values = (restriction[key] ?? []).map((f) => f.value);
    if (values.length > 0) {
      restrictions[key] = values;
    }
  }
  for (const key of SINGLE_VALUE_FACETS) {
    const first = restriction[key]?.[0];
    if (first) {
      restrictions[key] = first.value;
    }
  }
  if (Object.keys(restrictions).length > 0) {
    parent.restrictions = { ...parent.restrictions, ...restrictions };
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
