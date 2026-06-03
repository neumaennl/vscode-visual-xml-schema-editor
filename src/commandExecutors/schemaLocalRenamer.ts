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

import {
  schema,
  topLevelComplexType,
  localComplexType,
  topLevelSimpleType,
  localSimpleType,
  explicitGroup,
  simpleExplicitGroup,
  localElement,
  narrowMaxMin,
  groupRef,
  attributeGroupRef,
} from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";
import { AttributeBearer, CompositorBearer } from "./schemaTraversalTypes";

// ===== Local name renaming helpers =====

function getCurrentSchemaPrefixes(schemaObj: schema): string[] {
  const targetNamespace = schemaObj.targetNamespace?.toString();
  if (!targetNamespace) {
    return [];
  }
  return Object.entries(schemaObj._namespacePrefixes ?? {})
    .filter(([prefix, namespaceUri]) => prefix.trim().length > 0 && namespaceUri === targetNamespace)
    .map(([prefix]) => prefix);
}

/**
 * Returns `newName` when `value` is exactly `oldName` (unqualified — no colon),
 * otherwise passes `value` through unchanged (including `undefined`).
 */
function renameSchemaScopedName(
  oldName: string,
  newName: string,
  value: string | undefined,
  currentSchemaPrefixes: readonly string[]
): string | undefined {
  if (value === oldName) {
    return newName;
  }
  for (const prefix of currentSchemaPrefixes) {
    if (value === `${prefix}:${oldName}`) {
      return `${prefix}:${newName}`;
    }
  }
  return value;
}

/**
 * Like {@link renameLocalName} but for required (non-optional) string fields.
 */
function renameRequiredSchemaScopedName(
  oldName: string,
  newName: string,
  value: string,
  currentSchemaPrefixes: readonly string[]
): string {
  return renameSchemaScopedName(oldName, newName, value, currentSchemaPrefixes) ?? value;
}

/**
 * Renames `oldName` to `newName` within the space-separated `memberTypes`
 * attribute used by `xs:union`.
 */
function renameSchemaScopedMemberTypes(
  oldName: string,
  newName: string,
  value: string | undefined,
  currentSchemaPrefixes: readonly string[]
): string | undefined {
  if (!value) return value;
  return value
    .split(/\s+/)
    .map((t) => renameSchemaScopedName(oldName, newName, t, currentSchemaPrefixes) ?? t)
    .join(" ");
}

function renameSimpleTypeLocalNames(
  old: string,
  newName: string,
  st: localSimpleType | topLevelSimpleType,
  currentSchemaPrefixes: readonly string[]
): void {
  if (st.restriction) {
    st.restriction.base = renameRequiredSchemaScopedName(
      old,
      newName,
      st.restriction.base,
      currentSchemaPrefixes
    );
    if (st.restriction.simpleType) {
      renameSimpleTypeLocalNames(old, newName, st.restriction.simpleType, currentSchemaPrefixes);
    }
  }
  if (st.list) {
    st.list.itemType = renameSchemaScopedName(old, newName, st.list.itemType, currentSchemaPrefixes);
    if (st.list.simpleType) {
      renameSimpleTypeLocalNames(old, newName, st.list.simpleType, currentSchemaPrefixes);
    }
  }
  if (st.union) {
    st.union.memberTypes = renameSchemaScopedMemberTypes(
      old,
      newName,
      st.union.memberTypes,
      currentSchemaPrefixes
    );
    for (const m of toArray(st.union.simpleType)) {
      renameSimpleTypeLocalNames(old, newName, m, currentSchemaPrefixes);
    }
  }
}

function renameElementTypeLocalNames(
  old: string,
  newName: string,
  el: localElement | narrowMaxMin,
  currentSchemaPrefixes: readonly string[]
): void {
  el.type_ = renameSchemaScopedName(old, newName, el.type_, currentSchemaPrefixes);
  // el.ref is an element reference, not a type reference — handled separately
  if (el.simpleType) renameSimpleTypeLocalNames(old, newName, el.simpleType, currentSchemaPrefixes);
  if (el.complexType) renameComplexTypeBodyLocalNames(old, newName, el.complexType, currentSchemaPrefixes);
}

