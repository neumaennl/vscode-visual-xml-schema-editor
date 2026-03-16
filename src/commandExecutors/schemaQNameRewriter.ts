/**
 * Utilities for rewriting QName-valued attributes when a namespace prefix is
 * renamed.  The single exported function, {@link rewritePrefixInSchema}, walks
 * the entire schema object tree and replaces every `oldPrefix:localName`
 * occurrence with `newPrefix:localName`.
 *
 * All helper functions are module-private; only `rewritePrefixInSchema` is
 * exported.
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
