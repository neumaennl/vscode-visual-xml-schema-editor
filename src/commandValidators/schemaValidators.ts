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
import { ValidationResult } from "./validationUtils";

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
  // TODO Phase 2: Validate namespace URI format
  // TODO Phase 2: Check if import already exists
  // TODO Phase 2: Validate schemaLocation is a valid path/URI
  return { valid: true };
}

export function validateRemoveImport(
  command: RemoveImportCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.importId.trim()) {
    return { valid: false, error: "Import ID cannot be empty" };
  }
  // TODO Phase 2: Validate that importId exists in schema
  return { valid: true };
}

export function validateModifyImport(
  command: ModifyImportCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.importId.trim()) {
    return { valid: false, error: "Import ID cannot be empty" };
  }
  // TODO Phase 2: Validate that importId exists in schema
  return { valid: true };
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