function renameCompositorTypeLocalNames(
  old: string,
  newName: string,
  compositor: explicitGroup | simpleExplicitGroup,
  currentSchemaPrefixes: readonly string[]
): void {
  for (const el of toArray(compositor.element)) {
    renameElementTypeLocalNames(old, newName, el, currentSchemaPrefixes);
  }
  // compositor.group refs are group references, not type refs — not touched here
  for (const sub of toArray(compositor.choice)) {
    renameCompositorTypeLocalNames(old, newName, sub, currentSchemaPrefixes);
  }
  for (const sub of toArray(compositor.sequence)) {
    renameCompositorTypeLocalNames(old, newName, sub, currentSchemaPrefixes);
  }
}

function renameAttributeBearerLocalNames(
  old: string,
  newName: string,
  bearer: AttributeBearer,
  currentSchemaPrefixes: readonly string[]
): void {
  bearer.base = renameRequiredSchemaScopedName(old, newName, bearer.base, currentSchemaPrefixes);
  for (const attr of toArray(bearer.attribute)) {
    attr.type_ = renameSchemaScopedName(old, newName, attr.type_, currentSchemaPrefixes);
    // attr.ref is an attribute reference, not a type reference — not touched here
    if (attr.simpleType) renameSimpleTypeLocalNames(old, newName, attr.simpleType, currentSchemaPrefixes);
  }
  // bearer.attributeGroup refs are attributeGroup refs, not type refs — not touched here
}

function renameCompositorBearerLocalNames(
  old: string,
  newName: string,
  bearer: CompositorBearer,
  currentSchemaPrefixes: readonly string[]
): void {
  renameAttributeBearerLocalNames(old, newName, bearer, currentSchemaPrefixes);
  // bearer.group.ref is a group reference, not a type reference — not touched here
  if (bearer.all) {
    for (const el of toArray(bearer.all.element)) {
      renameElementTypeLocalNames(old, newName, el, currentSchemaPrefixes);
    }
  }
  if (bearer.choice) renameCompositorTypeLocalNames(old, newName, bearer.choice, currentSchemaPrefixes);
  if (bearer.sequence) {
    renameCompositorTypeLocalNames(old, newName, bearer.sequence, currentSchemaPrefixes);
  }
}

function renameComplexTypeBodyLocalNames(
  old: string,
  newName: string,
  ct: topLevelComplexType | localComplexType,
  currentSchemaPrefixes: readonly string[]
): void {
  if (ct.simpleContent?.restriction) {
    renameAttributeBearerLocalNames(old, newName, ct.simpleContent.restriction, currentSchemaPrefixes);
    if (ct.simpleContent.restriction.simpleType) {
      renameSimpleTypeLocalNames(
        old,
        newName,
        ct.simpleContent.restriction.simpleType,
        currentSchemaPrefixes
      );
    }
  }
  if (ct.simpleContent?.extension) {
    renameAttributeBearerLocalNames(old, newName, ct.simpleContent.extension, currentSchemaPrefixes);
  }
  if (ct.complexContent?.restriction) {
    renameCompositorBearerLocalNames(
      old,
      newName,
      ct.complexContent.restriction,
      currentSchemaPrefixes
    );
  }
  if (ct.complexContent?.extension) {
    renameCompositorBearerLocalNames(old, newName, ct.complexContent.extension, currentSchemaPrefixes);
  }
  // ct.group.ref is a group reference, not a type reference — not touched here
  if (ct.all) {
    for (const el of toArray(ct.all.element)) {
      renameElementTypeLocalNames(old, newName, el, currentSchemaPrefixes);
    }
  }
  if (ct.choice) renameCompositorTypeLocalNames(old, newName, ct.choice, currentSchemaPrefixes);
  if (ct.sequence) renameCompositorTypeLocalNames(old, newName, ct.sequence, currentSchemaPrefixes);
  for (const attr of toArray(ct.attribute)) {
    attr.type_ = renameSchemaScopedName(old, newName, attr.type_, currentSchemaPrefixes);
    if (attr.simpleType) renameSimpleTypeLocalNames(old, newName, attr.simpleType, currentSchemaPrefixes);
  }
  // ct.attributeGroup refs are attributeGroup refs, not type refs — not touched here
}

