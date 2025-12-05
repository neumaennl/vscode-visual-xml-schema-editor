/**
 * Element command types for managing XML schema elements.
 * Provides commands for adding, removing, and modifying schema elements.
 */

import { BaseCommand } from "./base";

/**
 * Payload for adding a new element to the schema.
 */
export interface AddElementPayload {
  /** ID of the parent node where the element should be added */
  parentId: string;
  /** Name of the new element */
  elementName: string;
  /** Type of the element (e.g., 'string', 'int', or a custom type name) */
  elementType: string;
  /** Minimum occurrences (default: 1) */
  minOccurs?: number;
  /** Maximum occurrences (default: 1, use 'unbounded' for unlimited) */
  maxOccurs?: number | "unbounded";
  /** Optional documentation for the element */
  documentation?: string;
}

/**
 * Command to add a new element to the schema.
 */
export interface AddElementCommand extends BaseCommand<AddElementPayload> {
  type: "addElement";
  payload: AddElementPayload;
}

/**
 * Payload for removing an element from the schema.
 */
export interface RemoveElementPayload {
  /** ID of the element to remove */
  elementId: string;
}

/**
 * Command to remove an element from the schema.
 */
export interface RemoveElementCommand extends BaseCommand<RemoveElementPayload> {
  type: "removeElement";
  payload: RemoveElementPayload;
}

/**
 * Payload for modifying an existing element.
 */
export interface ModifyElementPayload {
  /** ID of the element to modify */
  elementId: string;
  /** New name for the element (optional) */
  elementName?: string;
  /** New type for the element (optional) */
  elementType?: string;
  /** New minimum occurrences (optional) */
  minOccurs?: number;
  /** New maximum occurrences (optional) */
  maxOccurs?: number | "unbounded";
  /** New documentation (optional) */
  documentation?: string;
}

/**
 * Command to modify an existing element.
 */
export interface ModifyElementCommand extends BaseCommand<ModifyElementPayload> {
  type: "modifyElement";
  payload: ModifyElementPayload;
}
