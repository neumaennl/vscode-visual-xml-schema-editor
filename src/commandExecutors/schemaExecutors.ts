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
 *   updated throughout the schema (see {@link rewritePrefixInSchema}).
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
import { rewritePrefixInSchema } from "./schemaQNameRewriter";

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
  return { imports: toArray(schemaObj.import_), index: parsed.position ?? 0 };
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
  const namespace = command.payload.namespace.trim();
  const schemaLocation = command.payload.schemaLocation.trim();
  const prefix = command.payload.prefix?.trim();
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
 * - When `prefix` is provided without `oldPrefix`, the new prefix is registered
 *   as an additional binding for the import's namespace (no deletion, no rewrite).
 * - When both `prefix` and `oldPrefix` are provided, this is a rename: the named
 *   old prefix key is removed, the new prefix is registered, and all QName
 *   references using `oldPrefix:localName` are rewritten to `prefix:localName`.
 *
 * @param command - The modifyImport command to execute
 * @param schemaObj - The schema object to modify
 */
export function executeModifyImport(
  command: ModifyImportCommand,
  schemaObj: schema
): void {
  const { importId, oldPrefix } = command.payload;
  const namespace = command.payload.namespace?.trim();
  const schemaLocation = command.payload.schemaLocation?.trim();
  const prefix = command.payload.prefix?.trim();
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
    if (!schemaObj._namespacePrefixes) {
      schemaObj._namespacePrefixes = {};
    }
    const targetNamespace = namespace ?? oldNamespace;
    if (oldPrefix !== undefined) {
      // Explicit rename: remove the named old prefix, register the new one,
      // and rewrite all QName references from oldPrefix to prefix.
      delete schemaObj._namespacePrefixes[oldPrefix];
      if (targetNamespace) {
        schemaObj._namespacePrefixes[prefix] = targetNamespace;
        if (oldPrefix !== prefix) {
          rewritePrefixInSchema(oldPrefix, prefix, schemaObj);
        }
      }
    } else {
      // No oldPrefix: simply register prefix as an additional binding.
      if (targetNamespace) {
        schemaObj._namespacePrefixes[prefix] = targetNamespace;
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

