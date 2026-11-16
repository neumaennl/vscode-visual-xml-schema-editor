/**
 * Unit tests for the facet helpers of FacetIconStyles.
 */

import { FACET_ICON_STYLES, isFacetPaletteConstruct } from "./FacetIconStyles";
import { PaletteSchemaConstruct } from "./PaletteSchemaConstruct";

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
