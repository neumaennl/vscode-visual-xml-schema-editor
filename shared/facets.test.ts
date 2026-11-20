/**
 * Unit tests of `facets`.
 */

import type { RestrictionFacets } from "./commands/simpleType.js";
import {
  countFacetsWithValues,
  type FacetName,
  isFacetName,
  validateFacetValue,
  validateFacetValues,
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

describe("isFacetName", () => {
  test.each([
    ["minLength", true],
    ["whiteSpace", true],
    ["element", false],
    ["MinLength", false],
  ])("should return for %s: %s", (value, expected) => {
    expect(isFacetName(value)).toBe(expected);
  });
});

describe("validateFacetValue", () => {
  test.each([
    ["maxLength", 0, true],
    ["maxLength", 5, true],
    ["maxLength", -1, false],
    ["maxLength", 1.5, false],
    ["maxLength", null, false],
    ["totalDigits", 1, true],
    ["totalDigits", 0, false],
    ["whiteSpace", "collapse", true],
    ["whiteSpace", "trim", false],
    ["enumeration", ["a", "b"], true],
    ["enumeration", ["a", "a"], false],
    ["pattern", ["[a-z]+", "[0-9]+"], true],
    ["minInclusive", "abc", true],
    ["minInclusive", 3, false],
  ] as const)("should check %s %j: %s", (facet, value, valid) => {
    expect(validateFacetValue(facet, value).valid).toBe(valid);
  });

  test("should say why a value is invalid", () => {
    expect(validateFacetValue("maxLength", -1)).toEqual({
      valid: false,
      error: "maxLength must be a non-negative integer",
    });
    expect(validateFacetValue("totalDigits", 0)).toEqual({
      valid: false,
      error: "totalDigits must be a positive integer",
    });
    expect(validateFacetValue("enumeration", ["a", "a"])).toEqual({
      valid: false,
      error: "enumeration already has the value 'a'",
    });
  });
});

describe("validateFacetValues", () => {
  test("should report the first invalid facet that is set", () => {
    expect(validateFacetValues({ minLength: 1, maxLength: undefined })).toEqual({ valid: true });
    expect(validateFacetValues({ minLength: -2, maxLength: 1.5 })).toEqual({
      valid: false,
      error: "minLength must be a non-negative integer",
    });
  });
});
