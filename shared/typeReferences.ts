/**
 * The check of a type reference, such as the type of an element or the base or member type of a simple
 * type, against what a schema offers. It works on values, not on schema objects (see ADR 006), so that the
 * properties panel and the validators of the extension host use the same rule.
 */

import { isBuiltInTypeName } from "./builtInTypes.js";
import type { NamespacePrefixes } from "./commands/schema.js";
import { isValidXmlName, splitQName } from "./qNames.js";
import type { ValidationResult } from "./validation.js";

/** What a schema offers to type references. */
export interface TypeReferenceContext {
  /** The names of the simple and complex types of the schema */
  localTypeNames: readonly string[];
  /** The namespace declarations of the schema */
  namespacePrefixes: Readonly<NamespacePrefixes>;
  /** The namespaces that the schema imports */
  importedNamespaces: readonly string[];
  /** Whether the schema includes other schemas, whose types are referenced without a prefix */
  hasIncludes: boolean;
}

/**
 * Checks a type reference: it names a built-in type, a type of the schema, a type of an imported schema
 * with a prefix of its namespace, or, without a prefix, a type of an included schema. The schemas that are
 * imported or included are not read, so their types are accepted by name (see "References to included and
 * imported schemas are not checked" in `docs/known-issues.md`).
 *
 * @param typeName - The type reference, such as `xs:string` or `tns:Address`
 * @param context - What the schema offers
 * @returns The validation result
 */
export function validateTypeReference(typeName: string, context: TypeReferenceContext): ValidationResult {
  const trimmedType = typeName.trim();
  if (!trimmedType) {
    return { valid: false, error: "Type is required" };
  }
  const { prefix, localName } = splitQName(trimmedType);

  // A built-in XSD type, with any prefix or none (see "Built-in types are recognized by their local name
  // only" in docs/known-issues.md)
  if (isBuiltInTypeName(localName) || context.localTypeNames.includes(localName)) {
    return { valid: true };
  }
  if (prefix !== undefined) {
    const namespaceUri = context.namespacePrefixes[prefix];
    if (namespaceUri !== undefined && context.importedNamespaces.includes(namespaceUri)) {
      return { valid: true };
    }
  } else if (context.hasIncludes && isValidXmlName(localName)) {
    // Included schemas share the target namespace, so their types are referenced without a prefix
    return { valid: true };
  }
  return {
    valid: false,
    error: `Unknown type '${trimmedType}': use a built-in type, a type of this schema, a type of an imported schema with its prefix, or a type of an included schema`,
  };
}
