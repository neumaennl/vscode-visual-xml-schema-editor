/**
 * Validators for the group commands: group definitions and group references.
 */

import { isValidXmlName } from "../../shared/qNames.js";
import { validateCompositorReplacement } from "./compositorValidators.js";
import type {
  schema,
  AddGroupCommand,
  RemoveGroupCommand,
  ModifyGroupCommand,
  complexType,
  explicitGroup,
} from "../../shared/types.js";
import type { ValidationResult, ValidationResultWith } from "../../shared/validation.js";
import { validateOccurrences } from "../../shared/occurrences.js";
import { isCompositorNodeType, parseSchemaId, SchemaNodeType } from "../../shared/idStrategy.js";
import { locateNodeById } from "../schemaNavigator.js";
import type { ReferenceOrDefinition } from "./commonValidators.js";
import {
  locateReferenceOrDefinition,
  parseRequiredId,
  validateCompositor,
  validateDefinitionRemoval,
  validateReference,
} from "./commonValidators.js";
import { isReferenced } from "../schemaReferences/referenceChecks.js";
import { getHeldCompositor } from "../../shared/schemaObjects.js";

// ===== Group Reference Helpers =====

/**
 * Validates the reference to a group definition.
 *
 * @param ref - The value of `ref`
 * @param schemaObj - The schema
 * @returns The validation result
 */
function validateGroupReference(ref: string, schemaObj: schema): ValidationResult {
  return validateReference(ref, "group", schemaObj, `Referenced group does not exist: ${ref}`);
}

