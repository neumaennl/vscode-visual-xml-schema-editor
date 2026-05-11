/**
 * Utilities for inspecting whether a namespace prefix (or set of prefixes)
 * is referenced anywhere in the schema tree.
 *
 * Exported functions:
 * - {@link isPrefixReferencedInSchema} — returns `true` if any QName uses the given prefix.
 * - {@link isAnyPrefixReferencedInSchema} — same but accepts a set of prefixes.
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
} from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";
import { AttributeBearer, CompositorBearer } from "./schemaTraversalTypes";

// ===== Single-pass traversal =====

/**
 * Single-pass traversal that checks QName-valued fields using caller-supplied
 * predicate functions.  All public reference-checking exports delegate here so
 * that the schema is walked at most once regardless of how many prefixes are
 * being tested.
 *
 * @param qn - Returns true when a single QName value matches
 * @param checkMemberTypes - Returns true when a space-separated memberTypes
 *   value contains at least one matching QName
 * @param schemaObj - The schema to inspect
 */
function isQNameMatchedInSchema(
  qn: (value: string | undefined) => boolean,
  checkMemberTypes: (value: string | undefined) => boolean,
  schemaObj: schema
): boolean {
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
    for (const kr of toArray(el.keyref)) {
      if (qn(kr.refer)) return true;
    }
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
      if (a.simpleType && checkSimpleType(a.simpleType)) return true;
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
      if (a.simpleType && checkSimpleType(a.simpleType)) return true;
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
    for (const kr of toArray(el.keyref)) {
      if (qn(kr.refer)) return true;
    }
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
      if (a.simpleType && checkSimpleType(a.simpleType)) return true;
    }
    for (const agr of toArray(ag.attributeGroup)) {
      if (qn(agr.ref)) return true;
    }
  }
  return false;
}

// ===== Public API =====

/**
 * Returns `true` if any QName-valued field in the schema uses the given
 * prefix (i.e. starts with `prefix:`).
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
  return isQNameMatchedInSchema(
    (v) => v !== undefined && v.startsWith(p),
    (v) => v !== undefined && v.split(/\s+/).some((t) => t.startsWith(p)),
    schemaObj
  );
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
export function isAnyPrefixReferencedInSchema(
  prefixes: ReadonlySet<string>,
  schemaObj: schema
): boolean {
  if (prefixes.size === 0) return false;
  function matchesPrefix(v: string): boolean {
    const colon = v.indexOf(":");
    return colon > 0 && prefixes.has(v.slice(0, colon));
  }
  return isQNameMatchedInSchema(
    (v) => v !== undefined && matchesPrefix(v),
    (v) => v !== undefined && v.split(/\s+/).some((m) => matchesPrefix(m)),
    schemaObj
  );
}
