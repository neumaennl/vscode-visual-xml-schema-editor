/**
 * Module command types for managing schema imports and includes.
 * Provides commands for modularizing schemas across multiple files.
 */

import { BaseCommand } from "./base";

/**
 * Payload for adding an import to the schema.
 */
export interface AddImportPayload {
  /** Namespace URI to import */
  namespace: string;
  /** Location of the schema to import */
  schemaLocation: string;
}

/**
 * Command to add an import.
 */
export interface AddImportCommand extends BaseCommand<AddImportPayload> {
  type: "addImport";
  payload: AddImportPayload;
}

/**
 * Payload for removing an import.
 */
export interface RemoveImportPayload {
  /** ID of the import to remove */
  importId: string;
}

/**
 * Command to remove an import.
 */
export interface RemoveImportCommand extends BaseCommand<RemoveImportPayload> {
  type: "removeImport";
  payload: RemoveImportPayload;
}

/**
 * Payload for modifying an import.
 */
export interface ModifyImportPayload {
  /** ID of the import to modify */
  importId: string;
  /** New namespace (optional) */
  namespace?: string;
  /** New schema location (optional) */
  schemaLocation?: string;
}

/**
 * Command to modify an import.
 */
export interface ModifyImportCommand extends BaseCommand<ModifyImportPayload> {
  type: "modifyImport";
  payload: ModifyImportPayload;
}

/**
 * Payload for adding an include to the schema.
 */
export interface AddIncludePayload {
  /** Location of the schema to include */
  schemaLocation: string;
}

/**
 * Command to add an include.
 */
export interface AddIncludeCommand extends BaseCommand<AddIncludePayload> {
  type: "addInclude";
  payload: AddIncludePayload;
}

/**
 * Payload for removing an include.
 */
export interface RemoveIncludePayload {
  /** ID of the include to remove */
  includeId: string;
}

/**
 * Command to remove an include.
 */
export interface RemoveIncludeCommand extends BaseCommand<RemoveIncludePayload> {
  type: "removeInclude";
  payload: RemoveIncludePayload;
}

/**
 * Payload for modifying an include.
 */
export interface ModifyIncludePayload {
  /** ID of the include to modify */
  includeId: string;
  /** New schema location (optional) */
  schemaLocation?: string;
}

/**
 * Command to modify an include.
 */
export interface ModifyIncludeCommand extends BaseCommand<ModifyIncludePayload> {
  type: "modifyInclude";
  payload: ModifyIncludePayload;
}