/** The particles of a complexType: a group reference, a sequence, a choice or an all, at most one of them. */
type ComplexTypeWithParticles = Pick<complexType, "group" | "sequence" | "choice" | "all">;

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
 * Validates that the group reference that a `groupRef` ID identifies exists. The webview identifies a
 * group reference by its ref and its position among the group references of its parent
 * (`…/groupRef:Name[N]`); used by both `validateRemoveGroup` and `validateModifyGroup`.
 *
 * @param groupId - The `groupRef` ID
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
    const refs = (location.parent as explicitGroup).group ?? [];
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
 * Validates an `addGroup` command. A group reference needs a parent that can hold it (a sequence,
 * choice, or complexType without a particle), refers to a named group and has consistent occurrences.
 * A group definition has a new valid name and a valid compositor, and no parent or occurrences.
 *
 * @param command - The command
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateAddGroup(command: AddGroupCommand, schemaObj: schema): ValidationResult {
  if (command.payload.ref !== undefined) {
    // Reference mode validation — reject definition-mode fields
    if (command.payload.groupName !== undefined || command.payload.compositor !== undefined) {
      return {
        valid: false,
        error:
          "Cannot combine ref with groupName or compositor — use ref for group references, groupName/compositor for group definitions",
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
    if (command.payload.minOccurs !== undefined || command.payload.maxOccurs !== undefined) {
      const occurrenceResult = validateOccurrences(command.payload.minOccurs, command.payload.maxOccurs);
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
    if (
      isComplexTypeParent(location.parentType) &&
      complexTypeHasParticle(location.parent as ComplexTypeWithParticles)
    ) {
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
      error:
        "Cannot combine groupName/compositor with parentId, minOccurs, or maxOccurs — use ref for group references",
    };
  }
  const { groupName } = command.payload;
  if (groupName === undefined || !isValidXmlName(groupName)) {
    return { valid: false, error: "Group name must be a valid XML name" };
  }
  const compositorResult = validateCompositor(command.payload.compositor);
  if (!compositorResult.valid) {
    return compositorResult;
  }
  const exists = (schemaObj.group ?? []).some((g) => g.name === groupName);
  if (exists) {
    return {
      valid: false,
      error: `Group name already exists: ${groupName}`,
    };
  }
  return { valid: true };
}

/**
 * Validates that the group definition or group reference that a group ID identifies exists. Used by both
 * `validateRemoveGroup` and `validateModifyGroup`. Compositors have commands of their own.
 *
 * @param groupId - The ID of a group reference or a group definition
 * @param schemaObj - The schema
 * @returns What the ID identifies, or the validation failure
 */
function locateGroup(groupId: string, schemaObj: schema): ValidationResultWith<ReferenceOrDefinition> {
  const parsedId = parseRequiredId(groupId, "Group");
  if (!parsedId.valid) {
    return parsedId;
  }
  const parsed = parsedId.parsed;

  if (isCompositorNodeType(parsed.nodeType)) {
    return { valid: false, error: `'${groupId}' is a compositor, which has commands of its own` };
  }
  return locateReferenceOrDefinition(
    parsed,
    SchemaNodeType.GroupRef,
    () => validateGroupRefExists(groupId, schemaObj),
    schemaObj.group,
    `Group not found: ${groupId}`
  );
}

/**
 * Validates a `removeGroup` command: the group definition or reference must exist, and a definition must
 * not be referenced any more.
 *
 * @param command - The command
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateRemoveGroup(command: RemoveGroupCommand, schemaObj: schema): ValidationResult {
  return validateDefinitionRemoval(locateGroup(command.payload.groupId, schemaObj), "Group", (name) =>
    isReferenced(schemaObj, "group", name)
  );
}

/**
 * Validates the changes of a `modifyGroup` command to a group reference: a new `ref` must name a group
 * definition, and the occurrences must be valid.
 *
 * @param payload - The payload of the command
 * @param schemaObj - The schema
 * @returns The validation result
 */
function validateReferenceChange(payload: ModifyGroupCommand["payload"], schemaObj: schema): ValidationResult {
  if (payload.groupName !== undefined || payload.compositor !== undefined) {
    return {
      valid: false,
      error:
        "Cannot use groupName or compositor when modifying a group reference — use ref, minOccurs or maxOccurs instead",
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
 * Validates the changes of a `modifyGroup` command to a group definition: a new name must be valid and
 * no other group definition may have it.
 *
 * @param payload - The payload of the command
 * @param schemaObj - The schema
 * @param currentName - The current name of the group definition
 * @returns The validation result
 */
function validateDefinitionChange(
  payload: ModifyGroupCommand["payload"],
  schemaObj: schema,
  currentName: string | undefined
): ValidationResult {
  if (payload.ref !== undefined || payload.minOccurs !== undefined || payload.maxOccurs !== undefined) {
    return {
      valid: false,
      error:
        "Cannot use ref, minOccurs, or maxOccurs when modifying a group definition — use groupName or compositor instead",
    };
  }
  const { groupName } = payload;
  if (groupName !== undefined && !isValidXmlName(groupName)) {
    return { valid: false, error: "Group name must be a valid XML name" };
  }
  if (
    groupName !== undefined &&
    groupName !== currentName &&
    (schemaObj.group ?? []).some((g) => g.name === groupName)
  ) {
    return { valid: false, error: `Group name already exists: ${groupName}` };
  }
  if (payload.compositor === undefined) {
    return { valid: true };
  }
  const compositorResult = validateCompositor(payload.compositor);
  if (!compositorResult.valid) {
    return compositorResult;
  }
  const group = (schemaObj.group ?? []).find((g) => g.name === currentName);
  return validateCompositorReplacement(group && getHeldCompositor(group), payload.compositor);
}

/**
 * Validates a `modifyGroup` command: what the ID identifies must exist, and the changes must fit it, a
 * group reference or a group definition.
 *
 * @param command - The command
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateModifyGroup(command: ModifyGroupCommand, schemaObj: schema): ValidationResult {
  const located = locateGroup(command.payload.groupId, schemaObj);
  if (!located.valid) {
    return located;
  }
  switch (located.target) {
    case "reference":
      return validateReferenceChange(command.payload, schemaObj);
    case "definition":
      return validateDefinitionChange(command.payload, schemaObj, located.name);
  }
}
