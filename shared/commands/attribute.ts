/**
 * Attribute command types for managing element attributes.
 * Provides commands for adding, removing, and modifying attributes.
 */

import { BaseCommand } from "./base";

/**
 * Payload for adding a new attribute to an element.
 */
export interface AddAttributePayload {
  /** ID of the parent element */
  parentId: string;
  /** Name of the attribute */
  attributeName: string;
  /** Type of the attribute */
  attributeType: string;
  /** Whether the attribute is required (default: false) */
  required?: boolean;
  /** Default value for the attribute (optional) */
  defaultValue?: string;
  /** Fixed value for the attribute (optional) */
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
  /** New name for the attribute (optional) */
  attributeName?: string;
  /** New type for the attribute (optional) */
  attributeType?: string;
  /** New required status (optional) */
  required?: boolean;
  /** New default value (optional) */
  defaultValue?: string;
  /** New fixed value (optional) */
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
