/**
 * Checks whether a schema refers to something: to one of its own components, or with one of a set of
 * namespace prefixes.
 */

import type { schema } from "../../shared/types.js";
import { localNameIfInTargetNamespace, splitQName } from "../../shared/qNames.js";
import type { QNameKind } from "./qNameReferences.js";
import { forEachQNameReference } from "./qNameReferences.js";

/**
 * Returns true if the schema refers to its own component of the given kind and name anywhere, with a
 * QName that resolves to its target namespace (see {@link localNameIfInTargetNamespace}), as the renames
 * find them.
 *
 * @param schemaObj - The schema to search
 * @param kind - What the references refer to
 * @param name - The local name of the component
 * @returns Whether a reference was found
 */
export function isReferenced(schemaObj: schema, kind: QNameKind, name: string): boolean {
  const namespacePrefixes = schemaObj._namespacePrefixes ?? {};
  let referenced = false;
  forEachQNameReference(schemaObj, (reference) => {
    const localName = localNameIfInTargetNamespace(reference.value, namespacePrefixes, schemaObj.targetNamespace);
    if (reference.kind === kind && localName === name) {
      referenced = true;
    }
  });
  return referenced;
}

/**
 * Returns true if a QName anywhere in the schema uses at least one of the given prefixes. The schema is
 * walked once, however many prefixes the set holds.
 *
 * @param prefixes - The namespace prefixes, without colon
 * @param schemaObj - The schema to search
 * @returns Whether a QName uses one of the prefixes
 */
export function isAnyPrefixReferenced(prefixes: ReadonlySet<string>, schemaObj: schema): boolean {
  let referenced = false;
  forEachQNameReference(schemaObj, (reference) => {
    const { prefix } = splitQName(reference.value);
    if (prefix !== undefined && prefixes.has(prefix)) {
      referenced = true;
    }
  });
  return referenced;
}
