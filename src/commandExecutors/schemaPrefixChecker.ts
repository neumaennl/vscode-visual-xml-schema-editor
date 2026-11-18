/**
 * Checks whether namespace prefixes are referenced anywhere in the schema tree.
 */

import type { schema } from "../../shared/types.js";
import { splitQName } from "../../shared/qNames.js";
import { forEachQNameReference } from "./schemaQNameReferences.js";

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
    const { prefix } = splitQName(reference.value);
    if (prefix !== undefined && prefixes.has(prefix)) {
      referenced = true;
    }
  });
  return referenced;
}
