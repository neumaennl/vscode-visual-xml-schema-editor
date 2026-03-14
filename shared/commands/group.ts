/**
 * Group command types for managing element groups and attribute groups.
 * Provides commands for organizing schema elements into reusable groups.
 */

import { BaseCommand } from "./base";
import { ContentModel } from "./schemaTypes";

/**
 * Payload for adding a group definition or a group reference.
 *
 * Two modes, mutually exclusive:
 * - **Definition** (`groupName` + `contentModel`): creates a top-level `xs:group name="..."`.
 *   Always created at the schema root; `parentId` must not be provided in this mode.
 * - **Reference** (`ref` + `parentId`): creates `xs:group ref="..."` inside the compositor
 *   or complexType identified by `parentId`.
 */
export interface AddGroupPayload {
  /**
   * Name of the group. Required when creating a definition.
   * Ignored when creating a reference (use `ref` instead).
   */
  groupName?: string;
  /**
   * Content model for the group. Required when creating a definition.
   * Ignored when creating a reference.
   */
  contentModel?: ContentModel;
  /** Optional documentation. Applies to both group definitions and group references (xs:annotation). */
  documentation?: string;
  /**
   * Name of the group to reference.
   * When provided, creates `xs:group ref="..."` inside `parentId`.
   * Mutually exclusive with `groupName`/`contentModel`.
   */
  ref?: string;
  /**
   * ID of the parent compositor (sequence/choice) or complexType.
   * Required when creating a group reference. Must be omitted for definitions.
   */
  parentId?: string;
  /** Minimum occurrences. Only applicable for group references. */
  minOccurs?: number;
  /** Maximum occurrences. Only applicable for group references. */
  maxOccurs?: number | "unbounded";
}

/**
 * Command to add a group definition or a group reference.
 */
export interface AddGroupCommand extends BaseCommand<AddGroupPayload> {
  type: "addGroup";
  payload: AddGroupPayload;
}

/**
 * Payload for removing a group definition or a group reference.
 * The `groupId` field works for both:
 * - `/group:PersonGroup` — removes the top-level named group definition.
 * - `/complexType:X/sequence[0]/groupRef:PersonGroup[0]` — removes the group reference.
 */
export interface RemoveGroupPayload {
  /** ID of the group definition or group reference to remove */
  groupId: string;
}

/**
 * Command to remove a group definition or a group reference.
 */
export interface RemoveGroupCommand extends BaseCommand<RemoveGroupPayload> {
  type: "removeGroup";
  payload: RemoveGroupPayload;
}

/**
 * Payload for modifying a group definition or a group reference.
 * The `groupId` field works for both:
 * - `/group:PersonGroup` — modifies the top-level named group definition.
 * - `/complexType:X/sequence[0]/groupRef:PersonGroup[0]` — modifies the group reference.
 */
export interface ModifyGroupPayload {
  /** ID of the group definition or group reference to modify */
  groupId: string;
  /** New name for the group definition (optional). Not applicable for references. */
  groupName?: string;
  /** New content model (optional). Not applicable for references. */
  contentModel?: ContentModel;
  /** New documentation (optional). Applies to both group definitions and group references (xs:annotation). */
  documentation?: string;
  /**
   * New ref target for a group reference (optional).
   * Only applicable when `groupId` points to a group reference.
   */
  ref?: string;
  /** New minimum occurrences (optional). Only applicable for group references. */
  minOccurs?: number;
  /** New maximum occurrences (optional). Only applicable for group references. */
  maxOccurs?: number | "unbounded";
}

/**
 * Command to modify a group definition or a group reference.
 */
export interface ModifyGroupCommand extends BaseCommand<ModifyGroupPayload> {
  type: "modifyGroup";
  payload: ModifyGroupPayload;
}

/**
 * Payload for adding an attribute group definition or an attribute group reference.
 *
 * Two modes, mutually exclusive:
 * - **Definition** (`groupName`): creates a top-level `xs:attributeGroup name="..."`.
 *   Always created at the schema root; `parentId` must not be provided in this mode.
 * - **Reference** (`ref` + `parentId`): creates `xs:attributeGroup ref="..."` inside the
 *   complexType or namedAttributeGroup identified by `parentId`.
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
   * ID of the parent complexType or namedAttributeGroup.
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
  /** New documentation (optional). Applies to both definitions and references. */
  documentation?: string;
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
