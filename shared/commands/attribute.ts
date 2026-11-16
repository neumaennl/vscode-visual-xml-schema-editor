/**
 * Attribute command types for managing element attributes.
 * Provides commands for adding, removing, and modifying attributes.
 */

import type { BaseCommand } from "./base.js";

/**
 * The fields of an attribute that addAttribute sets and modifyAttribute changes. An attribute is either
 * named, with `attributeName` and `attributeType`, or a reference with `ref`. modifyAttribute only
 * changes the fields that the payload contains.
 */
export interface AttributeFields {
  /** Name of the attribute. Required for a new attribute that is not a reference; when modified, clears ref. */
  attributeName?: string;
  /** Type of the attribute. Required for a new attribute that is not a reference; when modified, clears ref. */
  attributeType?: string;
  /**
   * Reference to an existing top-level attribute. Mutually exclusive with attributeName/attributeType;
   * when modified, clears name and type.
   */
  ref?: string;
  /** Whether the attribute is required (default for a new attribute: false). Valid for both named and reference attributes. */
  required?: boolean;
  /** Default value of the attribute. Not valid with ref. */
  defaultValue?: string;
  /** Fixed value of the attribute. Not valid with ref. */
  fixedValue?: string;
  /** Documentation of the attribute */
  documentation?: string;
}

/**
 * Payload for adding a new attribute to an element.
 * Either `attributeName` + `attributeType` (named attribute) or `ref` (reference) must be provided.
 */
export interface AddAttributePayload extends AttributeFields {
  /** ID of the parent element */
  parentId: string;
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
export interface ModifyAttributePayload extends AttributeFields {
  /** ID of the attribute to modify */
  attributeId: string;
}

/**
 * Command to modify an existing attribute.
 */
export interface ModifyAttributeCommand extends BaseCommand<ModifyAttributePayload> {
  type: "modifyAttribute";
  payload: ModifyAttributePayload;
}

/** The commands that add, remove and modify an attribute. */
export type AttributeCommand = AddAttributeCommand | RemoveAttributeCommand | ModifyAttributeCommand;
