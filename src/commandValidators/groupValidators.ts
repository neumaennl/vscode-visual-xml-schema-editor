/**
 * Validators for group commands (Group and AttributeGroup).
 */

import {
  schema,
  AddGroupCommand,
  RemoveGroupCommand,
  ModifyGroupCommand,
  groupRef,
} from "../../shared/types.js";
import {
  ValidationResult,
  isValidXmlName,
  validateOccurrences,
} from "./validationUtils.js";
import { toArray } from "../../shared/schemaUtils.js";
import { parseSchemaId, SchemaNodeType } from "../../shared/idStrategy.js";
import { locateNodeById } from "../schemaNavigator.js";

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
 * Structural type for a compositor (sequence, choice or all) that can contain group
 * references, nested compositors and local elements whose inline `complexType` may
 * also reference named groups. Matches `explicitGroup`, `simpleExplicitGroup` and `all`.
 */
type CompositorLike = {
  group?: groupRef[];
  element?: Array<{ complexType?: ComplexTypeParticleHolder }>;
  choice?: CompositorLike[];
  sequence?: CompositorLike[];
};

/**
 * Structural type for objects whose content model is a sequence, choice or all:
 * complexTypes, complexContent extensions and restrictions, and named groups.
 */
type ContentModelHolder = {
  sequence?: CompositorLike;
  choice?: CompositorLike;
  all?: CompositorLike;
};

/**
 * Structural type for objects that directly hold a group ref or compositors.
 * Matches `topLevelComplexType` and `localComplexType`, whose complexContent
 * extension or restriction can hold the same.
 */
type ComplexTypeParticleHolder = ContentModelHolder & {
  group?: groupRef;
  complexContent?: {
    extension?: ContentModelHolder & { group?: groupRef };
    restriction?: ContentModelHolder & { group?: groupRef };
  };
};

/**
 * Returns true if the named group is referenced in a compositor: directly, in a nested
 * compositor, or in the inline complexType of a local element at any depth.
 *
 * @param name - The name of the group
 * @param compositor - The compositor to search
 * @returns Whether a reference was found
 */
function groupRefExistsInCompositor(name: string, compositor: CompositorLike): boolean {
  if (toArray(compositor.group).some((ref) => ref.ref === name)) return true;
  if (
    toArray(compositor.element).some(
      (el) => el?.complexType !== undefined && groupRefExistsInHolder(name, el.complexType)
    )
  ) {
    return true;
  }
  return [...toArray(compositor.choice), ...toArray(compositor.sequence)].some((sub) =>
    groupRefExistsInCompositor(name, sub)
  );
}

/**
 * Returns true if the named group is referenced in the sequence, choice or all of a
 * content model.
 *
 * @param name - The name of the group
 * @param holder - The object whose content model is searched
 * @returns Whether a reference was found
 */
function groupRefExistsInContentModel(name: string, holder: ContentModelHolder): boolean {
  return [holder.sequence, holder.choice, holder.all].some(
    (compositor) => compositor !== undefined && groupRefExistsInCompositor(name, compositor)
  );
}

/**
 * Returns true if the named group is referenced by a complexType: directly, in its
 * content model, or in the same places of its complexContent extension or restriction.
 *
 * @param name - The name of the group
 * @param holder - The complexType to search
 * @returns Whether a reference was found
 */
function groupRefExistsInHolder(name: string, holder: ComplexTypeParticleHolder): boolean {
  const { extension, restriction } = holder.complexContent ?? {};
  return [holder, extension, restriction].some(
    (part) => part !== undefined && (part.group?.ref === name || groupRefExistsInContentModel(name, part))
  );
}

/**
 * Returns true if any schema construct references the named group.
 *
 * Checks:
 * - Top-level complexType definitions (direct, in their content model or via complexContent)
 * - Inline complexTypes on top-level element definitions
 * - Other top-level group definitions (groups can reference groups)
 *
 * Inline complexTypes of local elements are searched at any depth.
 *
 * @param name - The name of the group
 * @param schemaObj - The schema to search
 * @returns Whether a reference was found
 */
function isGroupReferenced(name: string, schemaObj: schema): boolean {
  if (toArray(schemaObj.complexType).some((ct) => groupRefExistsInHolder(name, ct))) return true;
  if (
    toArray(schemaObj.element).some(
      (el) => el.complexType !== undefined && groupRefExistsInHolder(name, el.complexType)
    )
  ) {
    return true;
  }
  return toArray(schemaObj.group).some((grp) => groupRefExistsInContentModel(name, grp));
}

/** Structural type for a complexType node that can hold a direct particle. */
type ComplexTypeWithParticles = {
  group?: groupRef;
  sequence?: CompositorLike;
  choice?: CompositorLike;
  all?: CompositorLike;
};

/** Returns true if the parent type is a complexType (top-level or local). */
function isComplexTypeParent(parentType: string): boolean {
  return parentType === "topLevelComplexType" || parentType === "localComplexType";
}

/**
 * Checks whether a groupRef node exists in a sequence or choice compositor parent.
 * Used by both validateRemoveGroup and validateModifyGroup.
 */
function groupRefExistsInSequenceOrChoice(
  compositor: { group?: Array<{ ref?: string }> },
  parsed: { name?: string; position?: number }
): boolean {
  const refs = toArray(compositor.group);
  if (parsed.name !== undefined && parsed.position !== undefined) {
    return refs.some((r, idx) => r.ref === parsed.name && idx === parsed.position);
  }
  if (parsed.name !== undefined) {
    return refs.some(r => r.ref === parsed.name);
  }
  if (parsed.position !== undefined) {
    return parsed.position >= 0 && parsed.position < refs.length;
  }
  return false;
}