// ===== Public API =====

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
export function renameLocalTypeInSchema(
  oldName: string,
  newName: string,
  schemaObj: schema
): void {
  if (oldName === newName) return;
  const currentSchemaPrefixes = getCurrentSchemaPrefixes(schemaObj);

  for (const el of toArray(schemaObj.element)) {
    el.type_ = renameSchemaScopedName(oldName, newName, el.type_, currentSchemaPrefixes);
    if (el.simpleType) renameSimpleTypeLocalNames(oldName, newName, el.simpleType, currentSchemaPrefixes);
    if (el.complexType) {
      renameComplexTypeBodyLocalNames(oldName, newName, el.complexType, currentSchemaPrefixes);
    }
  }

  for (const attr of toArray(schemaObj.attribute)) {
    attr.type_ = renameSchemaScopedName(oldName, newName, attr.type_, currentSchemaPrefixes);
    if (attr.simpleType) renameSimpleTypeLocalNames(oldName, newName, attr.simpleType, currentSchemaPrefixes);
  }

  for (const ct of toArray(schemaObj.complexType)) {
    renameComplexTypeBodyLocalNames(oldName, newName, ct, currentSchemaPrefixes);
  }

  for (const st of toArray(schemaObj.simpleType)) {
    renameSimpleTypeLocalNames(oldName, newName, st, currentSchemaPrefixes);
  }

  for (const grp of toArray(schemaObj.group)) {
    if (grp.all) {
      for (const el of toArray(grp.all.element)) {
        renameElementTypeLocalNames(oldName, newName, el, currentSchemaPrefixes);
      }
    }
    if (grp.choice) renameCompositorTypeLocalNames(oldName, newName, grp.choice, currentSchemaPrefixes);
    if (grp.sequence) {
      renameCompositorTypeLocalNames(oldName, newName, grp.sequence, currentSchemaPrefixes);
    }
  }

  for (const ag of toArray(schemaObj.attributeGroup)) {
    for (const attr of toArray(ag.attribute)) {
      attr.type_ = renameSchemaScopedName(oldName, newName, attr.type_, currentSchemaPrefixes);
      if (attr.simpleType) {
        renameSimpleTypeLocalNames(oldName, newName, attr.simpleType, currentSchemaPrefixes);
      }
    }
  }
}

/**
 * Renames all `xs:group ref="oldName"` occurrences to `ref="newName"`
 * throughout the schema.
 *
 * @param oldName - The current (old) group name
 * @param newName - The replacement group name
 * @param schemaObj - The schema object to mutate in place
 */
export function renameLocalGroupRefInSchema(
  oldName: string,
  newName: string,
  schemaObj: schema
): void {
  if (oldName === newName) return;
  const currentSchemaPrefixes = getCurrentSchemaPrefixes(schemaObj);

  function updateGroupRef(gr: groupRef): void {
    gr.ref = renameRequiredSchemaScopedName(oldName, newName, gr.ref, currentSchemaPrefixes);
  }

  function processCompositorGroupRefs(compositor: explicitGroup | simpleExplicitGroup): void {
    for (const gr of toArray(compositor.group)) updateGroupRef(gr);
    for (const sub of toArray(compositor.choice)) processCompositorGroupRefs(sub);
    for (const sub of toArray(compositor.sequence)) processCompositorGroupRefs(sub);
  }

  for (const ct of toArray(schemaObj.complexType)) {
    if (ct.group) updateGroupRef(ct.group);
    if (ct.complexContent?.extension) {
      if (ct.complexContent.extension.group) {
        updateGroupRef(ct.complexContent.extension.group);
      }
      if (ct.complexContent.extension.choice) {
        processCompositorGroupRefs(ct.complexContent.extension.choice);
      }
      if (ct.complexContent.extension.sequence) {
        processCompositorGroupRefs(ct.complexContent.extension.sequence);
      }
    }
    if (ct.complexContent?.restriction) {
      if (ct.complexContent.restriction.group) {
        updateGroupRef(ct.complexContent.restriction.group);
      }
      if (ct.complexContent.restriction.choice) {
        processCompositorGroupRefs(ct.complexContent.restriction.choice);
      }
      if (ct.complexContent.restriction.sequence) {
        processCompositorGroupRefs(ct.complexContent.restriction.sequence);
      }
    }
    if (ct.choice) processCompositorGroupRefs(ct.choice);
    if (ct.sequence) processCompositorGroupRefs(ct.sequence);
  }

  for (const grp of toArray(schemaObj.group)) {
    if (grp.choice) processCompositorGroupRefs(grp.choice);
    if (grp.sequence) processCompositorGroupRefs(grp.sequence);
  }
}

