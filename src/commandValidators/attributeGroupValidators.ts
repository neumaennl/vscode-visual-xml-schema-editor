/**
 * Validators for attributeGroup commands.
 * Handles both top-level attribute group definitions and
 * attribute group references (`xs:attributeGroup ref="..."`).
 */

import { isValidXmlName } from "../../shared/qNames.js";
import type {
  schema,
  AddAttributeGroupCommand,
  RemoveAttributeGroupCommand,
  ModifyAttributeGroupCommand,
} from "../../shared/types.js";
import type { ValidationFailure, ValidationResult } from "../../shared/validation.js";
import { parseSchemaId, SchemaNodeType } from "../../shared/idStrategy.js";
import { locateNodeById } from "../schemaNavigator.js";
import { getAttributeContainer } from "../../shared/schemaUtils.js";
import { findAttributeGroupRef } from "../commandUtils.js";
import type { ReferenceOrDefinition } from "./commonValidators.js";
import {
  locateReferenceOrDefinition,
  parseRequiredId,
  validateDefinitionRemoval,
  validateReference,
} from "./commonValidators.js";
import { isReferenced } from "../schemaReferences/referenceChecks.js";

// ===== AttributeGroup Reference Helpers =====

/**
 * Validates the reference to an attribute group definition.
 *
 * @param ref - The value of `ref`
 * @param schemaObj - The schema
 * @returns The validation result
 */
function validateAttrGroupReference(ref: string, schemaObj: schema): ValidationResult {
  return validateReference(ref, "attributeGroup", schemaObj, `Referenced attribute group does not exist: ${ref}`);
}

/**
 * Validates that the attribute group reference that an `attributeGroupRef` ID identifies exists. Used by
 * both `validateRemoveAttributeGroup` and `validateModifyAttributeGroup`.
 *
 * @param groupId - The `attributeGroupRef` ID
 * @param schemaObj - The schema
 * @returns The validation result
 */
function validateAttrGroupRefExists(groupId: string, schemaObj: schema): ValidationResult {
  const parsed = parseSchemaId(groupId);
  if (!parsed.parentId) {
    return { valid: false, error: `Invalid attributeGroupRef ID: ${groupId}` };
  }
  const location = locateNodeById(schemaObj, parsed.parentId);
  if (!location.found) {
    return { valid: false, error: `Parent node not found: ${parsed.parentId}` };
  }
  const refs = getAttributeContainer(location.parent).attributeGroup ?? [];
  if (!findAttributeGroupRef(refs, parsed.name, parsed.position)) {
    return { valid: false, error: `Attribute group reference not found: ${groupId}` };
  }
  return { valid: true };
}

/**
 * Validates that the attribute group reference or definition that an ID identifies exists. Used by
 * both `validateRemoveAttributeGroup` and `validateModifyAttributeGroup`.
 *
 * @param groupId - The ID of an attribute group reference (`/complexType:X/attributeGroupRef:Name[0]`)
 * or definition (`/attributeGroup:Name`)
 * @param schemaObj - The schema
 * @returns What the ID identifies, or the validation failure
 */
function locateAttributeGroup(
  groupId: string,
  schemaObj: schema
): ValidationFailure | ({ valid: true } & ReferenceOrDefinition) {
  const parsedId = parseRequiredId(groupId, "Attribute group");
  if (!parsedId.valid) {
    return parsedId;
  }
  return locateReferenceOrDefinition(
    parsedId.parsed,
    SchemaNodeType.AttributeGroupRef,
    () => validateAttrGroupRefExists(groupId, schemaObj),
    schemaObj.attributeGroup,
    `Attribute group not found: ${groupId}`
  );
}

// ===== AttributeGroup Command Validators =====

/**
 * Validates an `addAttributeGroup` command.
 *
 * Two mutually exclusive modes:
 * - **Definition mode** (`groupName` only): validates XML name uniqueness.
 * - **Reference mode** (`ref` + `parentId`): validates the ref name, that the referenced
 *   group exists, and that the parent node exists.
 *
 * @param command - The `addAttributeGroup` command to validate
 * @param schemaObj - The schema object to validate against
 * @returns Validation result
 */
