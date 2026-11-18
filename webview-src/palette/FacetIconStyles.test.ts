/**
 * Unit tests for the facet helpers of `FacetIconStyles`.
 */

import { LIST_FACETS, SINGLE_VALUE_FACETS, type FacetName } from "../../shared/facets";
import { FACET_ICON_STYLES, isFacetPaletteConstruct, type FacetPaletteConstruct } from "./FacetIconStyles";
import { PaletteSchemaConstruct } from "./PaletteSchemaConstruct";

describe("FacetPaletteConstruct", () => {
  test("should have one construct per facet, named like the facet", () => {
    expectTypeOf<`${FacetPaletteConstruct}`>().toEqualTypeOf<FacetName>();
    expect(Object.keys(FACET_ICON_STYLES).sort()).toEqual([...LIST_FACETS, ...SINGLE_VALUE_FACETS].sort());
  });
});

describe("isFacetPaletteConstruct", () => {
  test("should accept every construct with a facet icon style", () => {
    for (const construct of Object.values(PaletteSchemaConstruct).filter((value) => value in FACET_ICON_STYLES)) {
      expect(isFacetPaletteConstruct(construct)).toBe(true);
    }
  });

  test.each([PaletteSchemaConstruct.Element, PaletteSchemaConstruct.Restriction, PaletteSchemaConstruct.Sequence])(
    "should reject %s",
    (construct) => {
      expect(isFacetPaletteConstruct(construct)).toBe(false);
    }
  );
});
