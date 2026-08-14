/**
 * Helpers for processing simple-type derivations such as restrictions, lists, and unions.
 */

import { DiagramItem } from "./DiagramItem";
import type { restrictionType } from "../../shared/generated/restrictionType";
import type { restrictionType_1 } from "../../shared/generated/restrictionType_1";
import type { listType } from "../../shared/generated/listType";
import type { unionType } from "../../shared/generated/unionType";
import type { ContentTypeLike } from "./DiagramTypes";
import { toArray } from "../../shared/schemaUtils";

/**
 * Union type for restriction structures that may contain facets.
 */
type RestrictionTypeLike = restrictionType | restrictionType_1 | ContentTypeLike;

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
export function extractRestrictionFacets(parent: DiagramItem, restriction: RestrictionTypeLike): void {
  if (!hasSimpleTypeFacets(restriction)) {
    return;
  }

  const enumeration = toArray(restriction.enumeration);
  const pattern = toArray(restriction.pattern);
  const length = toArray(restriction.length);
  const minLength = toArray(restriction.minLength);
  const maxLength = toArray(restriction.maxLength);
  const minInclusive = toArray(restriction.minInclusive);
  const maxInclusive = toArray(restriction.maxInclusive);
  const minExclusive = toArray(restriction.minExclusive);
  const maxExclusive = toArray(restriction.maxExclusive);
  const totalDigits = toArray(restriction.totalDigits);
  const fractionDigits = toArray(restriction.fractionDigits);
  const whiteSpace = toArray(restriction.whiteSpace);

  const facetArrays = [
    enumeration,
    pattern,
    length,
    minLength,
    maxLength,
    minInclusive,
    maxInclusive,
    minExclusive,
    maxExclusive,
    totalDigits,
    fractionDigits,
    whiteSpace,
  ];

  if (!facetArrays.some((arr) => arr.length > 0)) {
    return;
  }

  if (!parent.restrictions) {
    parent.restrictions = {};
  }

  if (enumeration.length > 0) {
    parent.restrictions.enumeration = enumeration.map((e) => e.value);
  }
  if (pattern.length > 0) {
    parent.restrictions.pattern = pattern.map((p) => p.value);
  }
  if (length.length > 0) {
    parent.restrictions.length = length[0].value;
  }
  if (minLength.length > 0) {
    parent.restrictions.minLength = minLength[0].value;
  }
  if (maxLength.length > 0) {
    parent.restrictions.maxLength = maxLength[0].value;
  }
  if (minInclusive.length > 0) {
    parent.restrictions.minInclusive = minInclusive[0].value;
  }
  if (maxInclusive.length > 0) {
    parent.restrictions.maxInclusive = maxInclusive[0].value;
  }
  if (minExclusive.length > 0) {
    parent.restrictions.minExclusive = minExclusive[0].value;
  }
  if (maxExclusive.length > 0) {
    parent.restrictions.maxExclusive = maxExclusive[0].value;
  }
  if (totalDigits.length > 0) {
    parent.restrictions.totalDigits = totalDigits[0].value;
  }
  if (fractionDigits.length > 0) {
    parent.restrictions.fractionDigits = fractionDigits[0].value;
  }
  if (whiteSpace.length > 0) {
    parent.restrictions.whiteSpace = whiteSpace[0].value;
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
