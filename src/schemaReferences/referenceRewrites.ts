/**
 * Rewrites the QNames of a schema: the references to a component of the schema itself when it is renamed,
 * and every QName with a prefix when the prefix is renamed.
 */

import type { schema } from "../../shared/types.js";
import { ownComponentName, splitQName } from "../../shared/qNames.js";
import { getTargetNamespacePrefixes } from "../../shared/schemaUtils.js";
import type { QNameKind } from "./qNameReferences.js";
import { forEachQNameReference } from "./qNameReferences.js";

/**
 * Renames the references of one kind to a component of the schema itself from `oldName` to `newName`:
 * those without a prefix and those with a prefix of the schema's target namespace (see
 * {@link ownComponentName}), which keep their prefix. For `element`, this includes `substitutionGroup`.
 *
 * @param kind - What the references refer to
 * @param oldName - The current local name
 * @param newName - The new local name
 * @param schemaObj - The schema object to mutate in place
 */
export function renameOwnReferences(kind: QNameKind, oldName: string, newName: string, schemaObj: schema): void {
  if (oldName === newName) return;
  const tnsPrefixes = getTargetNamespacePrefixes(schemaObj);
  forEachQNameReference(schemaObj, (reference) => {
    if (reference.kind !== kind || ownComponentName(reference.value, tnsPrefixes) !== oldName) {
      return;
    }
    const { prefix } = splitQName(reference.value);
    reference.replace(prefix === undefined ? newName : `${prefix}:${newName}`);
  });
}

/**
 * Rewrites all QNames in the schema that use `oldPrefix`, replacing the prefix with `newPrefix`: the
 * `type`, `base`, `itemType`, `memberTypes`, `ref`, `substitutionGroup` and `refer` attributes and the
 * names in an `xpath`, wherever they occur.
 *
 * @param oldPrefix - The prefix being replaced
 * @param newPrefix - The replacement prefix
 * @param schemaObj - The schema object to mutate in place
 */
export function rewritePrefix(oldPrefix: string, newPrefix: string, schemaObj: schema): void {
  if (oldPrefix === newPrefix) return;
  forEachQNameReference(schemaObj, (reference) => {
    const { prefix, localName } = splitQName(reference.value);
    if (prefix === oldPrefix) {
      reference.replace(`${newPrefix}:${localName}`);
    }
  });
}
