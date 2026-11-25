/**
 * Unit tests of `typeReferences`.
 */

import { XSD_NAMESPACE } from "./builtInTypes.js";
import { type TypeReferenceContext, validateTypeReference } from "./typeReferences.js";

/**
 * A schema with the target namespace `urn:t` and its type `Address`, the prefixes `xs` and `xsd` of XML Schema,
 * `tns` of the target namespace, `ext` of an import and `other` of a namespace without import.
 */
const CONTEXT: TypeReferenceContext = {
  localTypeNames: ["Address"],
  namespacePrefixes: { xs: XSD_NAMESPACE, xsd: XSD_NAMESPACE, tns: "urn:t", ext: "urn:ext", other: "urn:other" },
  targetNamespace: "urn:t",
  importedNamespaces: ["urn:ext"],
  hasIncludes: false,
};

/**
 * Returns the error for an unknown type.
 *
 * @param type - The type reference
 * @returns The validation result
 */
function unknownType(type: string): { valid: false; error: string } {
  return {
    valid: false,
    error: `Unknown type '${type}': use a built-in type, a type of this schema, a type of an imported schema with its prefix, or a type of an included schema`,
  };
}

describe("validateTypeReference", () => {
  test.each(["xs:string", "xsd:int", "tns:Address", "ext:Anything"])("should accept %j", (type) => {
    expect(validateTypeReference(type, CONTEXT)).toEqual({ valid: true });
  });

  test.each([
    // Without a default namespace, a name without a prefix is in no namespace
    "string",
    "Address",
    // A built-in type is only in the namespace of XML Schema
    "tns:string",
    "undeclared:string",
    "Unknown",
    "other:Code",
    "tns:Unknown",
  ])("should reject %j", (type) => {
    expect(validateTypeReference(type, CONTEXT)).toEqual(unknownType(type));
  });

  test.each([
    ["the namespace of XML Schema", XSD_NAMESPACE, "string"],
    ["the target namespace", "urn:t", "Address"],
  ])("should accept a name without a prefix if the default namespace is %s", (_case, defaultNamespace, type) => {
    const context = { ...CONTEXT, namespacePrefixes: { ...CONTEXT.namespacePrefixes, "": defaultNamespace } };

    expect(validateTypeReference(type, context)).toEqual({ valid: true });
  });

  test("should accept any valid name in the target namespace if the schema includes other schemas", () => {
    const withIncludes = { ...CONTEXT, hasIncludes: true };

    expect(validateTypeReference("tns:Included", withIncludes)).toEqual({ valid: true });
    expect(validateTypeReference("tns:1bad", withIncludes)).toEqual(unknownType("tns:1bad"));
    expect(validateTypeReference("other:Included", withIncludes)).toEqual(unknownType("other:Included"));
  });

  test("should require a type", () => {
    expect(validateTypeReference("  ", CONTEXT)).toEqual({ valid: false, error: "Type is required" });
  });
});
