/**
 * Utilities for inspecting and rewriting QName-valued attributes in the schema
 * tree when a namespace prefix changes.  Two functions are exported:
 *
 * - {@link rewritePrefixInSchema} — walks the entire schema object tree and
 *   replaces every `oldPrefix:localName` occurrence with `newPrefix:localName`.
 * - {@link isPrefixReferencedInSchema} — performs the same traversal read-only
 *   and returns `true` if any QName uses the given prefix.
 *
 * All helper functions are module-private.
 *
 * Type aliases:
 * - {@link AttributeBearer} — union of the four generated classes that carry
 *   `base`, `attribute`, and `attributeGroup` fields.
 * - {@link CompositorBearer} — subset of AttributeBearer that also carries
 *   compositor content (`group`, `all`, `choice`, `sequence`).
 *
 * No shadow structural types are used; every alias references the actual
 * generated classes so that TypeScript catches incompatibilities at compile
 * time when the generated model changes.
 */

import {
  schema,
  topLevelComplexType,
  localComplexType,
  topLevelSimpleType,
  localSimpleType,
  extensionType,
  complexRestrictionType,
  simpleExtensionType,
  simpleRestrictionType,
  explicitGroup,
  simpleExplicitGroup,
  localElement,
  narrowMaxMin,
} from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";

// ===== Type aliases =====

/**
 * complexContent extension or restriction — carry base plus full compositor
 * content (group, all, choice, sequence, attribute, attributeGroup).
 */
type CompositorBearer = extensionType | complexRestrictionType;

/**
 * Any arm of simpleContent or complexContent — carry base, attribute, and
 * attributeGroup at minimum.
 */
type AttributeBearer = simpleExtensionType | simpleRestrictionType | CompositorBearer;

// ===== QName string helpers =====

/**
 * Rewrites `oldPrefix:localName` → `newPrefix:localName`.
 * Passes `undefined` and non-prefixed values through unchanged.
 */
function rewriteQName(
  oldPrefix: string,
  newPrefix: string,
  value: string | undefined
): string | undefined {
  if (!value) return value;
  return value.startsWith(`${oldPrefix}:`)
    ? `${newPrefix}:${value.substring(oldPrefix.length + 1)}`
    : value;
}

/**
 * Rewrites `oldPrefix:localName` → `newPrefix:localName` in a required string.
 */
function rewriteRequiredQName(
  oldPrefix: string,
  newPrefix: string,
  value: string
): string {
  return rewriteQName(oldPrefix, newPrefix, value) ?? value;
}

/**
 * Rewrites every QName token in the space-separated
 * `xs:union/@memberTypes` attribute value.
 */
function rewriteMemberTypes(
  oldPrefix: string,
  newPrefix: string,
  value: string | undefined
): string | undefined {
  if (!value) return value;
  return value
    .split(/\s+/)
    .map((qn) => rewriteRequiredQName(oldPrefix, newPrefix, qn))
    .join(" ");
}

// ===== Node-type rewriters =====

function rewriteSimpleType(
  old: string,
  newPfx: string,
  st: localSimpleType | topLevelSimpleType
): void {
  if (st.restriction) {
    st.restriction.base = rewriteRequiredQName(old, newPfx, st.restriction.base);
    if (st.restriction.simpleType) {
      rewriteSimpleType(old, newPfx, st.restriction.simpleType);
    }
  }
  if (st.list) {
    st.list.itemType = rewriteQName(old, newPfx, st.list.itemType);
    if (st.list.simpleType) {
      rewriteSimpleType(old, newPfx, st.list.simpleType);
    }
  }
  if (st.union) {
    st.union.memberTypes = rewriteMemberTypes(old, newPfx, st.union.memberTypes);
    for (const member of toArray(st.union.simpleType)) {
      rewriteSimpleType(old, newPfx, member);
    }
  }
}

function rewriteElement(
  old: string,
  newPfx: string,
  el: localElement | narrowMaxMin
): void {
  el.type_ = rewriteQName(old, newPfx, el.type_);
  el.ref = rewriteQName(old, newPfx, el.ref);
  if (el.simpleType) rewriteSimpleType(old, newPfx, el.simpleType);
  if (el.complexType) rewriteComplexTypeBody(old, newPfx, el.complexType);
}

