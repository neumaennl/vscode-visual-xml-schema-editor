/**
 * Element command types for managing XML schema elements.
 * Provides commands for adding, removing, and modifying schema elements.
 */

import { BaseCommand } from "./base";

/**
 * Payload for adding a new element to the schema.
 * Either `elementName` + `elementType` (named element) or `ref` (reference) must be provided.
 */
export interface AddElementPayload {
  /** ID of the parent node where the element should be added */
  parentId: string;
  /** Name of the new element. Required when not using ref. */
  elementName?: string;
  /** Type of the element (e.g., 'string', 'int', or a custom type name). Required when not using ref. */
  elementType?: string;
  /** Reference to an existing top-level element. Mutually exclusive with elementName/elementType. */
  ref?: string;
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
  /** New name for the element (optional). When set, clears ref. */
  elementName?: string;
  /** New type for the element (optional). When set, clears ref. */
  elementType?: string;
  /**
   * New ref for the element (optional). When set, clears name and type.
   * Mutually exclusive with elementName/elementType.
   */
  ref?: string;
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
