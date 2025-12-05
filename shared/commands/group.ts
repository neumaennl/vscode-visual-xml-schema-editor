/**
 * Group command types for managing element groups and attribute groups.
 * Provides commands for organizing schema elements into reusable groups.
 */

import { BaseCommand } from "./base";
import { ContentModel } from "./schemaTypes";

/**
 * Payload for adding a group definition.
 */
export interface AddGroupPayload {
  /** Name of the group */
  groupName: string;
  /** Content model for the group */
  contentModel: ContentModel;
  /** Optional documentation */
  documentation?: string;
}

/**
 * Command to add a group definition.
 */
export interface AddGroupCommand extends BaseCommand<AddGroupPayload> {
  type: "addGroup";
  payload: AddGroupPayload;
}

/**
 * Payload for removing a group.
 */
export interface RemoveGroupPayload {
  /** ID of the group to remove */
  groupId: string;
}

/**
 * Command to remove a group.
 */
export interface RemoveGroupCommand extends BaseCommand<RemoveGroupPayload> {
  type: "removeGroup";
  payload: RemoveGroupPayload;
}

/**
 * Payload for modifying a group.
 */
export interface ModifyGroupPayload {
  /** ID of the group to modify */
  groupId: string;
  /** New name for the group (optional) */
  groupName?: string;
  /** New content model (optional) */
  contentModel?: ContentModel;
  /** New documentation (optional) */
  documentation?: string;
}

/**
 * Command to modify a group.
 */
export interface ModifyGroupCommand extends BaseCommand<ModifyGroupPayload> {
  type: "modifyGroup";
  payload: ModifyGroupPayload;
}

/**
 * Payload for adding an attribute group definition.
 */
export interface AddAttributeGroupPayload {
  /** Name of the attribute group */
  groupName: string;
  /** Optional documentation */
  documentation?: string;
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
 * Payload for modifying an attribute group.
 */
export interface ModifyAttributeGroupPayload {
  /** ID of the attribute group to modify */
  groupId: string;
  /** New name for the group (optional) */
  groupName?: string;
  /** New documentation (optional) */
  documentation?: string;
}

/**
 * Command to modify an attribute group.
 */
export interface ModifyAttributeGroupCommand extends BaseCommand<ModifyAttributeGroupPayload> {
  type: "modifyAttributeGroup";
  payload: ModifyAttributeGroupPayload;
}
