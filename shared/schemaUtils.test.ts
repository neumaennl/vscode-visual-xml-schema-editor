/**
 * Unit tests for schema utility functions.
 */

import { anonymousTypeId, getAttributeContainer, getContentDerivation, isSchemaRoot } from "./schemaUtils.js";
import { DERIVATIONS, derivedComplexTypeT, schemaWith } from "./__tests__/schemaTestHelpers.js";

describe("schemaUtils", () => {
  describe("anonymousTypeId", () => {
    test.each([
      ["simpleType", "/element:a/anonymousSimpleType[0]"],
      ["complexType", "/element:a/anonymousComplexType[0]"],
    ] as const)("should return the ID of the anonymous %s", (kind, expected) => {
      expect(anonymousTypeId("/element:a", kind)).toBe(expected);
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

  describe("getAttributeContainer and getContentDerivation", () => {
    test.each(DERIVATIONS)("should return the %s %s of a complex type", (content, derivation) => {
      const complexType = schemaWith(derivedComplexTypeT(content, derivation)).complexType![0]!;

      expect(getAttributeContainer(complexType)).toBe(complexType[content]![derivation]);
      expect(getContentDerivation(complexType)).toBe(complexType[content]![derivation]);
    });

    test("should return a complex type without complex or simple content itself, and no derivation", () => {
      const complexType = schemaWith(`<xs:complexType name="T"><xs:sequence/></xs:complexType>`).complexType![0]!;

      expect(getAttributeContainer(complexType)).toBe(complexType);
      expect(getContentDerivation(complexType)).toBeUndefined();
    });
  });
});
