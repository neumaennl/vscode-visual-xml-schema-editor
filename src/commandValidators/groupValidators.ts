/**
 * Validators for group commands (Group and AttributeGroup).
 */

import {
  schema,
  AddGroupCommand,
  RemoveGroupCommand,
  ModifyGroupCommand,
  AddGroupRefCommand,
  RemoveGroupRefCommand,
  ModifyGroupRefCommand,
  AddAttributeGroupCommand,
  RemoveAttributeGroupCommand,
  ModifyAttributeGroupCommand,
  groupRef,
} from "../../shared/types";
import {
  ValidationResult,
  isValidXmlName,
} from "./validationUtils";
import { toArray } from "../../shared/schemaUtils";
import { parseSchemaId } from "../../shared/idStrategy";

/**
 * Valid content models for Group elements.
 * Groups can only use structure models (sequence, choice, all).
 */
export const VALID_GROUP_CONTENT_MODELS = [
  "sequence",
  "choice",
  "all",
] as const;

// ===== Group Reference Helpers =====

/**
 * Structural type for objects that can contain group references within
 * compositors. Matches both `explicitGroup` and `simpleExplicitGroup`.
 */
type CompositorLike = {
  group?: groupRef[];
  choice?: CompositorLike[];
  sequence?: CompositorLike[];
};

/**
 * Structural type for objects that directly hold a group ref or compositors.
 * Matches `topLevelComplexType`, `localComplexType`, `extensionType`,
 * and `complexRestrictionType`.
 */
type ComplexTypeParticleHolder = {
  group?: groupRef;
  sequence?: CompositorLike;
  choice?: CompositorLike;
  complexContent?: {
    extension?: { group?: groupRef; sequence?: CompositorLike; choice?: CompositorLike };
    restriction?: { group?: groupRef; sequence?: CompositorLike; choice?: CompositorLike };
  };
};

/**
 * Returns true if the named group is referenced inside a compositor
 * (sequence or choice) or any of its recursively nested compositors.
 *
 * @param name - Group name to look for
 * @param compositor - The compositor to search in
 */
function groupRefExistsInCompositor(
  name: string,
  compositor: CompositorLike
): boolean {
  if (toArray(compositor.group).some((ref) => ref.ref === name)) return true;
  for (const sub of toArray(compositor.choice)) {
    if (groupRefExistsInCompositor(name, sub)) return true;
  }
  for (const sub of toArray(compositor.sequence)) {
    if (groupRefExistsInCompositor(name, sub)) return true;
  }
  return false;
}

/**
 * Returns true if the named group is referenced directly or inside the
 * compositors/complexContent of a complex-type particle holder.
 *
 * @param name - Group name to look for
 * @param holder - The complex type particle holder to search in
 */
function groupRefExistsInHolder(
  name: string,
  holder: ComplexTypeParticleHolder
): boolean {
  if (holder.group?.ref === name) return true;
  if (holder.sequence && groupRefExistsInCompositor(name, holder.sequence)) return true;
  if (holder.choice && groupRefExistsInCompositor(name, holder.choice)) return true;
  const ext = holder.complexContent?.extension;
  if (ext) {
    if (ext.group?.ref === name) return true;
    if (ext.sequence && groupRefExistsInCompositor(name, ext.sequence)) return true;
    if (ext.choice && groupRefExistsInCompositor(name, ext.choice)) return true;
  }
  const restr = holder.complexContent?.restriction;
  if (restr) {
    if (restr.group?.ref === name) return true;
    if (restr.sequence && groupRefExistsInCompositor(name, restr.sequence)) return true;
    if (restr.choice && groupRefExistsInCompositor(name, restr.choice)) return true;
  }
  return false;
}

/**
 * Returns true if any schema construct references the named group.
 *
 * Checks:
 * - Top-level complexType definitions (direct or via complexContent)
 * - Inline complexTypes on top-level element definitions
 * - Other top-level group definitions (groups can reference groups)
 *
 * @param name - The group name to check references for
 * @param schemaObj - The schema to search in
 */
function isGroupReferenced(name: string, schemaObj: schema): boolean {
  for (const ct of toArray(schemaObj.complexType)) {
    if (groupRefExistsInHolder(name, ct)) return true;
  }
  for (const el of toArray(schemaObj.element)) {
    if (el.complexType && groupRefExistsInHolder(name, el.complexType)) return true;
  }
  for (const grp of toArray(schemaObj.group)) {
    // namedGroup.sequence/choice are simpleExplicitGroup, which match CompositorLike
    if (grp.sequence && groupRefExistsInCompositor(name, grp.sequence)) return true;
    if (grp.choice && groupRefExistsInCompositor(name, grp.choice)) return true;
  }
  return false;
}

// ===== Group Command Validation =====

