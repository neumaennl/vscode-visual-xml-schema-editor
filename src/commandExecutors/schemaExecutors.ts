/**
 * Executors for schema-level commands (imports and includes).
 * Implements add, remove, and modify operations for schema imports and includes.
 *
 * Import ID Convention:
 * - Imports are addressed by position using XPath-like IDs: /import[N]
 *   where N is the zero-based index in the schema's import array.
 *
 * Prefix Convention:
 * - Each import may have an associated namespace prefix registered in
 *   schema._namespacePrefixes (maps prefix → namespace URI).
 * - Executors maintain _namespacePrefixes in sync with import_ when a prefix
 *   is provided or when an import is removed.
 * - When a prefix is renamed, ALL QName references using the old prefix are
 *   updated throughout the schema (see rewritePrefixInSchema).
 * - Commands are assumed to have been pre-validated; no duplicate checks are
 *   performed here.
 */

import {
  schema,
  importType,
  AddImportCommand,
  RemoveImportCommand,
  ModifyImportCommand,
  AddIncludeCommand,
  RemoveIncludeCommand,
  ModifyIncludeCommand,
} from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";
import { parseSchemaId } from "../../shared/idStrategy";

// ===== Helpers =====

/**
 * Resolves an import ID (e.g. "/import[0]") to the corresponding importType
 * entry and its index.
 *
 * Assumes the command has been pre-validated (i.e. the position is in range).
 */
function resolveImport(
  importId: string,
  schemaObj: schema
): { imports: importType[]; index: number } {
  const parsed = parseSchemaId(importId);
  return { imports: toArray(schemaObj.import_), index: parsed.position! };
}

/**
 * Generates a unique namespace prefix that is not already present in
 * schema._namespacePrefixes. Candidates are "ns0", "ns1", "ns2", …
 */
function generateUniquePrefix(schemaObj: schema): string {
  const existing = new Set(Object.keys(schemaObj._namespacePrefixes ?? {}));
  let i = 0;
  while (existing.has(`ns${i}`)) {
    i++;
  }
  return `ns${i}`;
}

/**
 * Removes all prefix registrations in schema._namespacePrefixes whose value
 * equals the given namespace URI.
 *
 * Multiple prefixes for the same namespace can exist when a schema is loaded
 * from XML that declares redundant namespace bindings, or when prefix entries
 * are left over from previous modify operations. Removing all of them ensures
 * no dangling prefix points to a namespace that is no longer imported.
 */
function removePrefixForNamespace(namespaceUri: string, schemaObj: schema): void {
  if (!schemaObj._namespacePrefixes) return;
  for (const [pfx, ns] of Object.entries(schemaObj._namespacePrefixes)) {
    if (ns === namespaceUri) {
      delete schemaObj._namespacePrefixes[pfx];
    }
  }
}

// ===== Prefix Rewriting =====

/*
 * Structural types for schema tree traversal.
 * Using structural types avoids importing every generated class while still
 * allowing TypeScript to verify compatibility at call sites.
 */

/** Any node that carries a QName `ref` attribute (e.g. groupRef, attributeGroupRef nodes). */
type QNameRef = { ref: string };

/** Any element-like node: localElement, narrowMaxMin. */
type ElementLike = {
  type_?: string;
  ref?: string;
  simpleType?: SimpleTypeLike;
  complexType?: ComplexTypeBodyLike;
};

/** Any simple-type-like node: localSimpleType, topLevelSimpleType. */
type SimpleTypeLike = {
  restriction?: { base?: string; simpleType?: SimpleTypeLike };
  list?: { itemType?: string; simpleType?: SimpleTypeLike };
  union?: { memberTypes?: string; simpleType?: SimpleTypeLike[] };
};

/**
 * Any compositor-like node: explicitGroup, simpleExplicitGroup.
 * Recursive because compositors can be nested.
 */