function rewriteCompositor(
  old: string,
  newPfx: string,
  compositor: explicitGroup | simpleExplicitGroup
): void {
  for (const el of toArray(compositor.element)) {
    rewriteElement(old, newPfx, el);
  }
  for (const gr of toArray(compositor.group)) {
    gr.ref = rewriteRequiredQName(old, newPfx, gr.ref);
  }
  for (const sub of toArray(compositor.choice)) {
    rewriteCompositor(old, newPfx, sub);
  }
  for (const sub of toArray(compositor.sequence)) {
    rewriteCompositor(old, newPfx, sub);
  }
}

function rewriteAttributeBearer(
  old: string,
  newPfx: string,
  bearer: AttributeBearer
): void {
  bearer.base = rewriteRequiredQName(old, newPfx, bearer.base);
  for (const attr of toArray(bearer.attribute)) {
    attr.type_ = rewriteQName(old, newPfx, attr.type_);
    attr.ref = rewriteQName(old, newPfx, attr.ref);
  }
  for (const agr of toArray(bearer.attributeGroup)) {
    agr.ref = rewriteRequiredQName(old, newPfx, agr.ref);
  }
}

function rewriteCompositorBearer(
  old: string,
  newPfx: string,
  bearer: CompositorBearer
): void {
  rewriteAttributeBearer(old, newPfx, bearer);
  if (bearer.group) {
    bearer.group.ref = rewriteRequiredQName(old, newPfx, bearer.group.ref);
  }
  if (bearer.all) {
    for (const el of toArray(bearer.all.element)) {
      rewriteElement(old, newPfx, el);
    }
  }
  if (bearer.choice) rewriteCompositor(old, newPfx, bearer.choice);
  if (bearer.sequence) rewriteCompositor(old, newPfx, bearer.sequence);
}

function rewriteComplexTypeBody(
  old: string,
  newPfx: string,
  ct: topLevelComplexType | localComplexType
): void {
  if (ct.simpleContent?.restriction) {
    rewriteAttributeBearer(old, newPfx, ct.simpleContent.restriction);
    if (ct.simpleContent.restriction.simpleType) {
      rewriteSimpleType(old, newPfx, ct.simpleContent.restriction.simpleType);
    }
  }
  if (ct.simpleContent?.extension) {
    rewriteAttributeBearer(old, newPfx, ct.simpleContent.extension);
  }
  if (ct.complexContent?.restriction) {
    rewriteCompositorBearer(old, newPfx, ct.complexContent.restriction);
  }
  if (ct.complexContent?.extension) {
    rewriteCompositorBearer(old, newPfx, ct.complexContent.extension);
  }
  if (ct.group) {
    ct.group.ref = rewriteRequiredQName(old, newPfx, ct.group.ref);
  }
  if (ct.all) {
    for (const el of toArray(ct.all.element)) {
      rewriteElement(old, newPfx, el);
    }
  }
  if (ct.choice) rewriteCompositor(old, newPfx, ct.choice);
  if (ct.sequence) rewriteCompositor(old, newPfx, ct.sequence);
  for (const attr of toArray(ct.attribute)) {
    attr.type_ = rewriteQName(old, newPfx, attr.type_);
    attr.ref = rewriteQName(old, newPfx, attr.ref);
  }
  for (const agr of toArray(ct.attributeGroup)) {
    agr.ref = rewriteRequiredQName(old, newPfx, agr.ref);
  }
}

// ===== Public API =====

/**
 * Returns `true` if any QName-valued field in the schema uses the given
 * prefix (i.e. starts with `prefix:`).
 *
 * Traversal is identical in scope to {@link rewritePrefixInSchema}: every
 * element type/ref/substitutionGroup, attribute type/ref, simpleType
 * restriction/@base/list/@itemType/union/@memberTypes, complexType
 * complexContent/simpleContent extension+restriction @base, compositor
 * group/@ref, attributeGroup/@ref, named group sequence/choice/all element
 * types/refs, and named attributeGroup attribute types/refs and nested
 * attributeGroup refs are all checked recursively.
 *
 * Used by `validateRemoveImport` to block removal when the namespace is
 * still referenced anywhere in the schema body.
 *
 * @param prefix - The namespace prefix to search for (without the colon)
 * @param schemaObj - The schema object to inspect
 * @returns `true` if at least one QName uses `prefix:`, `false` otherwise
 */
