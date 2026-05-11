/**
 * Utilities for renaming local (unqualified) type, group, attribute group,
 * and element references throughout the schema when a definition is renamed.
 *
 * Exported functions:
 * - {@link renameLocalTypeInSchema} — renames all unqualified type references.
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

/**
 * Returns `newName` when `value` is exactly `oldName` (unqualified — no colon),
 * otherwise passes `value` through unchanged (including `undefined`).
 */
function renameLocalName(
  oldName: string,
  newName: string,
  value: string | undefined
): string | undefined {
  return value === oldName ? newName : value;
}

/**
 * Like {@link renameLocalName} but for required (non-optional) string fields.
 */
function renameRequiredLocalName(
  oldName: string,
  newName: string,
  value: string
): string {
  return value === oldName ? newName : value;
}

/**
 * Renames `oldName` to `newName` within the space-separated `memberTypes`
 * attribute used by `xs:union`.
 */
function renameLocalMemberTypes(
  oldName: string,
  newName: string,
  value: string | undefined
): string | undefined {
  if (!value) return value;
  return value.split(/\s+/).map((t) => (t === oldName ? newName : t)).join(" ");
}

function renameSimpleTypeLocalNames(
  old: string,
  newName: string,
  st: localSimpleType | topLevelSimpleType
): void {
  if (st.restriction) {
    st.restriction.base = renameRequiredLocalName(old, newName, st.restriction.base);
    if (st.restriction.simpleType) {
      renameSimpleTypeLocalNames(old, newName, st.restriction.simpleType);
    }
  }
  if (st.list) {
    st.list.itemType = renameLocalName(old, newName, st.list.itemType);
    if (st.list.simpleType) {
      renameSimpleTypeLocalNames(old, newName, st.list.simpleType);
    }
  }
  if (st.union) {
    st.union.memberTypes = renameLocalMemberTypes(old, newName, st.union.memberTypes);
    for (const m of toArray(st.union.simpleType)) {
      renameSimpleTypeLocalNames(old, newName, m);
    }
  }
}

function renameElementTypeLocalNames(
  old: string,
  newName: string,
  el: localElement | narrowMaxMin
): void {
  el.type_ = renameLocalName(old, newName, el.type_);
  // el.ref is an element reference, not a type reference — handled separately
  if (el.simpleType) renameSimpleTypeLocalNames(old, newName, el.simpleType);
  if (el.complexType) renameComplexTypeBodyLocalNames(old, newName, el.complexType);
}

function renameCompositorTypeLocalNames(
  old: string,
  newName: string,
  compositor: explicitGroup | simpleExplicitGroup
): void {
  for (const el of toArray(compositor.element)) {
    renameElementTypeLocalNames(old, newName, el);
  }
  // compositor.group refs are group references, not type refs — not touched here
  for (const sub of toArray(compositor.choice)) {
    renameCompositorTypeLocalNames(old, newName, sub);
  }
  for (const sub of toArray(compositor.sequence)) {
    renameCompositorTypeLocalNames(old, newName, sub);
  }
}

function renameAttributeBearerLocalNames(
  old: string,
  newName: string,
  bearer: AttributeBearer
): void {
  bearer.base = renameRequiredLocalName(old, newName, bearer.base);
  for (const attr of toArray(bearer.attribute)) {
    attr.type_ = renameLocalName(old, newName, attr.type_);
    // attr.ref is an attribute reference, not a type reference — not touched here
    if (attr.simpleType) renameSimpleTypeLocalNames(old, newName, attr.simpleType);
  }
  // bearer.attributeGroup refs are attributeGroup refs, not type refs — not touched here
}

function renameCompositorBearerLocalNames(
  old: string,
  newName: string,
  bearer: CompositorBearer
): void {
  renameAttributeBearerLocalNames(old, newName, bearer);
  // bearer.group.ref is a group reference, not a type reference — not touched here
  if (bearer.all) {
    for (const el of toArray(bearer.all.element)) {
      renameElementTypeLocalNames(old, newName, el);
    }
  }
  if (bearer.choice) renameCompositorTypeLocalNames(old, newName, bearer.choice);
  if (bearer.sequence) renameCompositorTypeLocalNames(old, newName, bearer.sequence);
}