type CompositorLike = {
  element?: ElementLike[];
  group?: QNameRef[];
  choice?: CompositorLike[];
  sequence?: CompositorLike[];
};

/** Any attribute-bearing node (extensionType, complexRestrictionType, simpleExtensionType, simpleRestrictionType). */
type AttributeBearer = {
  base?: string;
  attribute?: Array<{ type_?: string; ref?: string }>;
  attributeGroup?: QNameRef[];
};

/** Extension / complexRestriction arm: AttributeBearer plus compositor content. */
type CompositorBearer = AttributeBearer & {
  group?: QNameRef;
  all?: { element?: ElementLike[] };
  choice?: CompositorLike;
  sequence?: CompositorLike;
};

/** simpleContent restriction arm: AttributeBearer plus nested simpleType. */
type SimpleRestrictionArm = AttributeBearer & {
  simpleType?: SimpleTypeLike;
};

/** Structural type shared by topLevelComplexType and localComplexType. */
type ComplexTypeBodyLike = {
  simpleContent?: {
    restriction?: SimpleRestrictionArm;
    extension?: AttributeBearer;
  };
  complexContent?: {
    restriction?: CompositorBearer;
    extension?: CompositorBearer;
  };
  group?: QNameRef;
  all?: { element?: ElementLike[] };
  choice?: CompositorLike;
  sequence?: CompositorLike;
  attribute?: Array<{ type_?: string; ref?: string }>;
  attributeGroup?: QNameRef[];
};

/**
 * Rewrites a single QName string, replacing `oldPrefix:localName` with
 * `newPrefix:localName`. Passes undefined and non-prefixed values through unchanged.
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
 * Rewrites a required QName string (never undefined).
 * Same logic as rewriteQName but accepts and returns `string`.
 */
function rewriteRequiredQName(
  oldPrefix: string,
  newPrefix: string,
  value: string
): string {
  return rewriteQName(oldPrefix, newPrefix, value) ?? value;
}

