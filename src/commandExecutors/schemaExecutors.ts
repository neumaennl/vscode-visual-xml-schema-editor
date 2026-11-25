/**
 * Executors for schema-level commands (imports and includes).
 * Implements add, remove, and modify operations for schema imports and includes.
 *
 * Import ID Convention:
 * - Imports are addressed by position using XPath-like IDs: `/import[N]`
 *   where N is the zero-based index in the schema's import array.
 *
 * Include ID Convention:
 * - Includes are addressed by position using XPath-like IDs: `/include[N]`
 *   where N is the zero-based index in the schema's include array.
 *
 * Prefix Convention:
 * - Each import may have an associated namespace prefix registered in
 *   `schema._namespacePrefixes` (maps prefix → namespace URI).
 * - Executors maintain `_namespacePrefixes` in sync with `import_` when a prefix
 *   is provided or when an import is removed.
 * - When a prefix is renamed, ALL QName references using the old prefix are
 *   updated throughout the schema (see {@link rewritePrefix}).
 * - Commands are assumed to have been pre-validated; no duplicate checks are
 *   performed here.
 */

import type {
  schema,
  AddImportCommand,
  RemoveImportCommand,
  ModifyImportCommand,
  AddIncludeCommand,
  RemoveIncludeCommand,
  ModifyIncludeCommand,
  ModifySchemaNamespacesCommand,
  NamespacePrefixes,
} from "../../shared/types.js";
import { importType, includeType } from "../../shared/types.js";
import { parseSchemaId } from "../../shared/idStrategy.js";
import { firstFreePrefix, normalizeNamespacePrefixes } from "../../shared/qNames.js";
import { assumeValidated } from "./assumeValidated.js";
import { removeFrom } from "./nodeProperties.js";
import { rewritePrefix } from "../schemaReferences/referenceRewrites.js";

// ===== Helpers =====

/**
 * Finds the import or include that an ID such as `"/import[0]"` or `"/include[0]"` identifies.
 *
 * @param id - The ID of the import or include
 * @param entries - The imports or includes of the schema
 * @param label - `Import` or `Include`, for the error message
 * @returns The entry
 * @throws An {@link Error} if there is no entry at the position, which the validator rules out
 */
function findModuleEntry<T>(id: string, entries: T[] | undefined, label: string): T {
  const index = assumeValidated(parseSchemaId(id).position, `Position of ${id}`);
  return assumeValidated(entries?.[index], `${label} ${id}`);
}

/**
 * Removes all prefix registrations in `schema._namespacePrefixes` whose value
 * equals the given namespace URI.
 *
 * Multiple prefixes for the same namespace can exist when a schema is loaded
 * from XML that declares redundant namespace bindings, or when prefix entries
 * are left over from previous modify operations. Removing all of them ensures
 * no dangling prefix points to a namespace that is no longer imported.
 *
 * @param namespaceUri - The namespace URI
 * @param schemaObj - The schema
 */
function removePrefixForNamespace(namespaceUri: string, schemaObj: schema): void {
  if (!schemaObj._namespacePrefixes) return;
  schemaObj._namespacePrefixes = Object.fromEntries(
    Object.entries(schemaObj._namespacePrefixes).filter(([, ns]) => ns !== namespaceUri)
  );
}

// ===== Import Executors =====

/**
 * Executes an `addImport` command.
 *
 * Appends a new `xs:import` declaration with the given namespace and
 * `schemaLocation` to the schema's import array.
 *
 * A namespace prefix is always registered in `schema._namespacePrefixes` so
 * that elements can reference types from the imported namespace using that
 * prefix (e.g. `type="prefix:TypeName"`). If `prefix` is not provided, a
 * unique prefix is auto-generated (e.g. `"ns0"`, `"ns1"`, …).
 *
 * @param command - The `addImport` command to execute
 * @param schemaObj - The schema object to modify
 */
