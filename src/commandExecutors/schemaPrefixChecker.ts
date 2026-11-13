/**
 * Utilities for inspecting whether a namespace prefix (or set of prefixes)
 * is referenced anywhere in the schema tree.
 *
 * Exported functions:
 * - {@link isPrefixReferencedInSchema} — returns `true` if any QName uses the given prefix.
 * - {@link isAnyPrefixReferencedInSchema} — same but accepts a set of prefixes.
 */

import { schema } from "../../shared/types.js";
import { forEachQNameReference } from "./schemaQNameReferences.js";

/**
 * Returns `true` if any QName-valued field in the schema uses the given
 * prefix (i.e. starts with `prefix:`).
 *
 * @param prefix - The namespace prefix to search for (without the colon)
 * @param schemaObj - The schema object to inspect
 * @returns `true` if at least one QName uses `prefix:`, `false` otherwise
 */
export function isPrefixReferencedInSchema(prefix: string, schemaObj: schema): boolean {
  return isAnyPrefixReferencedInSchema(new Set([prefix]), schemaObj);
}

/**
 * Returns `true` if any QName-valued field in the schema uses at least one of
 * the given prefixes.  The entire schema is traversed only once regardless of
 * how many prefixes are in the set.
 *
 * @param prefixes - Set of namespace prefixes to search for (without colon)
 * @param schemaObj - The schema object to inspect
 * @returns `true` if at least one QName uses any of the given prefixes
 */
export function isAnyPrefixReferencedInSchema(prefixes: ReadonlySet<string>, schemaObj: schema): boolean {
  let referenced = false;
  forEachQNameReference(schemaObj, (reference) => {
    const colon = reference.value.indexOf(":");
    if (colon > 0 && prefixes.has(reference.value.slice(0, colon))) {
      referenced = true;
    }
  });
  return referenced;
}