/**
 * Rewrites all QNames in a space-separated list (xs:union/@memberTypes).
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

function rewriteSimpleType(
  oldPrefix: string,
  newPrefix: string,
  st: SimpleTypeLike
): void {
  if (st.restriction) {
    st.restriction.base = rewriteQName(oldPrefix, newPrefix, st.restriction.base);
    if (st.restriction.simpleType) {
      rewriteSimpleType(oldPrefix, newPrefix, st.restriction.simpleType);
    }
  }
  if (st.list) {
    st.list.itemType = rewriteQName(oldPrefix, newPrefix, st.list.itemType);
    if (st.list.simpleType) {
      rewriteSimpleType(oldPrefix, newPrefix, st.list.simpleType);
    }
  }
  if (st.union) {
    st.union.memberTypes = rewriteMemberTypes(oldPrefix, newPrefix, st.union.memberTypes);
    for (const st2 of toArray(st.union.simpleType)) {
      rewriteSimpleType(oldPrefix, newPrefix, st2);
    }
  }
}

function rewriteElement(oldPrefix: string, newPrefix: string, el: ElementLike): void {
  el.type_ = rewriteQName(oldPrefix, newPrefix, el.type_);
  el.ref = rewriteQName(oldPrefix, newPrefix, el.ref);
  if (el.simpleType) rewriteSimpleType(oldPrefix, newPrefix, el.simpleType);
  if (el.complexType) rewriteComplexTypeBody(oldPrefix, newPrefix, el.complexType);
}

function rewriteCompositor(
  oldPrefix: string,
  newPrefix: string,
  compositor: CompositorLike
): void {
  for (const el of toArray(compositor.element)) {
    rewriteElement(oldPrefix, newPrefix, el);
  }
  for (const gr of toArray(compositor.group)) {
    gr.ref = rewriteRequiredQName(oldPrefix, newPrefix, gr.ref);
  }
  for (const sub of toArray(compositor.choice)) {
    rewriteCompositor(oldPrefix, newPrefix, sub);
  }
  for (const sub of toArray(compositor.sequence)) {
    rewriteCompositor(oldPrefix, newPrefix, sub);
  }
}

function rewriteAttributeBearer(
  oldPrefix: string,
  newPrefix: string,
  bearer: AttributeBearer
): void {
  bearer.base = rewriteQName(oldPrefix, newPrefix, bearer.base);
  for (const attr of toArray(bearer.attribute)) {
    attr.type_ = rewriteQName(oldPrefix, newPrefix, attr.type_);
    attr.ref = rewriteQName(oldPrefix, newPrefix, attr.ref);
  }
  for (const agr of toArray(bearer.attributeGroup)) {
    agr.ref = rewriteRequiredQName(oldPrefix, newPrefix, agr.ref);
  }
}

function rewriteCompositorBearer(
  oldPrefix: string,
  newPrefix: string,
  bearer: CompositorBearer
): void {
  rewriteAttributeBearer(oldPrefix, newPrefix, bearer);
  if (bearer.group) {
    bearer.group.ref = rewriteRequiredQName(oldPrefix, newPrefix, bearer.group.ref);
  }
  if (bearer.all) {
    for (const el of toArray(bearer.all.element)) {
      rewriteElement(oldPrefix, newPrefix, el);
    }
  }
  if (bearer.choice) rewriteCompositor(oldPrefix, newPrefix, bearer.choice);
  if (bearer.sequence) rewriteCompositor(oldPrefix, newPrefix, bearer.sequence);
}

function rewriteComplexTypeBody(
  oldPrefix: string,
  newPrefix: string,
  ct: ComplexTypeBodyLike
): void {
  if (ct.simpleContent?.restriction) {
    rewriteAttributeBearer(oldPrefix, newPrefix, ct.simpleContent.restriction);
    if (ct.simpleContent.restriction.simpleType) {
      rewriteSimpleType(oldPrefix, newPrefix, ct.simpleContent.restriction.simpleType);
    }
  }
  if (ct.simpleContent?.extension) {
    rewriteAttributeBearer(oldPrefix, newPrefix, ct.simpleContent.extension);
  }
  if (ct.complexContent?.restriction) {
    rewriteCompositorBearer(oldPrefix, newPrefix, ct.complexContent.restriction);
  }
  if (ct.complexContent?.extension) {
    rewriteCompositorBearer(oldPrefix, newPrefix, ct.complexContent.extension);
  }
  if (ct.group) {
    ct.group.ref = rewriteRequiredQName(oldPrefix, newPrefix, ct.group.ref);
  }
  if (ct.all) {
    for (const el of toArray(ct.all.element)) {
      rewriteElement(oldPrefix, newPrefix, el);
    }
  }
  if (ct.choice) rewriteCompositor(oldPrefix, newPrefix, ct.choice);
  if (ct.sequence) rewriteCompositor(oldPrefix, newPrefix, ct.sequence);
  for (const attr of toArray(ct.attribute)) {
    attr.type_ = rewriteQName(oldPrefix, newPrefix, attr.type_);
    attr.ref = rewriteQName(oldPrefix, newPrefix, attr.ref);
  }
  for (const agr of toArray(ct.attributeGroup)) {
    agr.ref = rewriteRequiredQName(oldPrefix, newPrefix, agr.ref);
  }
}

/**
 * Rewrites all QName-valued attributes in the schema that currently use
 * `oldPrefix:localName`, replacing them with `newPrefix:localName`.
 *
 * Fields covered:
 * - element/@type, element/@ref, element/@substitutionGroup
 * - attribute/@type, attribute/@ref
 * - complexType and localComplexType bodies:
 *   complexContent extension/restriction @base, group/@ref, attributeGroup/@ref,
 *   compositor element types/refs, attribute types/refs
 *   simpleContent extension/restriction @base, attribute types/refs
 * - simpleType restriction/@base, list/@itemType, union/@memberTypes (space-sep list)
 * - namedGroup compositor element types/refs, group refs
 * - namedAttributeGroup attribute types/refs, attributeGroup refs
 *
 * This is called automatically by executeModifyImport when the prefix is renamed.
 */