export function executeAddImport(command: AddImportCommand, schemaObj: schema): void {
  const namespace = command.payload.namespace.trim();
  const schemaLocation = command.payload.schemaLocation.trim();
  const prefix = command.payload.prefix?.trim();
  const newImport = new importType();
  newImport.namespace = namespace;
  newImport.schemaLocation = schemaLocation;
  schemaObj.import_ = [...(schemaObj.import_ ?? []), newImport];

  // Always ensure a prefix is registered so types can be referenced
  const registeredPrefix = prefix ?? firstFreePrefix(schemaObj._namespacePrefixes ?? {});
  schemaObj._namespacePrefixes ??= {};
  schemaObj._namespacePrefixes[registeredPrefix] = namespace;
}

/**
 * Executes a `removeImport` command.
 *
 * Removes the `xs:import` at the position encoded in `importId`
 * (e.g. `"/import[0]"` removes the first import).
 *
 * Also removes all namespace prefix registrations in `schema._namespacePrefixes`
 * that point to the removed import's namespace URI.
 *
 * @param command - The `removeImport` command to execute
 * @param schemaObj - The schema object to modify
 */
export function executeRemoveImport(command: RemoveImportCommand, schemaObj: schema): void {
  const { importId } = command.payload;
  const removed = findModuleEntry(importId, schemaObj.import_, "Import");
  removeFrom(schemaObj, "import_", (entry) => entry === removed, `Import ${importId}`);
  const removedNamespace = removed.namespace;

  if (removedNamespace) {
    removePrefixForNamespace(removedNamespace, schemaObj);
  }
}

/**
 * Executes a `modifyImport` command.
 *
 * Updates the namespace and/or `schemaLocation` of the `xs:import` at the
 * position encoded in `importId` (e.g. `"/import[0]"` targets the first import).
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
 * @param command - The `modifyImport` command to execute
 * @param schemaObj - The schema object to modify
 */
export function executeModifyImport(command: ModifyImportCommand, schemaObj: schema): void {
  const { importId, oldPrefix } = command.payload;
  const namespace = command.payload.namespace?.trim();
  const schemaLocation = command.payload.schemaLocation?.trim();
  const prefix = command.payload.prefix?.trim();
  const importEntry = findModuleEntry(importId, schemaObj.import_, "Import");
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
    schemaObj._namespacePrefixes ??= {};
    const targetNamespace = assumeValidated(namespace ?? oldNamespace, `Namespace of ${importId}`);
    if (oldPrefix !== undefined) {
      // Explicit rename: remove the named old prefix, register the new one,
      // and rewrite all QName references from oldPrefix to prefix.
      const { [oldPrefix]: _removed, ...otherPrefixes } = schemaObj._namespacePrefixes;
      schemaObj._namespacePrefixes = otherPrefixes;
      if (oldPrefix !== prefix) {
        rewritePrefix(oldPrefix, prefix, schemaObj);
      }
    }
    // Without oldPrefix, the prefix is an additional binding of the namespace
    schemaObj._namespacePrefixes[prefix] = targetNamespace;
  }
}

// ===== Include Executors =====

/**
 * Executes an `addInclude` command.
 *
 * Appends a new `xs:include` declaration with the given `schemaLocation` to the
 * schema's include array.  `xs:include` is used for same-namespace schemas;
 * it carries only a `schemaLocation` attribute (no namespace attribute).
 *
 * @param command - The `addInclude` command to execute
 * @param schemaObj - The schema object to modify
 */
export function executeAddInclude(command: AddIncludeCommand, schemaObj: schema): void {
  const schemaLocation = command.payload.schemaLocation.trim();
  const newInclude = new includeType();
  newInclude.schemaLocation = schemaLocation;
  schemaObj.include = [...(schemaObj.include ?? []), newInclude];
}

/**
 * Executes a `removeInclude` command.
 *
 * Removes the `xs:include` at the position encoded in `includeId`
 * (e.g. `"/include[0]"` removes the first include).
 *
 * @param command - The `removeInclude` command to execute
 * @param schemaObj - The schema object to modify
 */
export function executeRemoveInclude(command: RemoveIncludeCommand, schemaObj: schema): void {
  const { includeId } = command.payload;
  const removed = findModuleEntry(includeId, schemaObj.include, "Include");
  removeFrom(schemaObj, "include", (entry) => entry === removed, `Include ${includeId}`);
}

