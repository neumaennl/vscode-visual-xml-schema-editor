/**
 * Attribute command types for managing element attributes.
 * Provides commands for adding, removing, and modifying attributes.
 */

import { BaseCommand } from "./base";

/**
 * Payload for adding a new attribute to an element.
 * Either `attributeName` + `attributeType` (named attribute) or `ref` (reference) must be provided.
 */
export interface AddAttributePayload {
  /** ID of the parent element */
  parentId: string;
  /** Name of the attribute. Required when not using ref. */
  attributeName?: string;
  /** Type of the attribute. Required when not using ref. */
  attributeType?: string;
  /** Reference to an existing top-level attribute. Mutually exclusive with attributeName/attributeType. */
  ref?: string;
  /** Whether the attribute is required (default: false). Valid for both named and reference attributes. */
  required?: boolean;
  /** Default value for the attribute (optional). Not valid with ref. */
  defaultValue?: string;
  /** Fixed value for the attribute (optional). Not valid with ref. */
  fixedValue?: string;
  /** Optional documentation for the attribute */
  documentation?: string;
}

/**
 * Command to add a new attribute to an element.
 */
export interface AddAttributeCommand extends BaseCommand<AddAttributePayload> {
  type: "addAttribute";
  payload: AddAttributePayload;
}

/**
 * Payload for removing an attribute.
 */
export interface RemoveAttributePayload {
  /** ID of the attribute to remove */
  attributeId: string;
}

/**
 * Command to remove an attribute.
 */
export interface RemoveAttributeCommand extends BaseCommand<RemoveAttributePayload> {
  type: "removeAttribute";
  payload: RemoveAttributePayload;
}

/**
 * Payload for modifying an existing attribute.
 */
export interface ModifyAttributePayload {
  /** ID of the attribute to modify */
  attributeId: string;
  /** New name for the attribute (optional). When set, clears ref. */
  attributeName?: string;
  /** New type for the attribute (optional). When set, clears ref. */
  attributeType?: string;
  /**
   * New ref for the attribute (optional). When set, clears name and type.
   * Mutually exclusive with attributeName/attributeType.
   */
  ref?: string;
  /** New required status (optional) */
  required?: boolean;
  /** New default value (optional). Not valid with ref. */
  defaultValue?: string;
  /** New fixed value (optional). Not valid with ref. */
  fixedValue?: string;
  /** New documentation (optional) */
  documentation?: string;
}

/**
 * Command to modify an existing attribute.
 */
export interface ModifyAttributeCommand extends BaseCommand<ModifyAttributePayload> {
  type: "modifyAttribute";
  payload: ModifyAttributePayload;
}
