/**
 * Unit tests of `builtInTypes`.
 */

import { BUILT_IN_DATATYPES, isBuiltInTypeName } from "./builtInTypes.js";

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
