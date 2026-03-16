/**
 * Executors for schema-level commands (imports and includes).
 * Implements add, remove, and modify operations for schema imports and includes.
 *
 * Import ID Convention:
 * - Imports are addressed by position using XPath-like IDs: /import[N]
 *   where N is the zero-based index in the schema's import array.
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
 * entry and its index, throwing if the position is out of range.
 */
function resolveImport(
  importId: string,
  schemaObj: schema
): { imports: importType[]; index: number } {
  const parsed = parseSchemaId(importId);
  const index = parsed.position;
  const imports = toArray(schemaObj.import_);
  if (index === undefined || index < 0 || index >= imports.length) {
    throw new Error(`Import not found: ${importId}`);
  }
  return { imports, index };
}

// ===== Import Executors =====

/**
 * Executes an addImport command.
 *
 * Appends a new xs:import declaration with the given namespace and
 * schemaLocation to the schema's import array.
 *
 * @param command - The addImport command to execute
 * @param schemaObj - The schema object to modify
 */
export function executeAddImport(
  command: AddImportCommand,
  schemaObj: schema
): void {
  const { namespace, schemaLocation } = command.payload;
  const newImport = new importType();
  newImport.namespace = namespace;
  newImport.schemaLocation = schemaLocation;
  schemaObj.import_ = [...toArray(schemaObj.import_), newImport];
}

/**
 * Executes a removeImport command.
 *
 * Removes the xs:import at the position encoded in `importId`
 * (e.g. "/import[0]" removes the first import).
 *
 * @param command - The removeImport command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the importId cannot be parsed or the position is out of range
 */
export function executeRemoveImport(
  command: RemoveImportCommand,
  schemaObj: schema
): void {
  const { importId } = command.payload;
  const { imports, index } = resolveImport(importId, schemaObj);
  imports.splice(index, 1);
  schemaObj.import_ = imports.length > 0 ? imports : undefined;
}

/**
 * Executes a modifyImport command.
 *
 * Updates the namespace and/or schemaLocation of the xs:import at the
 * position encoded in `importId` (e.g. "/import[0]" targets the first import).
 * Only the properties that are present in the payload are changed.
 *
 * @param command - The modifyImport command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the importId cannot be parsed or the position is out of range
 */
export function executeModifyImport(
  command: ModifyImportCommand,
  schemaObj: schema
): void {
  const { importId, namespace, schemaLocation } = command.payload;
  const { imports, index } = resolveImport(importId, schemaObj);
  const importEntry = imports[index];
  if (namespace !== undefined) {
    importEntry.namespace = namespace;
  }
  if (schemaLocation !== undefined) {
    importEntry.schemaLocation = schemaLocation;
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
