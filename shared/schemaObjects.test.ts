/**
 * Unit tests of `schemaObjects`.
 */

import { getAttributeContainer, getContentDerivation, getTargetNamespacePrefixes } from "./schemaObjects.js";
import { DERIVATIONS, derivedComplexTypeT, schemaWith } from "./__tests__/schemaTestHelpers.js";

describe("schemaObjects", () => {
  describe("getTargetNamespacePrefixes", () => {
    test.each([
      [
        "every prefix of the target namespace, in the order of the declarations",
        "urn:t",
        { a: "urn:t", other: "urn:o", b: "urn:t" },
        ["a", "b"],
      ],
      ["no default namespace, which has no prefix", "urn:t", { "": "urn:t", tns: "urn:t" }, ["tns"]],
      ["nothing for a target namespace without a prefix", "urn:t", { other: "urn:o" }, []],
      ["nothing for a schema without a target namespace", undefined, { tns: "urn:t" }, []],
    ])("should return %s", (_case, targetNamespace, namespaces, expected) => {
      const schemaObj = schemaWith("", namespaces);
      schemaObj.targetNamespace = targetNamespace;

      expect(getTargetNamespacePrefixes(schemaObj)).toEqual(expected);
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