/**
 * Executes a `modifyInclude` command.
 *
 * Updates the `schemaLocation` of the `xs:include` at the position encoded in
 * `includeId` (e.g. `"/include[0]"` targets the first include).
 *
 * @param command - The `modifyInclude` command to execute
 * @param schemaObj - The schema object to modify
 */
export function executeModifyInclude(command: ModifyIncludeCommand, schemaObj: schema): void {
  const { includeId } = command.payload;
  const schemaLocation = command.payload.schemaLocation.trim();
  findModuleEntry(includeId, schemaObj.include, "Include").schemaLocation = schemaLocation;
}

/** A prefix that a change of the namespace declarations renames. */
interface PrefixRename {
  oldPrefix: string;
  newPrefix: string;
}

/**
 * Finds the prefixes that were renamed: a removed prefix whose namespace an added prefix now declares.
 * Each added prefix is used for one rename at most.
 *
 * @param previousNamespacePrefixes - The declarations before the change
 * @param nextNamespacePrefixes - The declarations after the change
 * @returns The renames, old prefix and new prefix
 */
function detectPrefixRenames(
  previousNamespacePrefixes: Readonly<NamespacePrefixes>,
  nextNamespacePrefixes: Readonly<NamespacePrefixes>
): PrefixRename[] {
  const removedPrefixes = Object.keys(previousNamespacePrefixes).filter(
    (prefix) => !Object.prototype.hasOwnProperty.call(nextNamespacePrefixes, prefix)
  );
  const addedPrefixes = Object.keys(nextNamespacePrefixes).filter(
    (prefix) => !Object.prototype.hasOwnProperty.call(previousNamespacePrefixes, prefix)
  );
  const usedAddedPrefixes = new Set<string>();
  const renames: PrefixRename[] = [];
  for (const oldPrefix of removedPrefixes) {
    const previousNamespaceUri = previousNamespacePrefixes[oldPrefix];
    const candidatePrefix = addedPrefixes.find(
      (newPrefix) => !usedAddedPrefixes.has(newPrefix) && nextNamespacePrefixes[newPrefix] === previousNamespaceUri
    );
    if (!candidatePrefix) {
      continue;
    }
    usedAddedPrefixes.add(candidatePrefix);
    renames.push({ oldPrefix, newPrefix: candidatePrefix });
  }
  return renames;
}

/**
 * Executes a `modifySchemaNamespaces` command: replaces the namespace declarations and the target
 * namespace of the schema, and rewrites the QNames whose prefix was renamed.
 *
 * @param command - The command
 * @param schemaObj - The schema
 */
export function executeModifySchemaNamespaces(command: ModifySchemaNamespacesCommand, schemaObj: schema): void {
  const normalizedNamespacePrefixes = normalizeNamespacePrefixes(command.payload.namespacePrefixes);
  const previousNamespacePrefixes = normalizeNamespacePrefixes(
    command.payload.previousNamespacePrefixes ?? schemaObj._namespacePrefixes ?? {}
  );
  const prefixRenames = detectPrefixRenames(previousNamespacePrefixes, normalizedNamespacePrefixes);
  for (const { oldPrefix, newPrefix } of prefixRenames) {
    // A rename pairs a removed prefix with an added one, so the two always differ. Renames from or to
    // the default namespace (the empty prefix) are not rewritten yet (see "Turning the default
    // namespace into a prefix does not rewrite references" in docs/known-issues.md)
    if (oldPrefix && newPrefix) {
      rewritePrefix(oldPrefix, newPrefix, schemaObj);
    }
  }

  schemaObj._namespacePrefixes =
    Object.keys(normalizedNamespacePrefixes).length > 0 ? normalizedNamespacePrefixes : undefined;

  // An empty target namespace removes the attribute
  const normalizedTargetNamespace = command.payload.targetNamespace?.trim() ?? "";
  schemaObj.targetNamespace = normalizedTargetNamespace || undefined;
}
