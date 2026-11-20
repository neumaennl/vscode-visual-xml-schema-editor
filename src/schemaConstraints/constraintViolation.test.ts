/**
 * Unit tests of `constraintViolation`.
 */

import { findAddedViolations, type ConstraintViolation } from "./constraintViolation.js";

/** A complex type, as the component of the violations. */
const TYPE = {};

/**
 * A violation in {@link TYPE} for the name `a` in the namespace `urn:t`, written as an expanded name,
 * `{namespace}localName`.
 */
const VIOLATION: ConstraintViolation = { rule: "elementTypes", container: TYPE, name: "{urn:t}a", message: "old" };

describe("findAddedViolations", () => {
  test("should ignore a violation that existed before, also with another message", () => {
    expect(findAddedViolations([VIOLATION], [{ ...VIOLATION, message: "new" }])).toEqual([]);
  });

  test.each<[string, Partial<ConstraintViolation>]>([
    ["another rule", { rule: "attributeUses" }],
    ["another component", { container: {} }],
    ["another name", { name: "{urn:t}b" }],
  ])("should return a violation for %s", (_case, change) => {
    const added = { ...VIOLATION, ...change };

    expect(findAddedViolations([VIOLATION], [VIOLATION, added])).toEqual([added]);
  });
});
