/**
 * Validators for attributeGroup commands.
 * Handles both top-level attribute group definitions and
 * attribute group references (xs:attributeGroup ref="...").
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
import { parseSchemaId, SchemaNodeType } from "../../shared/idStrategy";
import { locateNodeById } from "../schemaNavigator";

// ===== AttributeGroup Reference Helpers =====

/**
 * Structural type for a compositor (sequence/choice/all) that may contain
 * local elements whose inline complexTypes reference attribute groups.
 */
type CompositorWithElements = {
  element?: Array<{ complexType?: AttributeGroupHolder }>;
  choice?: CompositorWithElements[];
  sequence?: CompositorWithElements[];
};

/**
 * Structural type for objects that can hold attribute group references.
 * Matches complexType (top-level and local), extensionType, restrictionType,
 * and any inline complexType within a local element.
 */
type AttributeGroupHolder = {
  attributeGroup?: attributeGroupRef[];
  sequence?: CompositorWithElements;
  choice?: CompositorWithElements;
  all?: CompositorWithElements;
  complexContent?: {
    extension?: {
      attributeGroup?: attributeGroupRef[];
      sequence?: CompositorWithElements;
      choice?: CompositorWithElements;
    };
    restriction?: {
      attributeGroup?: attributeGroupRef[];
      sequence?: CompositorWithElements;
      choice?: CompositorWithElements;
    };
  };
  simpleContent?: {
    extension?: { attributeGroup?: attributeGroupRef[] };
    restriction?: { attributeGroup?: attributeGroupRef[] };
  };
};

/**
 * Structural type for objects that carry a direct array of attribute group refs.
 * Used in reference-mode validators to check parent containers.
 */
type AttrGroupRefHolder = { attributeGroup?: attributeGroupRef[] };

/**
 * Returns true if the named attribute group is directly referenced within a holder
 * (top-level attributeGroup array, or inside complexContent/simpleContent).
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
 * Returns true if the named attribute group is referenced within any local element's
 * inline complexType inside a compositor (sequence/choice/all) tree.
 * Recurses into nested compositors.
 */
function attrGroupRefExistsInCompositor(
  name: string,
  compositor: CompositorWithElements
): boolean {
  for (const el of toArray(compositor.element)) {
    if (el?.complexType && attrGroupRefExistsInHolderDeep(name, el.complexType)) {
      return true;
    }
  }
  for (const sub of toArray(compositor.choice)) {
    if (attrGroupRefExistsInCompositor(name, sub)) return true;
  }
  for (const sub of toArray(compositor.sequence)) {
    if (attrGroupRefExistsInCompositor(name, sub)) return true;
  }
  return false;
}

/**
 * Deep variant of attrGroupRefExistsInHolder that also checks compositor trees
 * (sequence/choice/all and their nested local element complexTypes).
 */
function attrGroupRefExistsInHolderDeep(
  name: string,
  holder: AttributeGroupHolder
): boolean {
  if (attrGroupRefExistsInHolder(name, holder)) return true;
  if (holder.sequence && attrGroupRefExistsInCompositor(name, holder.sequence)) {
    return true;
  }
  if (holder.choice && attrGroupRefExistsInCompositor(name, holder.choice)) {
    return true;
  }
  if (holder.all && attrGroupRefExistsInCompositor(name, holder.all)) {
    return true;
  }
  const ccExt = holder.complexContent?.extension;
  if (ccExt) {
    if (ccExt.sequence && attrGroupRefExistsInCompositor(name, ccExt.sequence)) {
      return true;
    }
    if (ccExt.choice && attrGroupRefExistsInCompositor(name, ccExt.choice)) {
      return true;
    }
  }
  const ccRestr = holder.complexContent?.restriction;
  if (ccRestr) {
    if (ccRestr.sequence && attrGroupRefExistsInCompositor(name, ccRestr.sequence)) {
      return true;
    }
    if (ccRestr.choice && attrGroupRefExistsInCompositor(name, ccRestr.choice)) {
      return true;
    }
  }
  return false;
}

/**
 * Returns true if the named attribute group is referenced anywhere in the schema.
 *
 * Checks:
 * - Top-level complexType definitions (including their compositor trees and
 *   inline complexTypes on nested local elements)
 * - Inline complexTypes on top-level elements (same deep traversal)
 * - Other attribute group definitions (direct refs only — attribute group
 *   definitions do not carry compositor particles)
 */
function isAttrGroupReferenced(name: string, schemaObj: schema): boolean {
  for (const ct of toArray(schemaObj.complexType)) {
    if (attrGroupRefExistsInHolderDeep(name, ct)) return true;
  }
  for (const el of toArray(schemaObj.element)) {
    if (el.complexType && attrGroupRefExistsInHolderDeep(name, el.complexType)) {
      return true;
    }
  }
  for (const ag of toArray(schemaObj.attributeGroup)) {
    if (toArray(ag.attributeGroup).some((r) => r.ref === name)) return true;
  }
  return false;
}

/**
 * Checks whether an attributeGroupRef identified by name and optional position
 * actually exists in the given refs array.
 */
function attrGroupRefExistsInParent(
  refs: attributeGroupRef[],
  name: string | undefined,
  position: number | undefined
): boolean {
  if (name !== undefined && position !== undefined) {
    return refs.some((r, idx) => r.ref === name && idx === position);
  }
  if (name !== undefined) {
    return refs.some((r) => r.ref === name);
  }
  if (position !== undefined) {
    return position >= 0 && position < refs.length;
  }
  return false;
}