export function isPrefixReferencedInSchema(
  prefix: string,
  schemaObj: schema
): boolean {
  const p = `${prefix}:`;

  function qn(value: string | undefined): boolean {
    return value !== undefined && value.startsWith(p);
  }

  function checkMemberTypes(value: string | undefined): boolean {
    return value !== undefined && value.split(/\s+/).some((t) => t.startsWith(p));
  }

  function checkSimpleType(st: localSimpleType | topLevelSimpleType): boolean {
    if (st.restriction) {
      if (qn(st.restriction.base)) return true;
      if (st.restriction.simpleType && checkSimpleType(st.restriction.simpleType)) return true;
    }
    if (st.list) {
      if (qn(st.list.itemType)) return true;
      if (st.list.simpleType && checkSimpleType(st.list.simpleType)) return true;
    }
    if (st.union) {
      if (checkMemberTypes(st.union.memberTypes)) return true;
      for (const m of toArray(st.union.simpleType)) {
        if (checkSimpleType(m)) return true;
      }
    }
    return false;
  }

  function checkElement(el: localElement | narrowMaxMin): boolean {
    if (qn(el.type_) || qn(el.ref)) return true;
    if (el.simpleType && checkSimpleType(el.simpleType)) return true;
    if (el.complexType && checkComplexTypeBody(el.complexType)) return true;
    return false;
  }

  function checkCompositor(c: explicitGroup | simpleExplicitGroup): boolean {
    for (const el of toArray(c.element)) {
      if (checkElement(el)) return true;
    }
    for (const gr of toArray(c.group)) {
      if (qn(gr.ref)) return true;
    }
    for (const sub of toArray(c.choice)) {
      if (checkCompositor(sub)) return true;
    }
    for (const sub of toArray(c.sequence)) {
      if (checkCompositor(sub)) return true;
    }
    return false;
  }

  function checkAttributeBearer(b: AttributeBearer): boolean {
    if (qn(b.base)) return true;
    for (const a of toArray(b.attribute)) {
      if (qn(a.type_) || qn(a.ref)) return true;
    }
    for (const ag of toArray(b.attributeGroup)) {
      if (qn(ag.ref)) return true;
    }
    return false;
  }

  function checkCompositorBearer(b: CompositorBearer): boolean {
    if (checkAttributeBearer(b)) return true;
    if (b.group && qn(b.group.ref)) return true;
    if (b.all) {
      for (const el of toArray(b.all.element)) {
        if (checkElement(el)) return true;
      }
    }
    if (b.choice && checkCompositor(b.choice)) return true;
    if (b.sequence && checkCompositor(b.sequence)) return true;
    return false;
  }

  function checkComplexTypeBody(ct: topLevelComplexType | localComplexType): boolean {
    if (ct.simpleContent?.restriction) {
      if (checkAttributeBearer(ct.simpleContent.restriction)) return true;
      if (ct.simpleContent.restriction.simpleType &&
          checkSimpleType(ct.simpleContent.restriction.simpleType)) return true;
    }
    if (ct.simpleContent?.extension && checkAttributeBearer(ct.simpleContent.extension)) return true;
    if (ct.complexContent?.restriction && checkCompositorBearer(ct.complexContent.restriction)) return true;
    if (ct.complexContent?.extension && checkCompositorBearer(ct.complexContent.extension)) return true;
    if (ct.group && qn(ct.group.ref)) return true;
    if (ct.all) {
      for (const el of toArray(ct.all.element)) {
        if (checkElement(el)) return true;
      }
    }
    if (ct.choice && checkCompositor(ct.choice)) return true;
    if (ct.sequence && checkCompositor(ct.sequence)) return true;
    for (const a of toArray(ct.attribute)) {
      if (qn(a.type_) || qn(a.ref)) return true;
    }
    for (const ag of toArray(ct.attributeGroup)) {
      if (qn(ag.ref)) return true;
    }
    return false;
  }

  for (const el of toArray(schemaObj.element)) {
    if (qn(el.type_) || qn(el.substitutionGroup)) return true;
    if (el.simpleType && checkSimpleType(el.simpleType)) return true;
    if (el.complexType && checkComplexTypeBody(el.complexType)) return true;
  }
  for (const a of toArray(schemaObj.attribute)) {
    if (qn(a.type_)) return true;
    if (a.simpleType && checkSimpleType(a.simpleType)) return true;
  }
  for (const ct of toArray(schemaObj.complexType)) {
    if (checkComplexTypeBody(ct)) return true;
  }
  for (const st of toArray(schemaObj.simpleType)) {
    if (checkSimpleType(st)) return true;
  }
  for (const grp of toArray(schemaObj.group)) {
    if (grp.all) {
      for (const el of toArray(grp.all.element)) {
        if (checkElement(el)) return true;
      }
    }
    if (grp.choice && checkCompositor(grp.choice)) return true;
    if (grp.sequence && checkCompositor(grp.sequence)) return true;
  }
  for (const ag of toArray(schemaObj.attributeGroup)) {
    for (const a of toArray(ag.attribute)) {
      if (qn(a.type_) || qn(a.ref)) return true;
    }
    for (const agr of toArray(ag.attributeGroup)) {
      if (qn(agr.ref)) return true;
    }
  }
  return false;
}

