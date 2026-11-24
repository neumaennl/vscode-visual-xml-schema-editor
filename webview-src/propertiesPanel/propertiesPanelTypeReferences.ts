/**
 * Type references entered in the properties panel: the type names of the schema, and the prefix of the
 * target namespace that a reference to one of them gets.
 */

import { BUILT_IN_DATATYPES, isBuiltInTypeName } from "../../shared/builtInTypes";
import { getTargetNamespacePrefixes } from "../../shared/schemaUtils";
import { splitQName } from "../../shared/qNames";
import { type TypeReferenceContext, validateTypeReference } from "../../shared/typeReferences";
import {
  getImportedNamespaces,
  getLocalTypeNames,
  getNamespacePrefixes,
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
 * Returns the type names that the type fields suggest: the built-in data types of XML Schema and the types of
 * the node's schema, with and without the prefix of its target namespace.
 *
 * @param node - A diagram item of the schema
 * @returns The type names
 */
export function collectTypeSuggestions(node: DiagramItem): string[] {
  const suggestions = new Set(BUILT_IN_DATATYPES.map((localName) => `xs:${localName}`));
  const targetNamespacePrefix = getTargetNamespacePrefixes(node.diagram.schema)[0];
  for (const localName of localTypeNamesOf(node)) {
    suggestions.add(localName);
    if (targetNamespacePrefix) {
      suggestions.add(`${targetNamespacePrefix}:${localName}`);
    }
  }
  return Array.from(suggestions);
}

/**
 * Normalizes a type reference entered in the properties panel.
 * For local schema types, this prefixes with the schema `targetNamespace` prefix when available.
 *
 * @param node - Diagram item whose schema the type belongs to
 * @param nextType - The entered type reference
 * @returns The trimmed reference, with the prefix of the target namespace for a type of the schema
 */
export function normalizeTypeReference(node: DiagramItem, nextType: string): string {
  const typeName = nextType.trim();
  if (!typeName) {
    return typeName;
  }
  if (splitQName(typeName).prefix !== undefined) {
    return typeName;
  }

  const targetNamespacePrefix = getTargetNamespacePrefixes(node.diagram.schema)[0];
  if (!targetNamespacePrefix || isBuiltInTypeName(typeName)) {
    return typeName;
  }

  return localTypeNamesOf(node).has(typeName) ? `${targetNamespacePrefix}:${typeName}` : typeName;
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
      reject("Enter a type, such as xs:string");
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
