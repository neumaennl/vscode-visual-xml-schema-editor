/**
 * Unit tests for schema utility functions.
 */

import { toArray, isSchemaRoot } from "./schemaUtils.js";

describe("schemaUtils", () => {
  describe("toArray", () => {
    test("should return empty array for undefined", () => {
      expect(toArray(undefined)).toEqual([]);
    });

    test("should return empty array for null", () => {
      expect(toArray(null)).toEqual([]);
    });

    test("should wrap single value in array", () => {
      expect(toArray("single")).toEqual(["single"]);
      expect(toArray(42)).toEqual([42]);
    });

    test("should return array unchanged", () => {
      const arr = ["a", "b", "c"];
      expect(toArray(arr)).toEqual(arr);
    });

    test("should wrap falsy values in array (not treat as undefined)", () => {
      expect(toArray(0)).toEqual([0]);
      expect(toArray(false)).toEqual([false]);
      expect(toArray("")).toEqual([""]);
    });
  });

  describe("isSchemaRoot", () => {
    test("should return true for undefined", () => {
      expect(isSchemaRoot(undefined)).toBe(true);
    });

    test('should return true for "/schema"', () => {
      expect(isSchemaRoot("/schema")).toBe(true);
    });

    test("should return false for empty string", () => {
      expect(isSchemaRoot("")).toBe(false);
    });

    test("should return false for element IDs", () => {
      expect(isSchemaRoot("/element:age")).toBe(false);
      expect(isSchemaRoot("/element:person/element:name")).toBe(false);
    });

    test("should return false for attribute IDs", () => {
      expect(isSchemaRoot("/attribute:color")).toBe(false);
    });

    test("should return false for other non-root strings", () => {
      expect(isSchemaRoot("schema")).toBe(false);
      expect(isSchemaRoot("root")).toBe(false);
      expect(isSchemaRoot("schemas")).toBe(false);
    });
  });
});
