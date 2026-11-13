/**
 * Utilities for rewriting QName-valued attributes in the schema tree when a
 * namespace prefix changes.
 *
 * Exported functions:
 * - {@link rewritePrefixInSchema} — walks the entire schema object tree and
 *   replaces every `oldPrefix:localName` occurrence with `newPrefix:localName`.
 */

import { schema } from "../../shared/types.js";
import { forEachQNameReference } from "./schemaQNameReferences.js";

/**
 * Rewrites all QName-valued attributes in the schema that use
 * `oldPrefix:localName`, replacing them with `newPrefix:localName`:
 * the `type`, `base`, `itemType`, `memberTypes`, `ref`, `substitutionGroup`
 * and `refer` attributes wherever they occur.
 *
 * Called automatically by `executeModifyImport` when the prefix is renamed.
 *
 * @param oldPrefix - The prefix being replaced
 * @param newPrefix - The replacement prefix
 * @param schemaObj - The schema object to mutate in place
 */
export function rewritePrefixInSchema(oldPrefix: string, newPrefix: string, schemaObj: schema): void {
  if (oldPrefix === newPrefix) return;
  const qualifier = `${oldPrefix}:`;
  forEachQNameReference(schemaObj, (reference) => {
    if (reference.value.startsWith(qualifier)) {
      reference.replace(`${newPrefix}:${reference.value.slice(qualifier.length)}`);
    }
  });
}
