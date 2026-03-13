/**
 * Validators for group commands (Group and AttributeGroup).
 */

import {
  schema,
  AddGroupCommand,
  RemoveGroupCommand,
  ModifyGroupCommand,
  AddAttributeGroupCommand,
  RemoveAttributeGroupCommand,
  ModifyAttributeGroupCommand,
  groupRef,
} from "../../shared/types";
import {
  ValidationResult,
  isValidXmlName,
  validateOccurrences,
} from "./validationUtils";
import { toArray } from "../../shared/schemaUtils";
import { parseSchemaId, SchemaNodeType } from "../../shared/idStrategy";
import { locateNodeById } from "../schemaNavigator";

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
 * Deep variant of groupRefExistsInCompositor that also inspects
 * complexTypes nested under local elements within the compositor.
 */
function groupRefExistsInCompositorDeep(
  name: string,
  compositor: any
): boolean {
  // Preserve existing behavior for direct group / nested compositor refs.
  if (groupRefExistsInCompositor(name, compositor)) return true;

  // Additionally, walk local elements and inspect their inline complexTypes.
  const elements = toArray(compositor?.element);
  for (const el of elements) {
    if (el?.complexType && groupRefExistsInHolderDeep(name, el.complexType)) {
      return true;
    }
  }

  return false;
}

/**
 * Deep variant of groupRefExistsInHolder that also traverses compositor
 * trees to inspect complexTypes nested under local elements.
 */
function groupRefExistsInHolderDeep(
  name: string,
  holder: ComplexTypeParticleHolder
): boolean {
  // First, run the existing checks.
  if (groupRefExistsInHolder(name, holder)) return true;

  // Then, drill into compositor structures to find nested local elements.
  if (holder.sequence && groupRefExistsInCompositorDeep(name, holder.sequence)) {
    return true;
  }
  if (holder.choice && groupRefExistsInCompositorDeep(name, holder.choice)) {
    return true;
  }

  const ext = holder.complexContent?.extension;
  if (ext) {
    if (ext.sequence && groupRefExistsInCompositorDeep(name, ext.sequence)) {
      return true;
    }
    if (ext.choice && groupRefExistsInCompositorDeep(name, ext.choice)) {
      return true;
    }
  }

  const restr = holder.complexContent?.restriction;
  if (restr) {
    if (restr.sequence && groupRefExistsInCompositorDeep(name, restr.sequence)) {
      return true;
    }
    if (restr.choice && groupRefExistsInCompositorDeep(name, restr.choice)) {
      return true;
    }
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
 */
function isGroupReferenced(name: string, schemaObj: schema): boolean {
  // Top-level complexType definitions.
  for (const ct of toArray(schemaObj.complexType)) {
    if (groupRefExistsInHolderDeep(name, ct)) return true;
  }

  // Inline complexTypes on top-level element definitions.
  for (const el of toArray(schemaObj.element)) {
    if (el.complexType && groupRefExistsInHolderDeep(name, el.complexType)) {
      return true;
    }
  }

  // Other top-level group definitions (groups can reference groups),
  // including nested local elements inside their particles.
  for (const grp of toArray(schemaObj.group)) {
    if (grp.sequence && groupRefExistsInCompositorDeep(name, grp.sequence)) {
      return true;
    }
    if (grp.choice && groupRefExistsInCompositorDeep(name, grp.choice)) {
      return true;
    }
  }

  return false;
}

// ===== Group Command Validation =====

export function validateAddGroup(
  command: AddGroupCommand,
  schemaObj: schema
): ValidationResult {
  if (command.payload.ref !== undefined) {
    // Reference mode validation — reject definition-mode fields
    if (command.payload.groupName !== undefined || command.payload.contentModel !== undefined) {
      return {
        valid: false,
        error: "Cannot combine ref with groupName or contentModel — use ref for group references, groupName/contentModel for group definitions",
      };
    }
    const parentId = command.payload.parentId;
    if (!parentId?.trim()) {
      return { valid: false, error: "Parent ID is required for group references" };
    }
    if (!isValidXmlName(command.payload.ref)) {
      return { valid: false, error: "Group ref must be a valid XML name" };
    }
    const groupExists = toArray(schemaObj.group).some(
      (g) => g.name === command.payload.ref
    );
    if (!groupExists) {
      return {
        valid: false,
        error: `Referenced group does not exist: ${command.payload.ref}`,
      };
    }
    const location = locateNodeById(schemaObj, parentId);
    if (!location.found) {
      return { valid: false, error: `Parent node not found: ${parentId}` };
    }
    return { valid: true };
  }

  // Definition mode validation — reject reference-mode fields
  if (
    command.payload.parentId !== undefined ||
    command.payload.minOccurs !== undefined ||
    command.payload.maxOccurs !== undefined
  ) {
    return {
      valid: false,
      error: "Cannot combine groupName/contentModel with parentId, minOccurs, or maxOccurs — use ref for group references",
    };
  }
  if (!isValidXmlName(command.payload.groupName ?? "")) {
    return { valid: false, error: "Group name must be a valid XML name" };
  }
  if (!command.payload.contentModel) {
    return { valid: false, error: "Content model is required" };
  }
  if (!VALID_GROUP_CONTENT_MODELS.includes(command.payload.contentModel)) {
    return {
      valid: false,
      error: `Content model must be one of: ${VALID_GROUP_CONTENT_MODELS.join(", ")}`,
    };
  }
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

  if (parsed.nodeType === SchemaNodeType.GroupRef) {
    // Reference mode: validate the parent exists
    if (!parsed.parentId) {
      return { valid: false, error: `Invalid groupRef ID: ${command.payload.groupId}` };
    }
    const location = locateNodeById(schemaObj, parsed.parentId);
    if (!location.found) {
      return { valid: false, error: `Parent node not found: ${parsed.parentId}` };
    }
    return { valid: true };
  }

  // Definition mode: validate the definition exists and is not referenced
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

  if (parsed.nodeType === SchemaNodeType.GroupRef) {
    // Reference mode: validate the parent exists; validate new ref if provided
    // Reject definition-mode fields
    if (
      command.payload.groupName !== undefined ||
      command.payload.contentModel !== undefined ||
      command.payload.documentation !== undefined
    ) {
      return {
        valid: false,
        error: "Cannot use groupName, contentModel, or documentation when modifying a group reference — use ref, minOccurs, or maxOccurs instead",
      };
    }
    if (!parsed.parentId) {
      return { valid: false, error: `Invalid groupRef ID: ${command.payload.groupId}` };
    }
    const location = locateNodeById(schemaObj, parsed.parentId);
    if (!location.found) {
      return { valid: false, error: `Parent node not found: ${parsed.parentId}` };
    }
    if (command.payload.ref !== undefined) {
      if (!isValidXmlName(command.payload.ref)) {
        return { valid: false, error: "Group ref must be a valid XML name" };
      }
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
    if (
      command.payload.minOccurs !== undefined ||
      command.payload.maxOccurs !== undefined
    ) {
      const occurrenceValidation: ValidationResult = validateOccurrences(
        command.payload.minOccurs,
        command.payload.maxOccurs
      );
      if (!occurrenceValidation.valid) {
        return occurrenceValidation;
      }
    }
    return { valid: true };
  }

  // Definition mode: validate the definition exists
  // Reject reference-mode fields
  if (
    command.payload.ref !== undefined ||
    command.payload.minOccurs !== undefined ||
    command.payload.maxOccurs !== undefined
  ) {
    return {
      valid: false,
      error: "Cannot use ref, minOccurs, or maxOccurs when modifying a group definition — use groupName, contentModel, or documentation instead",
    };
  }
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
