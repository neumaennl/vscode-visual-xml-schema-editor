/**
 * Validators for group commands (Group and AttributeGroup).
 */

import type {
  schema,
  AddGroupCommand,
  RemoveGroupCommand,
  ModifyGroupCommand,
  groupRef,
} from "../../shared/types.js";
import type {
  ValidationFailure,
  ValidationResult,
} from "./validationUtils.js";
import {
  isValidXmlName,
  validateOccurrences,
} from "./validationUtils.js";
import { parseSchemaId, SchemaNodeType } from "../../shared/idStrategy.js";
import { locateNodeById } from "../schemaNavigator.js";
import { parseRequiredId, validateDefinitionExists, validateDefinitionRemoval, validateReference } from "./commonValidators.js";
import type { SearchedCompositor } from "./referenceSearch.js";
import { isReferencedInContent } from "./referenceSearch.js";

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
 * Returns true if any schema construct references the named group: a complexType or the extension or
 * restriction of its content, or a compositor, at any depth (see {@link isReferencedInContent}).
 *
 * @param name - The name of the group
 * @param schemaObj - The schema to search
 * @returns Whether a reference was found
 */
function isGroupReferenced(name: string, schemaObj: schema): boolean {
  return isReferencedInContent(schemaObj, {
    inContent: (content) => content.group?.ref === name,
    inCompositor: (compositor) => (compositor.group ?? []).some((ref) => ref.ref === name),
  });
}

/**
 * Validates the reference to a group definition.
 *
 * @param ref - The value of `ref`
 * @param schemaObj - The schema
 * @returns The validation result
 */
function validateGroupReference(ref: string, schemaObj: schema): ValidationResult {
  return validateReference(ref, schemaObj.group, "Group", `Referenced group does not exist: ${ref}`);
}

/** Structural type for a complexType node that can hold a direct particle. */
interface ComplexTypeWithParticles {
  group?: groupRef;
  sequence?: SearchedCompositor;
  choice?: SearchedCompositor;
  all?: SearchedCompositor;
}

/**
 * Returns true if the parent type is a complexType (top-level or local).
 *
 * @param parentType - The kind of the parent, as the navigator reports it
 * @returns True for a complexType
 */
function isComplexTypeParent(parentType: string): boolean {
  return parentType === "topLevelComplexType" || parentType === "localComplexType";
}

/**
 * Validates that the group reference that a groupRef ID identifies exists. The webview identifies a
 * group reference by its ref and its position among the group references of its parent
 * (`…/groupRef:Name[N]`); used by both validateRemoveGroup and validateModifyGroup.
 *
 * @param groupId - The groupRef ID
 * @param schemaObj - The schema
 * @returns The validation result
 */
function validateGroupRefExists(groupId: string, schemaObj: schema): ValidationResult {
  const parsed = parseSchemaId(groupId);
  if (!parsed.parentId || parsed.name === undefined || parsed.position === undefined) {
    return { valid: false, error: `Invalid groupRef ID: ${groupId}` };
  }
  const location = locateNodeById(schemaObj, parsed.parentId);
  if (!location.found) {
    return { valid: false, error: `Parent node not found: ${parsed.parentId}` };
  }
  // A complexType holds at most one group reference
  if (isComplexTypeParent(location.parentType)) {
    const ct = location.parent as ComplexTypeWithParticles;
    if (!ct.group) {
      return { valid: false, error: `GroupRef not found: ${groupId}` };
    }
    if (ct.group.ref !== parsed.name) {
      return { valid: false, error: `GroupRef name mismatch: expected '${parsed.name}' but found '${ct.group.ref}'` };
    }
  }
  if (location.parentType === "sequence" || location.parentType === "choice") {
    const refs = (location.parent as { group?: Array<{ ref?: string }> }).group ?? [];
    if (!refs.some((r, index) => r.ref === parsed.name && index === parsed.position)) {
      return { valid: false, error: `GroupRef not found: ${groupId}` };
    }
  }
  return { valid: true };
}

/**
 * Returns true if the complexType node already carries one of the four mutually exclusive particles.
 *
 * @param ct - The complexType
 * @returns True if it has a group reference, sequence, choice or all
 */
function complexTypeHasParticle(ct: ComplexTypeWithParticles): boolean {
  return ct.group !== undefined || ct.sequence !== undefined || ct.choice !== undefined || ct.all !== undefined;
}

// ===== Group Command Validation =====

