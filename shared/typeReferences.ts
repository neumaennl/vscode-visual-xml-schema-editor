/**
 * The check of a type reference, such as the type of an element or the base or member type of a simple
 * type, against what a schema offers. It works on values, not on schema objects (see ADR 006), so that the
 * properties panel and the validators of the extension host use the same rule.
 */

import { isBuiltInTypeName, XSD_NAMESPACE } from "./builtInTypes.js";
import type { NamespacePrefixes } from "./commands/schema.js";
import { isValidXmlName, localNameIfInTargetNamespace, resolveQName } from "./qNames.js";
import type { ValidationResult } from "./validation.js";

/** What a schema offers to type references. */
export interface TypeReferenceContext {
  /** The names of the simple and complex types of the schema */
  localTypeNames: readonly string[];
  /** The namespace declarations of the schema */
  namespacePrefixes: Readonly<NamespacePrefixes>;
  /** The target namespace of the schema, or `undefined` if it has none */
  targetNamespace: string | undefined;
  /** The namespaces that the schema imports */
  importedNamespaces: readonly string[];
  /** Whether the schema includes other schemas, whose types are in the target namespace too */
  hasIncludes: boolean;
}

/**
 * Checks a type reference, resolved with the namespace declarations of the schema (see `resolveQName()`):
 * it names a built-in type in the namespace of XML Schema, a type of the schema or of an included schema in
 * the target namespace, or a type in an imported namespace. The schemas that are imported or included are
 * not read, so their types are accepted by name (see "References to included and imported schemas are not
 * checked" in `docs/known-issues.md`).
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
  const expandedName = resolveQName(trimmedType, context.namespacePrefixes);
  if (expandedName && isValidXmlName(expandedName.localName)) {
    const { namespace, localName } = expandedName;
    if (namespace === XSD_NAMESPACE && isBuiltInTypeName(localName)) {
      return { valid: true };
    }
    const nameInTargetNamespace = localNameIfInTargetNamespace(
      trimmedType,
      context.namespacePrefixes,
      context.targetNamespace
    );
    if (
      nameInTargetNamespace !== undefined &&
      (context.localTypeNames.includes(nameInTargetNamespace) || context.hasIncludes)
    ) {
      return { valid: true };
    }
    if (context.importedNamespaces.includes(namespace)) {
      return { valid: true };
    }
  }
  return {
    valid: false,
    error: `Unknown type '${trimmedType}': use a built-in type, a type of this schema, a type of an imported schema with its prefix, or a type of an included schema`,
  };
}
