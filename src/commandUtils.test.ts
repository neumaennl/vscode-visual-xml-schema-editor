/**
 * Unit tests for the lookups of children and attribute group references in commandUtils.
 */

import { findAttributeGroupRef, findIdentifiedChild, identifyChild, isIdentifiedChild } from "./commandUtils.js";
import { attributeGroupRef } from "../shared/types.js";

/** Children with a name, a ref and a name that repeats. */
const CHILDREN = [{ name: "a" }, { ref: "b" }, { name: "a" }];

/**
 * Creates attribute group references with the given refs.
 *
 * @param refs - The refs
 * @returns The references
 */
function refsOf(...refs: string[]): attributeGroupRef[] {
  return refs.map((ref) => Object.assign(new attributeGroupRef(), { ref }));
}

describe("isIdentifiedChild", () => {
  test.each([
    ["the position, which wins over the name", "x", 1, 1, true],
    ["another position", "a", 1, 0, false],
    ["the name", "a", undefined, 0, true],
    ["the ref", "b", undefined, 1, true],
    ["a different name", "c", undefined, 0, false],
    ["neither a name nor a position", undefined, undefined, 0, false],
  ])("matches by %s", (_case, name, position, index, expected) => {
    expect(isIdentifiedChild(CHILDREN[index], index, name, position)).toBe(expected);
  });
});

describe("findIdentifiedChild", () => {
  test("finds the first child with the name, or the child at the position", () => {
    expect(findIdentifiedChild(CHILDREN, "a", undefined)).toBe(CHILDREN[0]);
    expect(findIdentifiedChild(CHILDREN, "a", 2)).toBe(CHILDREN[2]);
    expect(findIdentifiedChild(CHILDREN, undefined, 5)).toBeUndefined();
  });
});

describe("identifyChild", () => {
  test("describes the child by its name, or else by its position", () => {
    expect(identifyChild("Element", "a", 2).what).toBe("Element a");
    expect(identifyChild("Element", undefined, 2).what).toBe("Element at position 2");
  });

  test("matches like isIdentifiedChild", () => {
    expect(CHILDREN.filter(identifyChild("Element", "a", undefined).matches)).toEqual([CHILDREN[0], CHILDREN[2]]);
  });
});

describe("findAttributeGroupRef", () => {
  const refs = refsOf("A", "B", "A");

  test.each([
    ["the first reference with the name", "A", undefined, 0],
    ["the reference at the position", undefined, 2, 2],
    ["the reference at the position if it has the name", "A", 2, 2],
  ])("finds %s", (_case, name, position, index) => {
    expect(findAttributeGroupRef(refs, name, position)).toBe(refs[index]);
  });

  test.each([
    ["a reference at the position with another name", "B", 2],
    ["a position out of range", undefined, 3],
    ["a missing name", "C", undefined],
    ["neither a name nor a position", undefined, undefined],
  ])("finds nothing for %s", (_case, name, position) => {
    expect(findAttributeGroupRef(refs, name, position)).toBeUndefined();
  });
});
