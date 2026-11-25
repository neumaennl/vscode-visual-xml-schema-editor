/**
 * Type references entered in the properties panel: the type names of the schema, and how a reference to a
 * built-in type or to a type of the schema is written with the namespace declarations of the schema.
 */

import { BUILT_IN_DATATYPES, isBuiltInTypeName, xsdQName } from "../../shared/builtInTypes";
import { qualifiedName, splitQName } from "../../shared/qNames";
import { type TypeReferenceContext, validateTypeReference } from "../../shared/typeReferences";
import {
  getImportedNamespaces,
  getLocalTypeNames,
  getNamespacePrefixes,
  getTargetNamespace,
  hasIncludes,
  type DiagramItem,
} from "../diagram";
import type { CommitHandler } from "./propertiesPanelFields";

/**
 * Returns the names of the named simple and complex types of a node's schema.
 *
 * @param node - A diagram item of the schema
 * @returns The names
 */
function localTypeNamesOf(node: DiagramItem): ReadonlySet<string> {
  return new Set(getLocalTypeNames(node.diagram));
}

/**
 * Writes the name of a type of a node's schema as a reference: with the prefix of the target namespace, or
 * without a prefix if that refers to the target namespace (see `qualifiedName()`).
 *
 * @param node - A diagram item of the schema
 * @param localName - The name of the type
 * @returns The reference, or `undefined` if the schema declares no way to refer to its target namespace
 */
function localTypeReference(node: DiagramItem, localName: string): string | undefined {
  return qualifiedName(getTargetNamespace(node.diagram), localName, getNamespacePrefixes(node.diagram));
}

/**
 * Returns the type names that the type fields suggest: the built-in data types of XML Schema, with the
 * schema's prefix for its namespace, and the types of the node's schema, as entered and as a reference.
 *
 * @param node - A diagram item of the schema
 * @returns The type names
 */
export function collectTypeSuggestions(node: DiagramItem): string[] {
  const namespacePrefixes = getNamespacePrefixes(node.diagram);
  const suggestions = new Set(BUILT_IN_DATATYPES.map((localName) => xsdQName(localName, namespacePrefixes)));
  for (const localName of localTypeNamesOf(node)) {
    suggestions.add(localName);
    const reference = localTypeReference(node, localName);
    if (reference) {
      suggestions.add(reference);
    }
  }
  return Array.from(suggestions);
}

/**
 * Normalizes a type reference entered in the properties panel. A name without a prefix that names a type of
 * the schema or a built-in type is written as a reference to it (see `qualifiedName()`), such as `tns:Address`
 * or `xs:string`; a type of the schema comes first.
 *
 * @param node - Diagram item whose schema the type belongs to
 * @param nextType - The entered type reference
 * @returns The trimmed reference
 */
export function normalizeTypeReference(node: DiagramItem, nextType: string): string {
  const typeName = nextType.trim();
  if (!typeName || splitQName(typeName).prefix !== undefined) {
    return typeName;
  }
  if (localTypeNamesOf(node).has(typeName)) {
    return localTypeReference(node, typeName) ?? typeName;
  }
  return isBuiltInTypeName(typeName) ? xsdQName(typeName, getNamespacePrefixes(node.diagram)) : typeName;
}

/**
 * Returns what the schema of a node offers to type references, for {@link validateTypeReference}.
 *
 * @param node - A diagram item of the schema
 * @returns The type names, namespace declarations, imported namespaces and includes of the schema
 */
export function typeReferenceContextOf(node: DiagramItem): TypeReferenceContext {
  const { diagram } = node;
  return {
    localTypeNames: [...localTypeNamesOf(node)],
    namespacePrefixes: getNamespacePrefixes(diagram),
    targetNamespace: getTargetNamespace(diagram),
    importedNamespaces: getImportedNamespaces(diagram),
    hasIncludes: hasIncludes(diagram),
  };
}

/**
 * Returns the commit callback of a type field: it calls `apply` only when the new type differs from the
 * current one, both normalized for the current schema (see {@link normalizeTypeReference}). It rejects an
 * empty type with a message unless `allowEmpty` is set, and a type that the schema does not offer (see
 * {@link validateTypeReference}).
 *
 * @param node - Diagram item whose type field this is
 * @param current - The current type
 * @param apply - Applies the change; gets the normalized and the entered new type
 * @param allowEmpty - Whether an empty type is applied too, which removes the type
 * @returns The commit callback
 */
export function createTypeCommitHandler(
  node: DiagramItem,
  current: string,
  apply: (normalizedNext: string, next: string) => void,
  allowEmpty = false
): CommitHandler {
  return (next, reject) => {
    const normalizedNext = normalizeTypeReference(node, next);
    if (!normalizedNext && !allowEmpty) {
      reject(`Enter a type, such as ${xsdQName("string", getNamespacePrefixes(node.diagram))}`);
      return;
    }
    if (normalizedNext === normalizeTypeReference(node, current)) {
      return;
    }
    if (normalizedNext) {
      const result = validateTypeReference(normalizedNext, typeReferenceContextOf(node));
      if (!result.valid) {
        reject(result.error);
        return;
      }
    }
    apply(normalizedNext, next);
  };
}
