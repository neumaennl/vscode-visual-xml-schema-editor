/**
 * Unit tests of `validationUtils`.
 */

import { validateTypeInSchema } from "./validationUtils.js";
import { emptySchema, schemaWith } from "../../shared/__tests__/schemaTestHelpers.js";

describe("validateTypeInSchema", () => {
  test("should accept built-in XSD types with the prefix of their namespace", () => {
    expect(validateTypeInSchema("xs:string", emptySchema()).valid).toBe(true);
    expect(validateTypeInSchema("xs:integer", emptySchema()).valid).toBe(true);
    expect(validateTypeInSchema("string", emptySchema()).valid).toBe(false);
  });

  // The schemas have no target namespace, so their types are referenced without a prefix
  test("should accept user-defined simpleType in schema", () => {
    const schemaObj = schemaWith(`<xs:simpleType name="StatusType"><xs:restriction base="xs:string"/></xs:simpleType>`);
    expect(validateTypeInSchema("StatusType", schemaObj).valid).toBe(true);
    expect(validateTypeInSchema("UnknownType", schemaObj).valid).toBe(false);
  });

  test("should accept user-defined complexType in schema", () => {
    const schemaObj = schemaWith(`<xs:complexType name="PersonType"/>`);
    expect(validateTypeInSchema("PersonType", schemaObj).valid).toBe(true);
    expect(validateTypeInSchema("UnknownType", schemaObj).valid).toBe(false);
  });

  test("should accept unqualified type when schema has includes", () => {
    const schemaObj = schemaWith(`<xs:include schemaLocation="other.xsd"/>`);
    expect(validateTypeInSchema("IncludedType", schemaObj).valid).toBe(true);
    expect(validateTypeInSchema("AnotherType", schemaObj).valid).toBe(true);
  });

  test("should reject unqualified unknown type when schema has no includes", () => {
    expect(validateTypeInSchema("UnknownType", emptySchema()).valid).toBe(false);
  });

  test("should reject empty type name", () => {
    expect(validateTypeInSchema("", emptySchema()).valid).toBe(false);
  });
});
