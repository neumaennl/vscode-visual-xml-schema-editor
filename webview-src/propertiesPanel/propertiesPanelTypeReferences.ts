/**
 * Type references entered in the properties panel: the type names of the schema, and the prefix of the
 * target namespace that a reference to one of them gets.
 */

import { BUILT_IN_DATATYPES, isBuiltInTypeName } from "../../shared/builtInTypes";
import { SchemaNodeType } from "../../shared/idStrategy";
import { splitQName } from "../../shared/qNames";
import type { DiagramItem } from "../diagram";
import type { CommitHandler } from "./propertiesPanelDom";
import { getNodeType } from "./propertiesPanelNodeKinds";

/**
 * Collects and caches top-level/local simpleType and complexType names from the active diagram.
 *
 * @param node - Any diagram node that belongs to the currently rendered diagram
 * @returns A set of discovered local schema type names
 */
function collectLocalSchemaTypeNames(node: DiagramItem): ReadonlySet<string> {
  const cached = node.diagram?.localSchemaTypeNames;
  if (cached) {
    return cached;
  }

  const names = new Set<string>();
  const visit = (item: DiagramItem): void => {
    const itemNodeType = getNodeType(item);
    if ((itemNodeType === SchemaNodeType.SimpleType || itemNodeType === SchemaNodeType.ComplexType) && item.name) {
      const localName = item.name.trim();
      if (localName) {
        names.add(localName);
      }
    }
    for (const child of item.childElements) {
      visit(child);
    }
  };
  for (const root of node.diagram?.rootElements ?? []) {
    visit(root);
  }
  if (node.diagram) {
    node.diagram.localSchemaTypeNames = names;
  }
  return names;
}

/**
 * Returns the type names that the type fields suggest: the built-in data types of XML Schema and the types of
 * the node's schema, with and without the prefix of its target namespace.
 *
 * @param node - A diagram item of the schema, or null for the built-in types only
 * @returns The type names
 */
export function collectTypeSuggestions(node: DiagramItem | null): string[] {
  const suggestions = new Set(BUILT_IN_DATATYPES.map((localName) => `xs:${localName}`));
  if (!node) {
    return Array.from(suggestions);
  }
  const currentSchemaPrefix = node.diagram?.currentSchemaPrefix;
  for (const localName of collectLocalSchemaTypeNames(node)) {
    suggestions.add(localName);
    if (currentSchemaPrefix) {
      suggestions.add(`${currentSchemaPrefix}:${localName}`);
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

  const currentSchemaPrefix = node.diagram?.currentSchemaPrefix?.trim();
  if (!currentSchemaPrefix || isBuiltInTypeName(typeName)) {
    return typeName;
  }

  const localSchemaTypeNames = collectLocalSchemaTypeNames(node);
  return localSchemaTypeNames.has(typeName) ? `${currentSchemaPrefix}:${typeName}` : typeName;
}

/**
 * Returns the commit callback of a type field: it calls `apply` only when the new type differs from the
 * current one, both normalized for the current schema (see {@link normalizeTypeReference}), and rejects an
 * empty type with a message unless `allowEmpty` is set.
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
    apply(normalizedNext, next);
  };
}
