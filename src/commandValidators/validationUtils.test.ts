import { validateTypeInSchema } from "./validationUtils.js";
import { XSD_NAMESPACE } from "../../shared/builtInTypes.js";

describe("validateTypeInSchema", () => {
  const emptySchema = { _namespacePrefixes: { xs: XSD_NAMESPACE } };

  test("should accept built-in XSD types with the prefix of their namespace", () => {
    expect(validateTypeInSchema("xs:string", emptySchema).valid).toBe(true);
    expect(validateTypeInSchema("xs:integer", emptySchema).valid).toBe(true);
    expect(validateTypeInSchema("string", emptySchema).valid).toBe(false);
  });

  test("should accept user-defined simpleType in schema", () => {
    const schemaObj = { simpleType: [{ name: "StatusType" }] };
    expect(validateTypeInSchema("StatusType", schemaObj).valid).toBe(true);
    expect(validateTypeInSchema("UnknownType", schemaObj).valid).toBe(false);
  });

  test("should accept user-defined complexType in schema", () => {
    const schemaObj = { complexType: [{ name: "PersonType" }] };
    expect(validateTypeInSchema("PersonType", schemaObj).valid).toBe(true);
    expect(validateTypeInSchema("UnknownType", schemaObj).valid).toBe(false);
  });

  test("should accept unqualified type when schema has includes", () => {
    const schemaObj = { include: [{ schemaLocation: "other.xsd" }] };
    expect(validateTypeInSchema("IncludedType", schemaObj).valid).toBe(true);
    expect(validateTypeInSchema("AnotherType", schemaObj).valid).toBe(true);
  });

  test("should reject unqualified unknown type when schema has no includes", () => {
    const schemaObj = {};
    const result = validateTypeInSchema("UnknownType", schemaObj);
    expect(result.valid).toBe(false);
  });

  test("should reject empty type name", () => {
    const result = validateTypeInSchema("", emptySchema);
    expect(result.valid).toBe(false);
  });
});