/**
 * Rewrites all QName-valued attributes in the schema that use
 * `oldPrefix:localName`, replacing them with `newPrefix:localName`.
 *
 * Fields covered:
 * - `element/@type`, `/@ref`, `/@substitutionGroup`
 * - `attribute/@type`, `/@ref`
 * - `complexType` / `localComplexType` bodies:
 *   - `complexContent` extension/restriction `/@base`, `group/@ref`,
 *     `attributeGroup/@ref`, compositor element types/refs (fully recursive)
 *   - `simpleContent` extension/restriction `/@base`, attribute types/refs
 * - `simpleType`: `restriction/@base`, `list/@itemType`,
 *   `union/@memberTypes` (space-separated list)
 * - Named `group` compositor contents and refs
 * - Named `attributeGroup` attribute types/refs and attributeGroup refs
 *
 * Called automatically by `executeModifyImport` when the prefix is renamed.
 *
 * @param oldPrefix - The prefix being replaced
 * @param newPrefix - The replacement prefix
 * @param schemaObj - The schema object to mutate in place
 */
export function rewritePrefixInSchema(
  oldPrefix: string,
  newPrefix: string,
  schemaObj: schema
): void {
  if (oldPrefix === newPrefix) return;

  for (const el of toArray(schemaObj.element)) {
    el.type_ = rewriteQName(oldPrefix, newPrefix, el.type_);
    el.substitutionGroup = rewriteQName(oldPrefix, newPrefix, el.substitutionGroup);
    if (el.simpleType) rewriteSimpleType(oldPrefix, newPrefix, el.simpleType);
    if (el.complexType) rewriteComplexTypeBody(oldPrefix, newPrefix, el.complexType);
  }

  for (const attr of toArray(schemaObj.attribute)) {
    attr.type_ = rewriteQName(oldPrefix, newPrefix, attr.type_);
    if (attr.simpleType) rewriteSimpleType(oldPrefix, newPrefix, attr.simpleType);
  }

  for (const ct of toArray(schemaObj.complexType)) {
    rewriteComplexTypeBody(oldPrefix, newPrefix, ct);
  }

  for (const st of toArray(schemaObj.simpleType)) {
    rewriteSimpleType(oldPrefix, newPrefix, st);
  }

  for (const grp of toArray(schemaObj.group)) {
    if (grp.all) {
      for (const el of toArray(grp.all.element)) {
        rewriteElement(oldPrefix, newPrefix, el);
      }
    }
    if (grp.choice) rewriteCompositor(oldPrefix, newPrefix, grp.choice);
    if (grp.sequence) rewriteCompositor(oldPrefix, newPrefix, grp.sequence);
  }

  for (const ag of toArray(schemaObj.attributeGroup)) {
    for (const attr of toArray(ag.attribute)) {
      attr.type_ = rewriteQName(oldPrefix, newPrefix, attr.type_);
      attr.ref = rewriteQName(oldPrefix, newPrefix, attr.ref);
    }
    for (const agr of toArray(ag.attributeGroup)) {
      agr.ref = rewriteRequiredQName(oldPrefix, newPrefix, agr.ref);
    }
  }
}
