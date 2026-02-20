/**
 * Executors for attribute commands.
 * Implements add, remove, and modify operations for schema attributes.
 * 
 * Note: These are stubs for Phase 2+ implementation.
 */

import {
  schema,
  AddAttributeCommand,
  RemoveAttributeCommand,
  ModifyAttributeCommand,
} from "../../shared/types";

/**
 * Executes an addAttribute command.
 *
 * @param _command - The addAttribute command to execute
 * @param _schemaObj - The schema object to modify
 * @throws Error - Not yet implemented
 */
export function executeAddAttribute(
  _command: AddAttributeCommand,
  _schemaObj: schema
): void {
  throw new Error("addAttribute execution not yet implemented");
}

/**
 * Executes a removeAttribute command.
 *
 * @param _command - The removeAttribute command to execute
 * @param _schemaObj - The schema object to modify
 * @throws Error - Not yet implemented
 */
export function executeRemoveAttribute(
  _command: RemoveAttributeCommand,
  _schemaObj: schema
): void {
  throw new Error("removeAttribute execution not yet implemented");
}

/**
 * Executes a modifyAttribute command.
 *
 * @param _command - The modifyAttribute command to execute
 * @param _schemaObj - The schema object to modify
 * @throws Error - Not yet implemented
 */
export function executeModifyAttribute(
  _command: ModifyAttributeCommand,
  _schemaObj: schema
): void {
  throw new Error("modifyAttribute execution not yet implemented");
}