/** Returns true if the complexType node already carries one of the four mutually exclusive particles. */
function complexTypeHasParticle(ct: ComplexTypeWithParticles): boolean {
  return ct.group !== undefined || ct.sequence !== undefined || ct.choice !== undefined || ct.all !== undefined;
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
    // Validate minOccurs/maxOccurs when provided
    if (
      command.payload.minOccurs !== undefined ||
      command.payload.maxOccurs !== undefined
    ) {
      const occurrenceResult = validateOccurrences(
        command.payload.minOccurs,
        command.payload.maxOccurs
      );
      if (!occurrenceResult.valid) {
        return occurrenceResult;
      }
    }
    const location = locateNodeById(schemaObj, parentId);
    if (!location.found) {
      return { valid: false, error: `Parent node not found: ${parentId}` };
    }
    // Validate that the parent type supports group refs
    const validGroupRefParents = ["sequence", "choice", "topLevelComplexType", "localComplexType"];
    if (!validGroupRefParents.includes(location.parentType ?? "")) {
      return { valid: false, error: `Cannot add group ref to parent type: ${location.parentType}` };
    }
    // When adding a group ref directly onto a complexType, reject if a particle is already set
    if (isComplexTypeParent(location.parentType ?? "") && complexTypeHasParticle(location.parent as ComplexTypeWithParticles)) {
      return {
        valid: false,
        error: `Cannot add a group reference to complexType '${parentId}': it already has a particle (group, sequence, choice, or all)`,
      };
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

  if (parsed.nodeType === SchemaNodeType.Group && parsed.parentId) {
    const location = locateNodeById(schemaObj, command.payload.groupId);
    if (!location.found) {
      return { valid: false, error: `Group not found: ${command.payload.groupId}` };
    }
    return { valid: true };
  }

  if (parsed.nodeType === SchemaNodeType.GroupRef) {
    // Reference mode: validate the parent exists
    if (!parsed.parentId) {
      return { valid: false, error: `Invalid groupRef ID: ${command.payload.groupId}` };
    }
    const location = locateNodeById(schemaObj, parsed.parentId);
    if (!location.found) {
      return { valid: false, error: `Parent node not found: ${parsed.parentId}` };
    }
    // For complexType parents, verify the group ref exists and has the right name
    if (isComplexTypeParent(location.parentType ?? "")) {
      const ct = location.parent as ComplexTypeWithParticles;
      if (!ct.group) {
        return { valid: false, error: `GroupRef not found: ${command.payload.groupId}` };
      }
      if (parsed.name !== undefined && ct.group.ref !== parsed.name) {
        return {
          valid: false,
          error: `GroupRef name mismatch: expected '${parsed.name}' but found '${ct.group.ref}'`,
        };
      }
    }
    // For sequence/choice parents, check the group ref exists
    if (location.parentType === "sequence" || location.parentType === "choice") {
      const compositor = location.parent as { group?: Array<{ ref?: string }> };
      if (!groupRefExistsInSequenceOrChoice(compositor, parsed)) {
        return { valid: false, error: `GroupRef not found: ${command.payload.groupId}` };
      }
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

  if (parsed.nodeType === SchemaNodeType.Group && parsed.parentId) {
    if (
      command.payload.groupName !== undefined ||
      command.payload.contentModel !== undefined ||
      command.payload.ref !== undefined
    ) {
      return {
        valid: false,
        error: "Compositor groups only support minOccurs, maxOccurs, or documentation updates",
      };
    }
    const location = locateNodeById(schemaObj, command.payload.groupId);
    if (!location.found) {
      return { valid: false, error: `Group not found: ${command.payload.groupId}` };
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

  if (parsed.nodeType === SchemaNodeType.GroupRef) {
    // Reference mode: validate the parent exists; validate new ref if provided
    // Reject definition-mode-only fields (documentation IS allowed on group refs via annotation)
    if (
      command.payload.groupName !== undefined ||
      command.payload.contentModel !== undefined
    ) {
      return {
        valid: false,
        error: "Cannot use groupName or contentModel when modifying a group reference — use ref, minOccurs, maxOccurs, or documentation instead",
      };
    }
    if (!parsed.parentId) {
      return { valid: false, error: `Invalid groupRef ID: ${command.payload.groupId}` };
    }
    const location = locateNodeById(schemaObj, parsed.parentId);
    if (!location.found) {
      return { valid: false, error: `Parent node not found: ${parsed.parentId}` };
    }
    // For complexType parents, verify the group ref exists and has the right name
    if (isComplexTypeParent(location.parentType ?? "")) {
      const ct = location.parent as ComplexTypeWithParticles;
      if (!ct.group) {
        return { valid: false, error: `GroupRef not found: ${command.payload.groupId}` };
      }
      if (parsed.name !== undefined && ct.group.ref !== parsed.name) {
        return {
          valid: false,
          error: `GroupRef name mismatch: expected '${parsed.name}' but found '${ct.group.ref}'`,
        };
      }
    }
    // For sequence/choice parents, check the group ref exists
    if (location.parentType === "sequence" || location.parentType === "choice") {
      const compositor = location.parent as { group?: Array<{ ref?: string }> };
      if (!groupRefExistsInSequenceOrChoice(compositor, parsed)) {
        return { valid: false, error: `GroupRef not found: ${command.payload.groupId}` };
      }
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
  if (command.payload.groupName !== undefined && !isValidXmlName(command.payload.groupName)) {
    return { valid: false, error: "Group name must be a valid XML name" };
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
