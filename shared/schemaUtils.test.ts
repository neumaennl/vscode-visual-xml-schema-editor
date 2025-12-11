/**
 * Unit tests for schema utility functions.
 */

import { toArray } from "./schemaUtils";

describe("schemaUtils", () => {
  describe("toArray", () => {
    it("should return empty array for undefined", () => {
      expect(toArray(undefined)).toEqual([]);
    });

    it("should wrap single value in array", () => {
      expect(toArray("single")).toEqual(["single"]);
      expect(toArray(42)).toEqual([42]);
    });

    it("should return array unchanged", () => {
      const arr = ["a", "b", "c"];
      expect(toArray(arr)).toEqual(arr);
    });
  });
});