function renameComplexTypeBodyLocalNames(
  old: string,
  newName: string,
  ct: topLevelComplexType | localComplexType
): void {
  if (ct.simpleContent?.restriction) {
    renameAttributeBearerLocalNames(old, newName, ct.simpleContent.restriction);
    if (ct.simpleContent.restriction.simpleType) {
      renameSimpleTypeLocalNames(old, newName, ct.simpleContent.restriction.simpleType);
    }
  }
  if (ct.simpleContent?.extension) {
    renameAttributeBearerLocalNames(old, newName, ct.simpleContent.extension);
  }
  if (ct.complexContent?.restriction) {
    renameCompositorBearerLocalNames(old, newName, ct.complexContent.restriction);
  }
  if (ct.complexContent?.extension) {
    renameCompositorBearerLocalNames(old, newName, ct.complexContent.extension);
  }
  // ct.group.ref is a group reference, not a type reference — not touched here
  if (ct.all) {
    for (const el of toArray(ct.all.element)) {
      renameElementTypeLocalNames(old, newName, el);
    }
  }
  if (ct.choice) renameCompositorTypeLocalNames(old, newName, ct.choice);
  if (ct.sequence) renameCompositorTypeLocalNames(old, newName, ct.sequence);
  for (const attr of toArray(ct.attribute)) {
    attr.type_ = renameLocalName(old, newName, attr.type_);
    if (attr.simpleType) renameSimpleTypeLocalNames(old, newName, attr.simpleType);
  }
  // ct.attributeGroup refs are attributeGroup refs, not type refs — not touched here
}

// ===== Public API =====

/**
 * Renames all unqualified (no-prefix) type references from `oldName` to
 * `newName` throughout the schema.
 *
 * Fields updated: `element/@type`, `attribute/@type`,
 * `restriction/@base`, `extension/@base`, `list/@itemType`,
 * `union/@memberTypes` (space-separated token list).
 *
 * @param oldName - The current (old) unqualified type name
 * @param newName - The replacement type name
 * @param schemaObj - The schema object to mutate in place
 */
export function renameLocalTypeInSchema(
  oldName: string,
  newName: string,
  schemaObj: schema
): void {
  if (oldName === newName) return;

  for (const el of toArray(schemaObj.element)) {
    el.type_ = renameLocalName(oldName, newName, el.type_);
    if (el.simpleType) renameSimpleTypeLocalNames(oldName, newName, el.simpleType);
    if (el.complexType) renameComplexTypeBodyLocalNames(oldName, newName, el.complexType);
  }

  for (const attr of toArray(schemaObj.attribute)) {
    attr.type_ = renameLocalName(oldName, newName, attr.type_);
    if (attr.simpleType) renameSimpleTypeLocalNames(oldName, newName, attr.simpleType);
  }

  for (const ct of toArray(schemaObj.complexType)) {
    renameComplexTypeBodyLocalNames(oldName, newName, ct);
  }

  for (const st of toArray(schemaObj.simpleType)) {
    renameSimpleTypeLocalNames(oldName, newName, st);
  }

  for (const grp of toArray(schemaObj.group)) {
    if (grp.all) {
      for (const el of toArray(grp.all.element)) {
        renameElementTypeLocalNames(oldName, newName, el);
      }
    }
    if (grp.choice) renameCompositorTypeLocalNames(oldName, newName, grp.choice);
    if (grp.sequence) renameCompositorTypeLocalNames(oldName, newName, grp.sequence);
  }

  for (const ag of toArray(schemaObj.attributeGroup)) {
    for (const attr of toArray(ag.attribute)) {
      attr.type_ = renameLocalName(oldName, newName, attr.type_);
      if (attr.simpleType) renameSimpleTypeLocalNames(oldName, newName, attr.simpleType);
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

  function updateGroupRef(gr: groupRef): void {
    if (gr.ref === oldName) gr.ref = newName;
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

  function updateAttrGroupRef(agr: attributeGroupRef): void {
    if (agr.ref === oldName) agr.ref = newName;
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

  function updateElementRef(el: localElement | narrowMaxMin): void {
    if (el.ref === oldName) el.ref = newName;
  }

  function processCompositorElementRefs(compositor: explicitGroup | simpleExplicitGroup): void {
    for (const el of toArray(compositor.element)) updateElementRef(el);
    for (const sub of toArray(compositor.choice)) processCompositorElementRefs(sub);
    for (const sub of toArray(compositor.sequence)) processCompositorElementRefs(sub);
  }

  for (const el of toArray(schemaObj.element)) {
    if (el.substitutionGroup === oldName) el.substitutionGroup = newName;
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
