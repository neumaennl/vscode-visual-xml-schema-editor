/**
 * Unit tests of `facetIcons`.
 */

import { LIST_FACETS, SINGLE_VALUE_FACETS } from "../shared/facets";
import { getFacetIconStyle } from "./facetIcons";

describe("getFacetIconStyle", () => {
  test.each([...LIST_FACETS, ...SINGLE_VALUE_FACETS])("should give %s an icon and a color", (facet) => {
    const style = getFacetIconStyle(facet);

    expect(style.icon).not.toBe("");
    expect(style.color).toMatch(/^#[0-9a-f]{6}$/);
  });

  test("should give related facets the same look", () => {
    expect(getFacetIconStyle("minLength")).toEqual(getFacetIconStyle("maxLength"));
    expect(getFacetIconStyle("minInclusive")).toEqual(getFacetIconStyle("maxExclusive"));
  });
});
