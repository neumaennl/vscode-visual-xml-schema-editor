/**
 * Unit tests for schema utility functions.
 */

import { toArray } from "./schemaUtils";

describe("schemaUtils", () => {
  describe("toArray", () => {
    it("should return empty array for undefined", () => {
      expect(toArray(undefined)).toEqual([]);
    });

    it("should return empty array for null", () => {
      expect(toArray(null)).toEqual([]);
    });

    it("should wrap single value in array", () => {
      expect(toArray("single")).toEqual(["single"]);
      expect(toArray(42)).toEqual([42]);
    });

    it("should return array unchanged", () => {
      const arr = ["a", "b", "c"];
      expect(toArray(arr)).toEqual(arr);
    });

    it("should wrap falsy values in array (not treat as undefined)", () => {
      expect(toArray(0)).toEqual([0]);
      expect(toArray(false)).toEqual([false]);
      expect(toArray("")).toEqual([""]);
    });
  });
});