function rewritePrefixInSchema(
  oldPrefix: string,
  newPrefix: string,
  schemaObj: schema
): void {
  if (oldPrefix === newPrefix) return;

  // Top-level elements
  for (const el of toArray(schemaObj.element)) {
    el.type_ = rewriteQName(oldPrefix, newPrefix, el.type_);
    el.substitutionGroup = rewriteQName(oldPrefix, newPrefix, el.substitutionGroup);
    if (el.simpleType) rewriteSimpleType(oldPrefix, newPrefix, el.simpleType);
    if (el.complexType) rewriteComplexTypeBody(oldPrefix, newPrefix, el.complexType);
  }

  // Top-level attributes
  for (const attr of toArray(schemaObj.attribute)) {
    attr.type_ = rewriteQName(oldPrefix, newPrefix, attr.type_);
    if (attr.simpleType) rewriteSimpleType(oldPrefix, newPrefix, attr.simpleType);
  }

  // Top-level complex types
  for (const ct of toArray(schemaObj.complexType)) {
    rewriteComplexTypeBody(oldPrefix, newPrefix, ct);
  }

  // Top-level simple types
  for (const st of toArray(schemaObj.simpleType)) {
    rewriteSimpleType(oldPrefix, newPrefix, st);
  }

  // Named groups (namedGroup.all is allType, .choice/.sequence are simpleExplicitGroup)
  for (const grp of toArray(schemaObj.group)) {
    if (grp.all) {
      for (const el of toArray(grp.all.element)) {
        rewriteElement(oldPrefix, newPrefix, el);
      }
    }
    if (grp.choice) rewriteCompositor(oldPrefix, newPrefix, grp.choice);
    if (grp.sequence) rewriteCompositor(oldPrefix, newPrefix, grp.sequence);
  }

  // Named attribute groups
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

// ===== Import Executors =====

/**
 * Executes an addImport command.
 *
 * Appends a new xs:import declaration with the given namespace and
 * schemaLocation to the schema's import array.
 *
 * A namespace prefix is always registered in schema._namespacePrefixes so
 * that elements can reference types from the imported namespace using that
 * prefix (e.g. `type="prefix:TypeName"`). If `prefix` is not provided, a
 * unique prefix is auto-generated (e.g. "ns0", "ns1", …).
 *
 * @param command - The addImport command to execute
 * @param schemaObj - The schema object to modify
 */
export function executeAddImport(
  command: AddImportCommand,
  schemaObj: schema
): void {
  const { namespace, schemaLocation, prefix } = command.payload;
  const newImport = new importType();
  newImport.namespace = namespace;
  newImport.schemaLocation = schemaLocation;
  schemaObj.import_ = [...toArray(schemaObj.import_), newImport];

  // Always ensure a prefix is registered so types can be referenced
  const registeredPrefix = prefix ?? generateUniquePrefix(schemaObj);
  if (!schemaObj._namespacePrefixes) {
    schemaObj._namespacePrefixes = {};
  }
  schemaObj._namespacePrefixes[registeredPrefix] = namespace;
}

/**
 * Executes a removeImport command.
 *
 * Removes the xs:import at the position encoded in `importId`
 * (e.g. "/import[0]" removes the first import).
 *
 * Also removes all namespace prefix registrations in schema._namespacePrefixes
 * that point to the removed import's namespace URI.
 *
 * @param command - The removeImport command to execute
 * @param schemaObj - The schema object to modify
 */
export function executeRemoveImport(
  command: RemoveImportCommand,
  schemaObj: schema
): void {
  const { importId } = command.payload;
  const { imports, index } = resolveImport(importId, schemaObj);
  const removedNamespace = imports[index].namespace;
  imports.splice(index, 1);
  schemaObj.import_ = imports.length > 0 ? imports : undefined;

  if (removedNamespace) {
    removePrefixForNamespace(removedNamespace, schemaObj);
  }
}

/**
 * Executes a modifyImport command.
 *
 * Updates the namespace and/or schemaLocation of the xs:import at the
 * position encoded in `importId` (e.g. "/import[0]" targets the first import).
 * Only the properties present in the payload are changed.
 *
 * Namespace prefix management:
 * - When `namespace` changes, existing prefix registrations pointing to the
 *   old namespace URI are updated to point to the new URI.
 * - When `prefix` is provided, the old prefix key for this import's namespace
 *   is removed and replaced with the new prefix. All QName references in the
 *   schema that used the old prefix (e.g. `old:MyType`) are rewritten to use
 *   the new prefix (e.g. `new:MyType`).
 *
 * @param command - The modifyImport command to execute
 * @param schemaObj - The schema object to modify
 */
export function executeModifyImport(
  command: ModifyImportCommand,
  schemaObj: schema
): void {
  const { importId, namespace, schemaLocation, prefix } = command.payload;
  const { imports, index } = resolveImport(importId, schemaObj);
  const importEntry = imports[index];
  const oldNamespace = importEntry.namespace;

  if (namespace !== undefined) {
    importEntry.namespace = namespace;
    // Update existing prefix registrations to point to the new namespace URI
    if (schemaObj._namespacePrefixes && oldNamespace) {
      for (const [pfx, ns] of Object.entries(schemaObj._namespacePrefixes)) {
        if (ns === oldNamespace) {
          schemaObj._namespacePrefixes[pfx] = namespace;
        }
      }
    }
  }

  if (schemaLocation !== undefined) {
    importEntry.schemaLocation = schemaLocation;
  }

  if (prefix !== undefined) {
    // The namespace we're renaming the prefix for: the new namespace if it was
    // also changed in this command, otherwise the old one.
    const targetNamespace = namespace ?? oldNamespace;
    if (targetNamespace) {
      // Capture the existing prefix before it is removed so we can rewrite
      // all QName references in the schema body.
      const existingPrefix = schemaObj._namespacePrefixes
        ? Object.keys(schemaObj._namespacePrefixes).find(
            (p) => schemaObj._namespacePrefixes![p] === targetNamespace
          )
        : undefined;

      removePrefixForNamespace(targetNamespace, schemaObj);
      if (!schemaObj._namespacePrefixes) {
        schemaObj._namespacePrefixes = {};
      }
      schemaObj._namespacePrefixes[prefix] = targetNamespace;

      // Rewrite every QName reference that used the old prefix
      if (existingPrefix && existingPrefix !== prefix) {
        rewritePrefixInSchema(existingPrefix, prefix, schemaObj);
      }
    }
  }
}

// ===== Include Executors =====

/**
 * Executes an addInclude command.
 *
 * @param _command - The addInclude command to execute
 * @param _schemaObj - The schema object to modify
 * @throws Error - Not yet implemented
 */
export function executeAddInclude(
  _command: AddIncludeCommand,
  _schemaObj: schema
): void {
  throw new Error("addInclude execution not yet implemented");
}

/**
 * Executes a removeInclude command.
 *
 * @param _command - The removeInclude command to execute
 * @param _schemaObj - The schema object to modify
 * @throws Error - Not yet implemented
 */
export function executeRemoveInclude(
  _command: RemoveIncludeCommand,
  _schemaObj: schema
): void {
  throw new Error("removeInclude execution not yet implemented");
}

/**
 * Executes a modifyInclude command.
 *
 * @param _command - The modifyInclude command to execute
 * @param _schemaObj - The schema object to modify
 * @throws Error - Not yet implemented
 */
export function executeModifyInclude(
  _command: ModifyIncludeCommand,
  _schemaObj: schema
): void {
  throw new Error("modifyInclude execution not yet implemented");
}
