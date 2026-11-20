/**
 * Unit tests of `typeReferences`.
 */

import { type TypeReferenceContext, validateTypeReference } from "./typeReferences.js";

/** A schema with the type `Address`, the prefix `ext` of an import and `other` of a namespace without import. */
const CONTEXT: TypeReferenceContext = {
  localTypeNames: ["Address"],
  namespacePrefixes: { tns: "urn:t", ext: "urn:ext", other: "urn:other" },
  importedNamespaces: ["urn:ext"],
  hasIncludes: false,
};

describe("validateTypeReference", () => {
  test.each(["xs:string", "string", "xsd:int", "Address", "tns:Address", "ext:Anything"])(
    "should accept %j",
    (type) => {
      expect(validateTypeReference(type, CONTEXT)).toEqual({ valid: true });
    }
  );

  test.each(["Unknown", "other:Code", "undeclared:Code", "tns:Unknown"])("should reject %j", (type) => {
    expect(validateTypeReference(type, CONTEXT)).toEqual({
      valid: false,
      error: `Unknown type '${type}': use a built-in type, a type of this schema, a type of an imported schema with its prefix, or a type of an included schema`,
    });
  });

  test("should require a type", () => {
    expect(validateTypeReference("  ", CONTEXT)).toEqual({ valid: false, error: "Type is required" });
  });

  test("should accept a type without a prefix from an included schema, if it is a valid name", () => {
    const withIncludes = { ...CONTEXT, hasIncludes: true };
    expect(validateTypeReference("Included", withIncludes).valid).toBe(true);
    expect(validateTypeReference("1bad", withIncludes).valid).toBe(false);
    expect(validateTypeReference("other:Code", withIncludes).valid).toBe(false);
  });
});