// ===== AttributeGroup Command Validators =====

/**
 * Validates an addAttributeGroup command.
 *
 * Two mutually exclusive modes:
 * - **Definition mode** (`groupName` only): validates XML name uniqueness.
 * - **Reference mode** (`ref` + `parentId`): validates the ref name, that the referenced
 *   group exists, and that the parent node exists.
 *
 * @param command - The addAttributeGroup command to validate
 * @param schemaObj - The schema object to validate against
 * @returns Validation result
 */
export function validateAddAttributeGroup(
  command: AddAttributeGroupCommand,
  schemaObj: schema
): ValidationResult {
  const { groupName, ref, parentId } = command.payload;

  if (ref !== undefined) {
    // Reference mode — reject definition-mode fields
    if (groupName !== undefined) {
      return {
        valid: false,
        error:
          "Cannot combine ref with groupName — use ref for references, groupName for definitions",
      };
    }
    if (!parentId?.trim()) {
      return {
        valid: false,
        error: "Parent ID is required for attribute group references",
      };
    }
    if (!isValidXmlName(ref)) {
      return {
        valid: false,
        error: "Attribute group ref must be a valid XML name",
      };
    }
    const groupExists = toArray(schemaObj.attributeGroup).some(
      (g) => g.name === ref
    );
    if (!groupExists) {
      return {
        valid: false,
        error: `Referenced attribute group does not exist: ${ref}`,
      };
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
    if (!validAttrGroupRefParents.includes(location.parentType ?? "")) {
      return { valid: false, error: `Cannot add attribute group reference to parent type: ${location.parentType}` };
    }
    return { valid: true };
  }

  // Definition mode — reject reference-mode fields
  if (parentId !== undefined) {
    return {
      valid: false,
      error:
        "Cannot combine groupName with parentId — use ref for references, groupName for definitions",
    };
  }
  if (!isValidXmlName(groupName ?? "")) {
    return {
      valid: false,
      error: "Attribute group name must be a valid XML name",
    };
  }
  const exists = toArray(schemaObj.attributeGroup).some(
    (g) => g.name === groupName
  );
  if (exists) {
    return {
      valid: false,
      error: `Attribute group name already exists: ${groupName}`,
    };
  }
  return { valid: true };
}

/**
 * Validates a removeAttributeGroup command.
 *
 * The `groupId` determines the mode:
 * - **Definition** (`/attributeGroup:Name`): validates existence and no remaining references.
 * - **Reference** (`/complexType:X/attributeGroupRef:Name[0]`): validates parent existence.
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

  if (parsed.nodeType === SchemaNodeType.AttributeGroupRef) {
    // Reference mode: validate parent exists and the ref is present on it
    if (!parsed.parentId) {
      return {
        valid: false,
        error: `Invalid attributeGroupRef ID: ${command.payload.groupId}`,
      };
    }
    const location = locateNodeById(schemaObj, parsed.parentId);
    if (!location.found) {
      return {
        valid: false,
        error: `Parent node not found: ${parsed.parentId}`,
      };
    }
    const refs = toArray((location.parent as AttrGroupRefHolder).attributeGroup);
    if (!attrGroupRefExistsInParent(refs, parsed.name, parsed.position)) {
      return {
        valid: false,
        error: `Attribute group reference not found: ${command.payload.groupId}`,
      };
    }
    return { valid: true };
  }

  // Definition mode: validate existence and no references
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
 * The `groupId` determines the mode:
 * - **Definition** (`/attributeGroup:Name`): validates existence; rejects `ref` field.
 *   If `groupName` provided, validates XML name and uniqueness.
 * - **Reference** (`/complexType:X/attributeGroupRef:Name[0]`): validates parent existence;
 *   rejects `groupName` field. If `ref` provided, validates the referenced group exists.
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

  if (parsed.nodeType === SchemaNodeType.AttributeGroupRef) {
    // Reference mode: reject definition-mode fields
    if (command.payload.groupName !== undefined) {
      return {
        valid: false,
        error:
          "Cannot use groupName when modifying an attribute group reference — use ref or documentation instead",
      };
    }
    if (!parsed.parentId) {
      return {
        valid: false,
        error: `Invalid attributeGroupRef ID: ${command.payload.groupId}`,
      };
    }
    const location = locateNodeById(schemaObj, parsed.parentId);
    if (!location.found) {
      return {
        valid: false,
        error: `Parent node not found: ${parsed.parentId}`,
      };
    }
    const refs = toArray((location.parent as AttrGroupRefHolder).attributeGroup);
    if (!attrGroupRefExistsInParent(refs, parsed.name, parsed.position)) {
      return {
        valid: false,
        error: `Attribute group reference not found: ${command.payload.groupId}`,
      };
    }
    if (command.payload.ref !== undefined) {
      if (!isValidXmlName(command.payload.ref)) {
        return {
          valid: false,
          error: "Attribute group ref must be a valid XML name",
        };
      }
      const refExists = toArray(schemaObj.attributeGroup).some(
        (g) => g.name === command.payload.ref
      );
      if (!refExists) {
        return {
          valid: false,
          error: `Referenced attribute group does not exist: ${command.payload.ref}`,
        };
      }
    }
    return { valid: true };
  }

  // Definition mode: reject reference-mode fields
  if (command.payload.ref !== undefined) {
    return {
      valid: false,
      error:
        "Cannot use ref when modifying an attribute group definition — use groupName or documentation instead",
    };
  }
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

