/**
 * Unit tests of `facets`.
 */

import type { RestrictionFacets } from "./commands/simpleType.js";
import {
  countFacetsWithValues,
  type FacetName,
  isNumericFacet,
  isWhiteSpaceValue,
  LIST_FACETS,
  SINGLE_VALUE_FACETS,
} from "./facets.js";

/** All facets. */
const FACET_NAMES = [...LIST_FACETS, ...SINGLE_VALUE_FACETS];

describe("LIST_FACETS and SINGLE_VALUE_FACETS", () => {
  test("should name each facet once, in a list facet or a single-value facet", () => {
    expectTypeOf<(typeof LIST_FACETS)[number] | (typeof SINGLE_VALUE_FACETS)[number]>().toEqualTypeOf<FacetName>();
    expect(new Set(FACET_NAMES).size).toBe(FACET_NAMES.length);
  });
});

describe("countFacetsWithValues", () => {
  test.each<[RestrictionFacets, number]>([
    [{}, 0],
    [{ enumeration: [], pattern: [] }, 0],
    [{ minLength: undefined }, 0],
    [{ maxLength: 5 }, 1],
    [{ pattern: ["[a-z]+"], whiteSpace: "collapse", totalDigits: 0 }, 3],
  ])("should count the facets of %j: %i", (facets, expected) => {
    expect(countFacetsWithValues(facets)).toBe(expected);
  });
});

describe("isWhiteSpaceValue", () => {
  test.each([
    ["preserve", true],
    ["replace", true],
    ["collapse", true],
    ["Collapse", false],
    ["", false],
  ])("should return for %s: %s", (value, expected) => {
    expect(isWhiteSpaceValue(value)).toBe(expected);
  });
});

describe("isNumericFacet", () => {
  test("should accept the lengths and the digits", () => {
    expect(FACET_NAMES.filter(isNumericFacet)).toEqual([
      "length",
      "minLength",
      "maxLength",
      "totalDigits",
      "fractionDigits",
    ]);
  });
});
