/**
 * The facets of a simple type restriction: their names, split into the facets with several values and those
 * with one value, and the values of `whiteSpace`.
 */

import type { RestrictionFacets } from "./commands/simpleType.js";
import type { ValidationResult } from "./validation.js";

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
 * Tells whether a text is the name of a facet.
 *
 * @param value - The text
 * @returns True for the twelve facet names
 */
export function isFacetName(value: string): value is FacetName {
  return (FACET_NAMES as readonly string[]).includes(value);
}

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
export const WHITE_SPACE_VALUES: readonly WhiteSpaceValue[] = ["preserve", "replace", "collapse"];

/**
 * Tells whether a text is a value of the `whiteSpace` facet.
 *
 * @param value - The text
 * @returns True for `preserve`, `replace` and `collapse`
 */
export function isWhiteSpaceValue(value: string): value is WhiteSpaceValue {
  return (WHITE_SPACE_VALUES as readonly string[]).includes(value);
}

/**
 * Checks the value of one facet on its own. The lengths and the digits are non-negative integers, and
 * `totalDigits` is a positive one; `whiteSpace` is one of its three values; the values of an enumeration or
 * a pattern are texts without duplicates. Whether a bound such as `minInclusive` fits the base type is not
 * checked (see "Facets are not checked against the base type" in `docs/known-issues.md`).
 *
 * @param facet - The facet
 * @param value - Its value, as the commands carry it
 * @returns The validation result
 */
export function validateFacetValue(facet: FacetName, value: unknown): ValidationResult {
  if (isNumericFacet(facet)) {
    const minimum = facet === "totalDigits" ? 1 : 0;
    if (typeof value !== "number" || !Number.isInteger(value) || value < minimum) {
      return { valid: false, error: `${facet} must be a ${minimum === 1 ? "positive" : "non-negative"} integer` };
    }
    return { valid: true };
  }
  if (facet === "whiteSpace") {
    if (typeof value !== "string" || !isWhiteSpaceValue(value)) {
      return { valid: false, error: `whiteSpace must be one of ${WHITE_SPACE_VALUES.join(", ")}` };
    }
    return { valid: true };
  }
  if ((LIST_FACETS as readonly string[]).includes(facet)) {
    const values: unknown[] = Array.isArray(value) ? value : [value];
    const texts = values.filter((entry): entry is string => typeof entry === "string");
    if (texts.length !== values.length) {
      return { valid: false, error: `The values of ${facet} must be texts` };
    }
    const duplicate = texts.find((entry, index) => texts.indexOf(entry) !== index);
    if (duplicate !== undefined) {
      return { valid: false, error: `${facet} already has the value '${duplicate}'` };
    }
    return { valid: true };
  }
  if (typeof value !== "string") {
    return { valid: false, error: `${facet} must be a text` };
  }
  return { valid: true };
}

/**
 * Checks the values of all facets that are set.
 *
 * @param facets - The facets
 * @returns The validation result of the first invalid facet, or success
 */
export function validateFacetValues(facets: RestrictionFacets): ValidationResult {
  for (const facet of FACET_NAMES) {
    const value = facets[facet];
    if (value !== undefined) {
      const result = validateFacetValue(facet, value);
      if (!result.valid) {
        return result;
      }
    }
  }
  return { valid: true };
}
