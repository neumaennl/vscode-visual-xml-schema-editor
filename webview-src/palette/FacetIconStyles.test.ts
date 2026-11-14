/**
 * Unit tests for the facet helpers of FacetIconStyles.
 */

import { FACET_ICON_STYLES, isFacetPaletteConstruct } from "./FacetIconStyles";
import { PaletteSchemaConstruct } from "./PaletteSchemaConstruct";

describe("isFacetPaletteConstruct", () => {
  test("accepts every construct with a facet icon style", () => {
    for (const construct of Object.keys(FACET_ICON_STYLES) as PaletteSchemaConstruct[]) {
      expect(isFacetPaletteConstruct(construct)).toBe(true);
    }
  });

  test.each([PaletteSchemaConstruct.Element, PaletteSchemaConstruct.Restriction, PaletteSchemaConstruct.Sequence])(
    "rejects %s",
    (construct) => {
      expect(isFacetPaletteConstruct(construct)).toBe(false);
    }
  );
});
