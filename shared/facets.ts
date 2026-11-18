/**
 * The facets of a simple type restriction: their names, split into the facets with several values and those
 * with one value, and the values of `whiteSpace`.
 */

import type { RestrictionFacets } from "./commands/simpleType.js";

/** The name of a facet, as an element name and as a key of {@link RestrictionFacets}. */
export type FacetName = keyof RestrictionFacets;

/** The facets that can occur several times in a restriction; all their values are kept. */
export const LIST_FACETS = ["enumeration", "pattern"] as const satisfies readonly FacetName[];

/** The facets that occur at most once in a restriction, in the order that the editor shows them. */
export const SINGLE_VALUE_FACETS = [
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
] as const satisfies readonly FacetName[];

/** All facets: the list facets, then the single-value facets. */
const FACET_NAMES: readonly FacetName[] = [...LIST_FACETS, ...SINGLE_VALUE_FACETS];

/**
 * Counts the facets that have a value; an empty list of values counts as no facet.
 *
 * @param facets - The facets
 * @returns The number of facets with a value
 */
export function countFacetsWithValues(facets: RestrictionFacets): number {
  return FACET_NAMES.filter((name) => {
    const value = facets[name];
    return Array.isArray(value) ? value.length > 0 : value !== undefined;
  }).length;
}

/** The facets whose value is a number: the lengths and the digits. */
const NUMERIC_FACETS = [
  "length",
  "minLength",
  "maxLength",
  "totalDigits",
  "fractionDigits",
] as const satisfies readonly FacetName[];

/** A facet whose value is a number. */
export type NumericFacetName = (typeof NUMERIC_FACETS)[number];

/**
 * Tells whether the value of a facet is a number.
 *
 * @param facet - The facet
 * @returns True for the lengths and the digits
 */
export function isNumericFacet(facet: FacetName): facet is NumericFacetName {
  return (NUMERIC_FACETS as readonly FacetName[]).includes(facet);
}

/** A value of the `whiteSpace` facet. */
export type WhiteSpaceValue = NonNullable<RestrictionFacets["whiteSpace"]>;

/** The values that the `whiteSpace` facet allows. */
const WHITE_SPACE_VALUES: ReadonlySet<string> = new Set<WhiteSpaceValue>(["preserve", "replace", "collapse"]);

/**
 * Tells whether a text is a value of the `whiteSpace` facet.
 *
 * @param value - The text
 * @returns True for `preserve`, `replace` and `collapse`
 */
export function isWhiteSpaceValue(value: string): value is WhiteSpaceValue {
  return WHITE_SPACE_VALUES.has(value);
}