export function validateAddGroup(
  command: AddGroupCommand,
  schemaObj: schema
): ValidationResult {
  // Validate group name is a valid XML name
  if (!isValidXmlName(command.payload.groupName)) {
    return { valid: false, error: "Group name must be a valid XML name" };
  }
  if (!command.payload.contentModel) {
    return { valid: false, error: "Content model is required" };
  }
  // Validate content model
  if (!VALID_GROUP_CONTENT_MODELS.includes(command.payload.contentModel)) {
    return {
      valid: false,
      error: `Content model must be one of: ${VALID_GROUP_CONTENT_MODELS.join(", ")}`,
    };
  }
  // Check if group name already exists
  const exists = toArray(schemaObj.group).some(
    (g) => g.name === command.payload.groupName
  );
  if (exists) {
    return {
      valid: false,
      error: `Group name already exists: ${command.payload.groupName}`,
    };
  }
  return { valid: true };
}

export function validateRemoveGroup(
  command: RemoveGroupCommand,
  schemaObj: schema
): ValidationResult {
  if (!command.payload.groupId.trim()) {
    return { valid: false, error: "Group ID cannot be empty" };
  }
  const parsed = parseSchemaId(command.payload.groupId);
  const found = toArray(schemaObj.group).some((g) => g.name === parsed.name);
  if (!found) {
    return {
      valid: false,
      error: `Group not found: ${command.payload.groupId}`,
    };
  }
  if (parsed.name && isGroupReferenced(parsed.name, schemaObj)) {
    return {
      valid: false,
      error: `Group is still referenced and cannot be removed: ${parsed.name}`,
    };
  }
  return { valid: true };
}

export function validateModifyGroup(
  command: ModifyGroupCommand,
  schemaObj: schema
): ValidationResult {
  if (!command.payload.groupId.trim()) {
    return { valid: false, error: "Group ID cannot be empty" };
  }
  const parsed = parseSchemaId(command.payload.groupId);
  const found = toArray(schemaObj.group).some((g) => g.name === parsed.name);
  if (!found) {
    return {
      valid: false,
      error: `Group not found: ${command.payload.groupId}`,
    };
  }
  if (
    command.payload.contentModel !== undefined &&
    !VALID_GROUP_CONTENT_MODELS.includes(command.payload.contentModel)
  ) {
    return {
      valid: false,
      error: `Content model must be one of: ${VALID_GROUP_CONTENT_MODELS.join(", ")}`,
    };
  }
  return { valid: true };
}

// ===== Group Reference Command Validation =====

export function validateAddGroupRef(
  command: AddGroupRefCommand,
  schemaObj: schema
): ValidationResult {
  if (!command.payload.parentId.trim()) {
    return { valid: false, error: "Parent ID cannot be empty" };
  }
  if (!isValidXmlName(command.payload.ref)) {
    return { valid: false, error: "Group ref must be a valid XML name" };
  }
  // Validate that the referenced group exists in the schema
  const groupExists = toArray(schemaObj.group).some(
    (g) => g.name === command.payload.ref
  );
  if (!groupExists) {
    return {
      valid: false,
      error: `Referenced group does not exist: ${command.payload.ref}`,
    };
  }
  return { valid: true };
}

export function validateRemoveGroupRef(
  command: RemoveGroupRefCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.groupRefId.trim()) {
    return { valid: false, error: "GroupRef ID cannot be empty" };
  }
  return { valid: true };
}

export function validateModifyGroupRef(
  command: ModifyGroupRefCommand,
  schemaObj: schema
): ValidationResult {
  if (!command.payload.groupRefId.trim()) {
    return { valid: false, error: "GroupRef ID cannot be empty" };
  }
  if (command.payload.ref !== undefined) {
    if (!isValidXmlName(command.payload.ref)) {
      return { valid: false, error: "Group ref must be a valid XML name" };
    }
    // Validate that the new referenced group exists
    const groupExists = toArray(schemaObj.group).some(
      (g) => g.name === command.payload.ref
    );
    if (!groupExists) {
      return {
        valid: false,
        error: `Referenced group does not exist: ${command.payload.ref}`,
      };
    }
  }
  return { valid: true };
}

// ===== AttributeGroup Command Validation =====

export function validateAddAttributeGroup(
  command: AddAttributeGroupCommand,
  _schemaObj: schema
): ValidationResult {
  // Validate group name is a valid XML name
  if (!isValidXmlName(command.payload.groupName)) {
    return {
      valid: false,
      error: "Attribute group name must be a valid XML name",
    };
  }
  // TODO Phase 2: Check if attribute group name already exists
  return { valid: true };
}

export function validateRemoveAttributeGroup(
  command: RemoveAttributeGroupCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.groupId.trim()) {
    return { valid: false, error: "Attribute group ID cannot be empty" };
  }
  // TODO Phase 2: Validate that groupId exists in schema
  // TODO Phase 2: Check if attribute group is being referenced
  return { valid: true };
}

export function validateModifyAttributeGroup(
  command: ModifyAttributeGroupCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.groupId.trim()) {
    return { valid: false, error: "Attribute group ID cannot be empty" };
  }
  // TODO Phase 2: Validate that groupId exists in schema
  return { valid: true };
}
