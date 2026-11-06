/**
 * Unit tests for schema utility functions.
 */

import { isSchemaRoot } from "./schemaUtils.js";

describe("schemaUtils", () => {
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
