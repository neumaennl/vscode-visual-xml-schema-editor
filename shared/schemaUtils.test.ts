/**
 * Unit tests for schema utility functions.
 */

import { describe, it, expect } from "vitest";
import { toArray, isSchemaRoot } from "./schemaUtils";

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

  describe("isSchemaRoot", () => {
    it("should return true for undefined", () => {
      expect(isSchemaRoot(undefined)).toBe(true);
    });

    it('should return true for "schema"', () => {
      expect(isSchemaRoot("schema")).toBe(true);
    });

    it('should return true for "/schema"', () => {
      expect(isSchemaRoot("/schema")).toBe(true);
    });

    it("should return false for empty string", () => {
      expect(isSchemaRoot("")).toBe(false);
    });

    it("should return false for element IDs", () => {
      expect(isSchemaRoot("/element:age")).toBe(false);
      expect(isSchemaRoot("/element:person/element:name")).toBe(false);
    });

    it("should return false for attribute IDs", () => {
      expect(isSchemaRoot("/attribute:color")).toBe(false);
    });

    it("should return false for other non-root strings", () => {
      expect(isSchemaRoot("root")).toBe(false);
      expect(isSchemaRoot("schemas")).toBe(false);
    });
  });
});
