/**
 * Unit tests of `occurrences`.
 */

import { validateMaxOccurs, validateMinOccurs, validateOccurrences } from "./occurrences.js";
import { expectInvalid } from "./__tests__/validationTestHelpers.js";

describe("validateOccurrences", () => {
  test("should accept undefined minOccurs and maxOccurs", () => {
    const result = validateOccurrences(undefined, undefined);
    expect(result.valid).toBe(true);
  });

  test.each([0, 1, 10])("should accept the minOccurs %d without maxOccurs", (value) => {
    expect(validateOccurrences(value, undefined).valid).toBe(true);
  });

  test.each([0, 1, 10, "unbounded"])("should accept the maxOccurs %s without minOccurs", (value) => {
    expect(validateOccurrences(undefined, value).valid).toBe(true);
  });

  test.each([
    [-1, undefined, "minOccurs must be a non-negative integer"],
    [1.5, undefined, "minOccurs must be an integer"],
    [undefined, -1, "maxOccurs must be a non-negative integer or 'unbounded'"],
    [undefined, 1.5, "maxOccurs must be an integer or 'unbounded'"],
  ])("should reject minOccurs %s and maxOccurs %s", (minOccurs, maxOccurs, error) => {
    const result = validateOccurrences(minOccurs, maxOccurs);
    expectInvalid(result);
    expect(result.error).toBe(error);
  });

  test("should accept valid minOccurs and maxOccurs", () => {
    expect(validateOccurrences(0, 1).valid).toBe(true);
    expect(validateOccurrences(1, 10).valid).toBe(true);
    expect(validateOccurrences(0, "unbounded").valid).toBe(true);
  });

  test("should reject invalid minOccurs", () => {
    const result = validateOccurrences(-1, 10);
    expectInvalid(result);
    expect(result.error).toBe("minOccurs must be a non-negative integer");
  });

  test("should reject invalid maxOccurs", () => {
    const result = validateOccurrences(1, -1);
    expectInvalid(result);
    expect(result.error).toBe("maxOccurs must be a non-negative integer or 'unbounded'");
  });

  test("should reject minOccurs > maxOccurs", () => {
    const result = validateOccurrences(10, 5);
    expectInvalid(result);
    expect(result.error).toBe("minOccurs must be <= maxOccurs");
  });

  test("should accept minOccurs <= maxOccurs with unbounded", () => {
    const result = validateOccurrences(10, "unbounded");
    expect(result.valid).toBe(true);
  });

  test("should accept equal minOccurs and maxOccurs", () => {
    const result = validateOccurrences(5, 5);
    expect(result.valid).toBe(true);
  });
});
describe("validateMinOccurs and validateMaxOccurs", () => {
  test.each([
    [0, true],
    [3, true],
    [-1, false],
    [1.5, false],
  ])("should check minOccurs %s on its own: %s", (value, valid) => {
    expect(validateMinOccurs(value).valid).toBe(valid);
  });

  test.each([
    [0, true],
    ["unbounded", true],
    [-1, false],
    [2.5, false],
  ] as const)("should check maxOccurs %s on its own: %s", (value, valid) => {
    expect(validateMaxOccurs(value).valid).toBe(valid);
  });
});
