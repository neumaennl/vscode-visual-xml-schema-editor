/**
 * Validators for schema-level commands (Import and Include).
 */

import {
  schema,
  AddImportCommand,
  RemoveImportCommand,
  ModifyImportCommand,
  AddIncludeCommand,
  RemoveIncludeCommand,
  ModifyIncludeCommand,
} from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";
import { parseSchemaId } from "../../shared/idStrategy";
import { ValidationResult } from "./validationUtils";

// ===== Helpers =====

/**
 * Parses an importId and validates it refers to an existing import entry.
 * Returns a ValidationResult with an error if invalid, or undefined if valid.
 */
function validateImportId(importId: string, schemaObj: schema): ValidationResult | undefined {
  let parsed;
  try {
    parsed = parseSchemaId(importId);
  } catch {
    return { valid: false, error: `Invalid import ID: ${importId}` };
  }
  const index = parsed.position;
  const imports = toArray(schemaObj.import_);
  if (index === undefined || index < 0 || index >= imports.length) {
    return { valid: false, error: `Import not found: ${importId}` };
  }
  return undefined;
}

// ===== Import Command Validation =====

export function validateAddImport(
  command: AddImportCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.namespace.trim()) {
    return { valid: false, error: "Namespace cannot be empty" };
  }
  if (!command.payload.schemaLocation.trim()) {
    return { valid: false, error: "Schema location cannot be empty" };
  }
  return { valid: true };
}

export function validateRemoveImport(
  command: RemoveImportCommand,
  schemaObj: schema
): ValidationResult {
  if (!command.payload.importId.trim()) {
    return { valid: false, error: "Import ID cannot be empty" };
  }
  return validateImportId(command.payload.importId, schemaObj) ?? { valid: true };
}

export function validateModifyImport(
  command: ModifyImportCommand,
  schemaObj: schema
): ValidationResult {
  if (!command.payload.importId.trim()) {
    return { valid: false, error: "Import ID cannot be empty" };
  }
  return validateImportId(command.payload.importId, schemaObj) ?? { valid: true };
}

// ===== Include Command Validation =====

export function validateAddInclude(
  command: AddIncludeCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.schemaLocation.trim()) {
    return { valid: false, error: "Schema location cannot be empty" };
  }
  // TODO Phase 2: Validate schemaLocation is a valid path/URI
  // TODO Phase 2: Check if include already exists
  return { valid: true };
}

export function validateRemoveInclude(
  command: RemoveIncludeCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.includeId.trim()) {
    return { valid: false, error: "Include ID cannot be empty" };
  }
  // TODO Phase 2: Validate that includeId exists in schema
  return { valid: true };
}

export function validateModifyInclude(
  command: ModifyIncludeCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.includeId.trim()) {
    return { valid: false, error: "Include ID cannot be empty" };
  }
  // TODO Phase 2: Validate that includeId exists in schema
  return { valid: true };
}
