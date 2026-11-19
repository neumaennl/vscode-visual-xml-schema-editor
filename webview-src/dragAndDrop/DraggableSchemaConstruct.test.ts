/**
 * Unit tests of `DraggableSchemaConstruct`.
 */

import { LIST_FACETS, SINGLE_VALUE_FACETS, type FacetName } from "../../shared/facets";
import {
  isFacetSchemaConstruct,
  DraggableSchemaConstruct,
  type FacetSchemaConstruct,
} from "./DraggableSchemaConstruct";

describe("FacetSchemaConstruct", () => {
  test("should have one schema construct per facet, named like the facet", () => {
    expectTypeOf<`${FacetSchemaConstruct}`>().toEqualTypeOf<FacetName>();
    const facetSchemaConstructs = Object.values(DraggableSchemaConstruct).filter(isFacetSchemaConstruct);
    expect([...facetSchemaConstructs].sort()).toEqual([...LIST_FACETS, ...SINGLE_VALUE_FACETS].sort());
  });
});

describe("isFacetSchemaConstruct", () => {
  test.each([
    DraggableSchemaConstruct.Element,
    DraggableSchemaConstruct.Restriction,
    DraggableSchemaConstruct.Sequence,
  ])("should reject %s", (schemaConstruct) => {
    expect(isFacetSchemaConstruct(schemaConstruct)).toBe(false);
  });
});
