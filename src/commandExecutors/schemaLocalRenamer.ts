/**
 * Utilities for renaming schema-local type, group, attribute group,
 * and element references throughout the schema when a definition is renamed.
 *
 * Exported functions:
 * - {@link renameLocalTypeInSchema} — renames unqualified and current-schema-prefixed type references.
 * - {@link renameLocalGroupRefInSchema} — renames all `group/@ref` occurrences.
 * - {@link renameLocalAttributeGroupRefInSchema} — renames all `attributeGroup/@ref` occurrences.
 * - {@link renameLocalElementRefInSchema} — renames all element `@ref` and `@substitutionGroup` values.
 */

import { schema } from "../../shared/types.js";
import { getCurrentSchemaPrefixes } from "../../shared/schemaUtils.js";
import { forEachQNameReference, QNameKind } from "./schemaQNameReferences.js";

/**
 * Renames the references of one kind from `oldName` to `newName`: the unqualified ones and those
 * that use one of the schema's own targetNamespace prefixes.
 *
 * @param kind - What the references refer to
 * @param oldName - The current (old) local name
 * @param newName - The replacement name
 * @param schemaObj - The schema object to mutate in place
 */
function renameReferences(kind: QNameKind, oldName: string, newName: string, schemaObj: schema): void {
  if (oldName === newName) return;
  const renames = new Map([[oldName, newName]]);
  for (const prefix of getCurrentSchemaPrefixes(schemaObj)) {
    renames.set(`${prefix}:${oldName}`, `${prefix}:${newName}`);
  }
  forEachQNameReference(schemaObj, (reference) => {
    const renamed = reference.kind === kind ? renames.get(reference.value) : undefined;
    if (renamed !== undefined) {
      reference.replace(renamed);
    }
  });
}

/**
 * Renames schema-local type references from `oldName` to `newName`
 * throughout the schema.
 *
 * Fields updated: `element/@type`, `attribute/@type`,
 * `restriction/@base`, `extension/@base`, `list/@itemType`,
 * `union/@memberTypes` (space-separated token list).
 *
 * This updates both unqualified references and QName references that use one of
 * the schema's own targetNamespace prefixes.
 *
 * @param oldName - The current (old) local type name
 * @param newName - The replacement type name
 * @param schemaObj - The schema object to mutate in place
 */
export function renameLocalTypeInSchema(oldName: string, newName: string, schemaObj: schema): void {
  renameReferences("type", oldName, newName, schemaObj);
}

/**
 * Renames all `xs:group ref="oldName"` occurrences to `ref="newName"`
 * throughout the schema.
 *
 * @param oldName - The current (old) group name
 * @param newName - The replacement group name
 * @param schemaObj - The schema object to mutate in place
 */
export function renameLocalGroupRefInSchema(oldName: string, newName: string, schemaObj: schema): void {
  renameReferences("group", oldName, newName, schemaObj);
}

/**
 * Renames all `xs:attributeGroup ref="oldName"` occurrences to
 * `ref="newName"` throughout the schema.
 *
 * @param oldName - The current (old) attribute group name
 * @param newName - The replacement attribute group name
 * @param schemaObj - The schema object to mutate in place
 */
export function renameLocalAttributeGroupRefInSchema(oldName: string, newName: string, schemaObj: schema): void {
  renameReferences("attributeGroup", oldName, newName, schemaObj);
}

/**
 * Renames all local element references (`element/@ref` and
 * `element/@substitutionGroup`) from `oldName` to `newName` throughout the
 * schema.
 *
 * @param oldName - The current (old) element name
 * @param newName - The replacement element name
 * @param schemaObj - The schema object to mutate in place
 */
export function renameLocalElementRefInSchema(oldName: string, newName: string, schemaObj: schema): void {
  renameReferences("element", oldName, newName, schemaObj);
}
