/**
 * Validators for attributeGroup commands.
 */

import {
  schema,
  AddAttributeGroupCommand,
  RemoveAttributeGroupCommand,
  ModifyAttributeGroupCommand,
  attributeGroupRef,
} from "../../shared/types";
import { ValidationResult, isValidXmlName } from "./validationUtils";
import { toArray } from "../../shared/schemaUtils";
import { parseSchemaId } from "../../shared/idStrategy";

// ===== AttributeGroup Reference Helpers =====

/**
 * Structural type for objects that can hold attribute group references.
 * Matches complexType and similar constructs.
 */
type AttributeGroupHolder = {
  attributeGroup?: attributeGroupRef[];
  complexContent?: {
    extension?: { attributeGroup?: attributeGroupRef[] };
    restriction?: { attributeGroup?: attributeGroupRef[] };
  };
  simpleContent?: {
    extension?: { attributeGroup?: attributeGroupRef[] };
    restriction?: { attributeGroup?: attributeGroupRef[] };
  };
};

/**
 * Returns true if the named attribute group is referenced within a holder.
 */
function attrGroupRefExistsInHolder(
  name: string,
  holder: AttributeGroupHolder
): boolean {
  if (toArray(holder.attributeGroup).some((r) => r.ref === name)) return true;
  const ccExt = holder.complexContent?.extension;
  if (ccExt && toArray(ccExt.attributeGroup).some((r) => r.ref === name)) {
    return true;
  }
  const ccRestr = holder.complexContent?.restriction;
  if (ccRestr && toArray(ccRestr.attributeGroup).some((r) => r.ref === name)) {
    return true;
  }
  const scExt = holder.simpleContent?.extension;
  if (scExt && toArray(scExt.attributeGroup).some((r) => r.ref === name)) {
    return true;
  }
  const scRestr = holder.simpleContent?.restriction;
  if (scRestr && toArray(scRestr.attributeGroup).some((r) => r.ref === name)) {
    return true;
  }
  return false;
}

/**
 * Returns true if the named attribute group is referenced anywhere in the schema.
 *
 * Checks:
 * - Top-level complexType definitions
 * - Inline complexTypes on top-level elements
 * - Other attribute group definitions
 */
function isAttrGroupReferenced(name: string, schemaObj: schema): boolean {
  for (const ct of toArray(schemaObj.complexType)) {
    if (attrGroupRefExistsInHolder(name, ct)) return true;
  }
  for (const el of toArray(schemaObj.element)) {
    if (el.complexType && attrGroupRefExistsInHolder(name, el.complexType)) {
      return true;
    }
  }
  for (const ag of toArray(schemaObj.attributeGroup)) {
    if (toArray(ag.attributeGroup).some((r) => r.ref === name)) return true;
  }
  return false;
}

// ===== AttributeGroup Command Validators =====

/**
 * Validates an addAttributeGroup command.
 *
 * Checks:
 * - `groupName` is a valid XML name
 * - No existing attribute group with the same name
 *
 * @param command - The addAttributeGroup command to validate
 * @param schemaObj - The schema object to validate against
 * @returns Validation result
 */
export function validateAddAttributeGroup(
  command: AddAttributeGroupCommand,
  schemaObj: schema
): ValidationResult {
  if (!isValidXmlName(command.payload.groupName)) {
    return {
      valid: false,
      error: "Attribute group name must be a valid XML name",
    };
  }
  const exists = toArray(schemaObj.attributeGroup).some(
    (g) => g.name === command.payload.groupName
  );
  if (exists) {
    return {
      valid: false,
      error: `Attribute group name already exists: ${command.payload.groupName}`,
    };
  }
  return { valid: true };
}

/**
 * Validates a removeAttributeGroup command.
 *
 * Checks:
 * - `groupId` is not empty
 * - The referenced attribute group exists
 * - The attribute group is not referenced elsewhere in the schema
 *
 * @param command - The removeAttributeGroup command to validate
 * @param schemaObj - The schema object to validate against
 * @returns Validation result
 */
export function validateRemoveAttributeGroup(
  command: RemoveAttributeGroupCommand,
  schemaObj: schema
): ValidationResult {
  if (!command.payload.groupId.trim()) {
    return { valid: false, error: "Attribute group ID cannot be empty" };
  }
  const parsed = parseSchemaId(command.payload.groupId);
  const found = toArray(schemaObj.attributeGroup).some(
    (g) => g.name === parsed.name
  );
  if (!found) {
    return {
      valid: false,
      error: `Attribute group not found: ${command.payload.groupId}`,
    };
  }
  if (parsed.name && isAttrGroupReferenced(parsed.name, schemaObj)) {
    return {
      valid: false,
      error: `Attribute group is still referenced and cannot be removed: ${parsed.name}`,
    };
  }
  return { valid: true };
}

/**
 * Validates a modifyAttributeGroup command.
 *
 * Checks:
 * - `groupId` is not empty
 * - The referenced attribute group exists
 * - If `groupName` is provided: it is a valid XML name and not already used
 *
 * @param command - The modifyAttributeGroup command to validate
 * @param schemaObj - The schema object to validate against
 * @returns Validation result
 */
export function validateModifyAttributeGroup(
  command: ModifyAttributeGroupCommand,
  schemaObj: schema
): ValidationResult {
  if (!command.payload.groupId.trim()) {
    return { valid: false, error: "Attribute group ID cannot be empty" };
  }
  const parsed = parseSchemaId(command.payload.groupId);
  const found = toArray(schemaObj.attributeGroup).some(
    (g) => g.name === parsed.name
  );
  if (!found) {
    return {
      valid: false,
      error: `Attribute group not found: ${command.payload.groupId}`,
    };
  }
  if (command.payload.groupName !== undefined) {
    if (!isValidXmlName(command.payload.groupName)) {
      return {
        valid: false,
        error: "Attribute group name must be a valid XML name",
      };
    }
    const nameExists = toArray(schemaObj.attributeGroup).some(
      (g) => g.name === command.payload.groupName && g.name !== parsed.name
    );
    if (nameExists) {
      return {
        valid: false,
        error: `Attribute group name already exists: ${command.payload.groupName}`,
      };
    }
  }
  return { valid: true };
}