export function validateAddAttributeGroup(command: AddAttributeGroupCommand, schemaObj: schema): ValidationResult {
  const { groupName, ref, parentId } = command.payload;

  if (ref !== undefined) {
    // Reference mode — reject definition-mode fields
    if (groupName !== undefined) {
      return {
        valid: false,
        error: "Cannot combine ref with groupName — use ref for references, groupName for definitions",
      };
    }
    if (!parentId?.trim()) {
      return {
        valid: false,
        error: "Parent ID is required for attribute group references",
      };
    }
    const referenceResult = validateAttrGroupReference(ref, schemaObj);
    if (!referenceResult.valid) {
      return referenceResult;
    }
    const location = locateNodeById(schemaObj, parentId);
    if (!location.found) {
      return {
        valid: false,
        error: `Parent node not found: ${parentId}`,
      };
    }
    // Validate that the parent type supports attribute group refs
    const validAttrGroupRefParents = ["topLevelComplexType", "localComplexType", "namedAttributeGroup"];
    if (!validAttrGroupRefParents.includes(location.parentType)) {
      return { valid: false, error: `Cannot add attribute group reference to parent type: ${location.parentType}` };
    }
    return { valid: true };
  }

  // Definition mode — reject reference-mode fields
  if (parentId !== undefined) {
    return {
      valid: false,
      error: "Cannot combine groupName with parentId — use ref for references, groupName for definitions",
    };
  }
  if (groupName === undefined || !isValidXmlName(groupName)) {
    return {
      valid: false,
      error: "Attribute group name must be a valid XML name",
    };
  }
  const exists = (schemaObj.attributeGroup ?? []).some((g) => g.name === groupName);
  if (exists) {
    return {
      valid: false,
      error: `Attribute group name already exists: ${groupName}`,
    };
  }
  return { valid: true };
}

/**
 * Validates a `removeAttributeGroup` command.
 *
 * The `groupId` determines the mode:
 * - **Definition** (`/attributeGroup:Name`): validates existence and no remaining references.
 * - **Reference** (`/complexType:X/attributeGroupRef:Name[0]`): validates parent existence.
 *
 * @param command - The `removeAttributeGroup` command to validate
 * @param schemaObj - The schema object to validate against
 * @returns Validation result
 */
export function validateRemoveAttributeGroup(
  command: RemoveAttributeGroupCommand,
  schemaObj: schema
): ValidationResult {
  return validateDefinitionRemoval(
    locateAttributeGroup(command.payload.groupId, schemaObj),
    "Attribute group",
    (name) => isReferenced(schemaObj, "attributeGroup", name)
  );
}

/**
 * Validates a `modifyAttributeGroup` command.
 *
 * The `groupId` determines the mode:
 * - **Definition** (`/attributeGroup:Name`): validates existence; rejects `ref` field.
 *   If `groupName` provided, validates XML name and uniqueness.
 * - **Reference** (`/complexType:X/attributeGroupRef:Name[0]`): validates parent existence;
 *   rejects `groupName` field. If `ref` provided, validates the referenced group exists.
 *
 * @param command - The `modifyAttributeGroup` command to validate
 * @param schemaObj - The schema object to validate against
 * @returns Validation result
 */
export function validateModifyAttributeGroup(
  command: ModifyAttributeGroupCommand,
  schemaObj: schema
): ValidationResult {
  const { groupName, ref } = command.payload;
  const located = locateAttributeGroup(command.payload.groupId, schemaObj);
  if (!located.valid) {
    return located;
  }

  if (located.target === "reference") {
    if (groupName !== undefined) {
      return {
        valid: false,
        error: "Cannot use groupName when modifying an attribute group reference — use ref or documentation instead",
      };
    }
    return ref === undefined ? { valid: true } : validateAttrGroupReference(ref, schemaObj);
  }

  if (ref !== undefined) {
    return {
      valid: false,
      error: "Cannot use ref when modifying an attribute group definition — use groupName or documentation instead",
    };
  }
  if (groupName !== undefined) {
    if (!isValidXmlName(groupName)) {
      return {
        valid: false,
        error: "Attribute group name must be a valid XML name",
      };
    }
    if ((schemaObj.attributeGroup ?? []).some((g) => g.name === groupName && g.name !== located.name)) {
      return {
        valid: false,
        error: `Attribute group name already exists: ${groupName}`,
      };
    }
  }
  return { valid: true };
}