/**
 * Renames all `xs:attributeGroup ref="oldName"` occurrences to
 * `ref="newName"` throughout the schema.
 *
 * @param oldName - The current (old) attribute group name
 * @param newName - The replacement attribute group name
 * @param schemaObj - The schema object to mutate in place
 */
export function renameLocalAttributeGroupRefInSchema(
  oldName: string,
  newName: string,
  schemaObj: schema
): void {
  if (oldName === newName) return;
  const currentSchemaPrefixes = getCurrentSchemaPrefixes(schemaObj);

  function updateAttrGroupRef(agr: attributeGroupRef): void {
    agr.ref = renameRequiredSchemaScopedName(oldName, newName, agr.ref, currentSchemaPrefixes);
  }

  function processAttrGroupRefs(holder: {
    attributeGroup?: attributeGroupRef | attributeGroupRef[];
  }): void {
    for (const agr of toArray(holder.attributeGroup)) updateAttrGroupRef(agr);
  }

  for (const ct of toArray(schemaObj.complexType)) {
    processAttrGroupRefs(ct);
    if (ct.complexContent?.extension) processAttrGroupRefs(ct.complexContent.extension);
    if (ct.complexContent?.restriction) processAttrGroupRefs(ct.complexContent.restriction);
    if (ct.simpleContent?.extension) processAttrGroupRefs(ct.simpleContent.extension);
    if (ct.simpleContent?.restriction) processAttrGroupRefs(ct.simpleContent.restriction);
  }

  for (const ag of toArray(schemaObj.attributeGroup)) {
    processAttrGroupRefs(ag);
  }
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
export function renameLocalElementRefInSchema(
  oldName: string,
  newName: string,
  schemaObj: schema
): void {
  if (oldName === newName) return;
  const currentSchemaPrefixes = getCurrentSchemaPrefixes(schemaObj);

  function updateElementRef(el: localElement | narrowMaxMin): void {
    el.ref = renameSchemaScopedName(oldName, newName, el.ref, currentSchemaPrefixes);
  }

  function processCompositorElementRefs(compositor: explicitGroup | simpleExplicitGroup): void {
    for (const el of toArray(compositor.element)) updateElementRef(el);
    for (const sub of toArray(compositor.choice)) processCompositorElementRefs(sub);
    for (const sub of toArray(compositor.sequence)) processCompositorElementRefs(sub);
  }

  for (const el of toArray(schemaObj.element)) {
    el.substitutionGroup = renameSchemaScopedName(
      oldName,
      newName,
      el.substitutionGroup,
      currentSchemaPrefixes
    );
  }

  for (const ct of toArray(schemaObj.complexType)) {
    if (ct.all) {
      for (const el of toArray(ct.all.element)) updateElementRef(el);
    }
    if (ct.complexContent?.extension) {
      if (ct.complexContent.extension.all) {
        for (const el of toArray(ct.complexContent.extension.all.element)) {
          updateElementRef(el);
        }
      }
      if (ct.complexContent.extension.choice) {
        processCompositorElementRefs(ct.complexContent.extension.choice);
      }
      if (ct.complexContent.extension.sequence) {
        processCompositorElementRefs(ct.complexContent.extension.sequence);
      }
    }
    if (ct.complexContent?.restriction) {
      if (ct.complexContent.restriction.all) {
        for (const el of toArray(ct.complexContent.restriction.all.element)) {
          updateElementRef(el);
        }
      }
      if (ct.complexContent.restriction.choice) {
        processCompositorElementRefs(ct.complexContent.restriction.choice);
      }
      if (ct.complexContent.restriction.sequence) {
        processCompositorElementRefs(ct.complexContent.restriction.sequence);
      }
    }
    if (ct.choice) processCompositorElementRefs(ct.choice);
    if (ct.sequence) processCompositorElementRefs(ct.sequence);
  }

  for (const grp of toArray(schemaObj.group)) {
    if (grp.all) {
      for (const el of toArray(grp.all.element)) updateElementRef(el);
    }
    if (grp.choice) processCompositorElementRefs(grp.choice);
    if (grp.sequence) processCompositorElementRefs(grp.sequence);
  }
}