/**
 * Validates an addGroup command. A group reference needs a parent that can hold it (a sequence,
 * choice, or complexType without a particle), refers to a named group and has consistent occurrences.
 * A group definition has a new valid name and a valid content model, and no parent or occurrences.
 *
 * @param command - The command
 * @param schemaObj - The schema
 * @returns The validation result
 */
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
    const referenceResult = validateGroupReference(command.payload.ref, schemaObj);
    if (!referenceResult.valid) {
      return referenceResult;
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
    if (!validGroupRefParents.includes(location.parentType)) {
      return { valid: false, error: `Cannot add group ref to parent type: ${location.parentType}` };
    }
    // When adding a group ref directly onto a complexType, reject if a particle is already set
    if (isComplexTypeParent(location.parentType) && complexTypeHasParticle(location.parent as ComplexTypeWithParticles)) {
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
  const { groupName } = command.payload;
  if (groupName === undefined || !isValidXmlName(groupName)) {
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
  const exists = (schemaObj.group ?? []).some(
    (g) => g.name === groupName
  );
  if (exists) {
    return {
      valid: false,
      error: `Group name already exists: ${groupName}`,
    };
  }
  return { valid: true };
}

/**
 * What a group ID identifies: a compositor (`…/group:sequence[N]`) with the ID of its parent, a group
 * reference, or a group definition with its name.
 */
type GroupTarget =
  | { target: "compositor"; compositorParentId: string }
  | { target: "reference" }
  | { target: "definition"; name: string | undefined };

/**
 * Validates that the group that a group ID identifies exists. Used by both validateRemoveGroup and
 * validateModifyGroup.
 *
 * @param groupId - The ID of a compositor, a group reference or a group definition
 * @param schemaObj - The schema
 * @returns What the ID identifies, or the validation failure
 */
function locateGroup(
  groupId: string,
  schemaObj: schema
): ValidationFailure | ({ valid: true } & GroupTarget) {
  const parsedId = parseRequiredId(groupId, "Group");
  if (!parsedId.valid) {
    return parsedId;
  }
  const parsed = parsedId.parsed;

  if (parsed.nodeType === SchemaNodeType.Group && parsed.parentId) {
    if (!locateNodeById(schemaObj, groupId).found) {
      return { valid: false, error: `Group not found: ${groupId}` };
    }
    return { valid: true, target: "compositor", compositorParentId: parsed.parentId };
  }
  if (parsed.nodeType === SchemaNodeType.GroupRef) {
    const refResult = validateGroupRefExists(groupId, schemaObj);
    return refResult.valid ? { valid: true, target: "reference" } : refResult;
  }
  const definitionResult = validateDefinitionExists(schemaObj.group, parsed.name, `Group not found: ${groupId}`);
  return definitionResult.valid ? { valid: true, target: "definition", name: parsed.name } : definitionResult;
}

/**
 * Validates a removeGroup command: the group definition, reference or compositor must exist, and a
 * definition must not be referenced any more.
 *
 * @param command - The command
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateRemoveGroup(
  command: RemoveGroupCommand,
  schemaObj: schema
): ValidationResult {
  return validateDefinitionRemoval(locateGroup(command.payload.groupId, schemaObj), "Group", (name) =>
    isGroupReferenced(name, schemaObj)
  );
}

/**
 * Validates the changes of a modifyGroup command to a compositor.
 *
 * @param payload - The payload of the command
 * @param compositorParentId - The ID of the parent of the compositor
 * @returns The validation result
 */
function validateCompositorChange(payload: ModifyGroupCommand["payload"], compositorParentId: string): ValidationResult {
  if (payload.groupName !== undefined || payload.contentModel !== undefined || payload.ref !== undefined) {
    return {
      valid: false,
      error: "Compositor groups only support minOccurs, maxOccurs, or documentation updates",
    };
  }
  // XML Schema allows no occurrences on the compositor of a group definition
  const parentOfCompositor = parseSchemaId(compositorParentId);
  if (
    (payload.minOccurs !== undefined || payload.maxOccurs !== undefined) &&
    parentOfCompositor.nodeType === SchemaNodeType.Group &&
    !parentOfCompositor.parentId
  ) {
    return {
      valid: false,
      error: "The compositor of a group definition cannot have minOccurs or maxOccurs",
    };
  }
  return validateOccurrences(payload.minOccurs, payload.maxOccurs);
}

/**
 * Validates the changes of a modifyGroup command to a group reference. Documentation is allowed on
 * group references, through their annotation.
 *
 * @param payload - The payload of the command
 * @param schemaObj - The schema
 * @returns The validation result
 */
function validateReferenceChange(payload: ModifyGroupCommand["payload"], schemaObj: schema): ValidationResult {
  if (payload.groupName !== undefined || payload.contentModel !== undefined) {
    return {
      valid: false,
      error: "Cannot use groupName or contentModel when modifying a group reference — use ref, minOccurs, maxOccurs, or documentation instead",
    };
  }
  if (payload.ref !== undefined) {
    const referenceResult = validateGroupReference(payload.ref, schemaObj);
    if (!referenceResult.valid) {
      return referenceResult;
    }
  }
  return validateOccurrences(payload.minOccurs, payload.maxOccurs);
}

/**
 * Validates the changes of a modifyGroup command to a group definition.
 *
 * @param payload - The payload of the command
 * @returns The validation result
 */
function validateDefinitionChange(payload: ModifyGroupCommand["payload"]): ValidationResult {
  if (payload.ref !== undefined || payload.minOccurs !== undefined || payload.maxOccurs !== undefined) {
    return {
      valid: false,
      error: "Cannot use ref, minOccurs, or maxOccurs when modifying a group definition — use groupName, contentModel, or documentation instead",
    };
  }
  if (payload.groupName !== undefined && !isValidXmlName(payload.groupName)) {
    return { valid: false, error: "Group name must be a valid XML name" };
  }
  if (payload.contentModel !== undefined && !VALID_GROUP_CONTENT_MODELS.includes(payload.contentModel)) {
    return {
      valid: false,
      error: `Content model must be one of: ${VALID_GROUP_CONTENT_MODELS.join(", ")}`,
    };
  }
  return { valid: true };
}

/**
 * Validates a modifyGroup command: what the ID identifies must exist, and the changes must fit it, a
 * compositor, a group reference or a group definition.
 *
 * @param command - The command
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateModifyGroup(
  command: ModifyGroupCommand,
  schemaObj: schema
): ValidationResult {
  const located = locateGroup(command.payload.groupId, schemaObj);
  if (!located.valid) {
    return located;
  }
  switch (located.target) {
    case "compositor":
      return validateCompositorChange(command.payload, located.compositorParentId);
    case "reference":
      return validateReferenceChange(command.payload, schemaObj);
    case "definition":
      return validateDefinitionChange(command.payload);
  }
}
