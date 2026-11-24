/**
 * Commands that add, remove and modify attribute groups and attribute group references.
 */

import type { BaseCommand } from "./base.js";

/**
 * Payload for adding an attribute group definition or an attribute group reference.
 *
 * Two modes, mutually exclusive:
 * - **Definition** (`groupName`): creates a top-level `xs:attributeGroup name="..."`.
 *   Always created at the schema root; `parentId` must not be provided in this mode.
 * - **Reference** (`ref` + `parentId`): creates `xs:attributeGroup ref="..."` inside the
 *   complexType or `namedAttributeGroup` identified by `parentId`.
 */
export interface AddAttributeGroupPayload {
  /**
   * Name of the attribute group. Required when creating a definition.
   * Ignored when creating a reference (use `ref` instead).
   */
  groupName?: string;
  /** Optional documentation. Applies to both definitions and references (xs:annotation). */
  documentation?: string;
  /**
   * Name of the attribute group to reference.
   * When provided, creates `xs:attributeGroup ref="..."` inside `parentId`.
   * Mutually exclusive with `groupName`.
   */
  ref?: string;
  /**
   * ID of the parent complexType or `namedAttributeGroup`.
   * Required when creating a reference. Must be omitted for definitions.
   */
  parentId?: string;
}

/**
 * Command to add an attribute group definition.
 */
export interface AddAttributeGroupCommand extends BaseCommand<AddAttributeGroupPayload> {
  type: "addAttributeGroup";
  payload: AddAttributeGroupPayload;
}

/**
 * Payload for removing an attribute group.
 */
export interface RemoveAttributeGroupPayload {
  /** ID of the attribute group to remove */
  groupId: string;
}

/**
 * Command to remove an attribute group.
 */
export interface RemoveAttributeGroupCommand extends BaseCommand<RemoveAttributeGroupPayload> {
  type: "removeAttributeGroup";
  payload: RemoveAttributeGroupPayload;
}

/**
 * Payload for modifying an attribute group definition or an attribute group reference.
 * The `groupId` field works for both:
 * - `/attributeGroup:Name` — modifies the top-level named attribute group definition.
 * - `/complexType:X/attributeGroupRef:Name[0]` — modifies the attribute group reference.
 */
export interface ModifyAttributeGroupPayload {
  /** ID of the attribute group definition or reference to modify */
  groupId: string;
  /**
   * New name for the attribute group definition (optional).
   * Not applicable for references.
   */
  groupName?: string;
  /**
   * New ref target for an attribute group reference (optional).
   * Only applicable when `groupId` points to a reference.
   */
  ref?: string;
}

/**
 * Command to modify an attribute group.
 */
export interface ModifyAttributeGroupCommand extends BaseCommand<ModifyAttributeGroupPayload> {
  type: "modifyAttributeGroup";
  payload: ModifyAttributeGroupPayload;
}

/** The commands that add, remove and modify an attribute group. */
export type AttributeGroupCommand =
  AddAttributeGroupCommand | RemoveAttributeGroupCommand | ModifyAttributeGroupCommand;
