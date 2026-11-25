/**
 * Unit tests of `builtInTypes`.
 */

import { BUILT_IN_DATATYPES, isBuiltInTypeName, XSD_NAMESPACE, xsdQName } from "./builtInTypes.js";

describe("BUILT_IN_DATATYPES", () => {
  test("should list the 44 data types of XML Schema 1.0 once each", () => {
    expect(new Set(BUILT_IN_DATATYPES).size).toBe(44);
  });
});

describe("isBuiltInTypeName", () => {
  test.each(["string", "unsignedByte", "gYearMonth", "anyType", "anySimpleType"])("should accept %s", (name) => {
    expect(isBuiltInTypeName(name)).toBe(true);
  });

  test.each(["xs:string", "String", "Address", ""])("should reject %s", (name) => {
    expect(isBuiltInTypeName(name)).toBe(false);
  });
});

describe("xsdQName", () => {
  test.each([
    ["the prefix xs", { xs: XSD_NAMESPACE }, "xs:string"],
    ["another prefix", { xsd: XSD_NAMESPACE, tns: "urn:t" }, "xsd:string"],
    ["a prefix besides the default namespace", { "": XSD_NAMESPACE, xs: XSD_NAMESPACE }, "xs:string"],
    ["only the default namespace", { "": XSD_NAMESPACE }, "string"],
  ])("should write a built-in type in a schema that declares XML Schema with %s", (_case, declarations, expected) => {
    expect(xsdQName("string", declarations)).toBe(expected);
  });

  test("should reject a schema that does not declare the namespace of XML Schema", () => {
    expect(() => xsdQName("string", { tns: "urn:t" })).toThrow(
      "The schema does not declare the namespace of XML Schema"
    );
  });
});
