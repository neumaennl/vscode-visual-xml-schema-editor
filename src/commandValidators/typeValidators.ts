/**
 * Validators for type commands (SimpleType and ComplexType).
 */

import {
  schema,
  AddSimpleTypeCommand,
  RemoveSimpleTypeCommand,
  ModifySimpleTypeCommand,
  AddComplexTypeCommand,
  RemoveComplexTypeCommand,
  ModifyComplexTypeCommand,
} from "../../shared/types";
import {
  ValidationResult,
  isValidXmlName,
  validateElementType,
} from "./validationUtils";
import { parseSchemaId, SchemaNodeType } from "../../shared/idStrategy";
import { toArray, isSchemaRoot } from "../../shared/schemaUtils";
import { locateNodeById } from "../schemaNavigator";

/**
 * Valid content models for ComplexType elements.
 * Only compositor models are supported in Phase 1 (sequence, choice, all).
 * Note: ContentModel type in shared/commands/schemaTypes.ts defines: "sequence" | "choice" | "all"
 */
export const VALID_COMPLEX_TYPE_CONTENT_MODELS = [
  "sequence",
  "choice",
  "all",
] as const;

/** Container types that may hold an anonymous simpleType inline. */
const INLINE_SIMPLE_TYPE_PARENT_TYPES = ["topLevelElement", "localElement", "topLevelAttribute", "attribute"];

// ===== SimpleType Command Validation =====

export function validateAddSimpleType(
  command: AddSimpleTypeCommand,
  schemaObj: schema
): ValidationResult {
  const { parentId, typeName, baseType } = command.payload;

  if (!isSchemaRoot(parentId)) {
    // Anonymous simpleType inside an element or attribute — isSchemaRoot guarantees parentId is a non-empty string here
    const location = locateNodeById(schemaObj, parentId as string);
    if (!location.found) {
      return { valid: false, error: `Parent not found: ${parentId}` };
    }
    if (!INLINE_SIMPLE_TYPE_PARENT_TYPES.includes(location.parentType ?? "")) {
      return {
        valid: false,
        error: `Parent of type '${location.parentType}' cannot contain a simpleType`,
      };
    }
    // parentType is confirmed to be a valid inline simpleType container by the check above
    const holder = location.parent as { type_?: string; simpleType?: unknown };
    if (holder.type_) {
      return {
        valid: false,
        error: `'${parentId}' already has a type attribute ('${holder.type_}'); cannot add an inline simpleType`,
      };
    }
    if (holder.simpleType) {
      return { valid: false, error: `'${parentId}' already has an anonymous simpleType` };
    }
    if (!baseType.trim()) {
      return { valid: false, error: "Base type cannot be empty" };
    }
    const baseTypeResult = validateElementType(baseType, schemaObj);
    if (!baseTypeResult.valid) {
      return { valid: false, error: `Base type '${baseType}' is not a recognized XSD type` };
    }
    return { valid: true };
  }

  // Top-level named simpleType
  if (!isValidXmlName(typeName ?? "")) {
    return { valid: false, error: "Type name must be a valid XML name" };
  }
  if (!baseType.trim()) {
    return { valid: false, error: "Base type cannot be empty" };
  }
  if (toArray(schemaObj.simpleType).some(st => st.name === typeName)) {
    return { valid: false, error: `Simple type '${typeName}' already exists in schema` };
  }
  const baseTypeResult = validateElementType(baseType, schemaObj);
  if (!baseTypeResult.valid) {
    return { valid: false, error: `Base type '${baseType}' is not a recognized XSD type` };
  }
  return { valid: true };
}

export function validateRemoveSimpleType(
  command: RemoveSimpleTypeCommand,
  schemaObj: schema
): ValidationResult {
  if (!command.payload.typeId.trim()) {
    return { valid: false, error: "Type ID cannot be empty" };
  }

  const parsed = parseSchemaId(command.payload.typeId);

  if (parsed.nodeType === SchemaNodeType.AnonymousSimpleType) {
    if (!parsed.parentId) {
      return { valid: false, error: `Invalid anonymous simpleType ID: ${command.payload.typeId}` };
    }
    const location = locateNodeById(schemaObj, parsed.parentId);
    if (!location.found) {
      return { valid: false, error: `Parent not found: ${parsed.parentId}` };
    }
    const holder = location.parent as { simpleType?: unknown };
    if (!holder.simpleType) {
      return {
        valid: false,
        error: `No anonymous simpleType found in parent: ${parsed.parentId}`,
      };
    }
  }

  // TODO Phase 2: Check if type is being used by other elements/types
  return { valid: true };
}

export function validateModifySimpleType(
  command: ModifySimpleTypeCommand,
  schemaObj: schema
): ValidationResult {
  if (!command.payload.typeId.trim()) {
    return { valid: false, error: "Type ID cannot be empty" };
  }
  if (command.payload.typeName !== undefined && !isValidXmlName(command.payload.typeName)) {
    return { valid: false, error: "Type name must be a valid XML name" };
  }

  const parsed = parseSchemaId(command.payload.typeId);

  if (parsed.nodeType === SchemaNodeType.AnonymousSimpleType) {
    if (!parsed.parentId) {
      return { valid: false, error: `Invalid anonymous simpleType ID: ${command.payload.typeId}` };
    }
    const location = locateNodeById(schemaObj, parsed.parentId);
    if (!location.found) {
      return { valid: false, error: `Parent not found: ${parsed.parentId}` };
    }
    const holder = location.parent as { simpleType?: unknown };
    if (!holder.simpleType) {
      return {
        valid: false,
        error: `No anonymous simpleType found in parent: ${parsed.parentId}`,
      };
    }
    return { valid: true };
  }

  // Top-level named simpleType: validate it exists in the schema
  if (!toArray(schemaObj.simpleType).some(st => st.name === parsed.name)) {
    return { valid: false, error: `Simple type '${parsed.name}' not found in schema` };
  }
  return { valid: true };
}

// ===== ComplexType Command Validation =====

export function validateAddComplexType(
  command: AddComplexTypeCommand,
  _schemaObj: schema
): ValidationResult {
  // Validate type name is a valid XML name
  if (!isValidXmlName(command.payload.typeName)) {
    return { valid: false, error: "Type name must be a valid XML name" };
  }
  if (!command.payload.contentModel) {
    return { valid: false, error: "Content model is required" };
  }
  // Validate content model is one of the valid options
  if (!VALID_COMPLEX_TYPE_CONTENT_MODELS.includes(command.payload.contentModel)) {
    return {
      valid: false,
      error: `Content model must be one of: ${VALID_COMPLEX_TYPE_CONTENT_MODELS.join(", ")}`,
    };
  }
  // TODO Phase 2: Check if type name already exists in schema
  return { valid: true };
}

export function validateRemoveComplexType(
  command: RemoveComplexTypeCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.typeId.trim()) {
    return { valid: false, error: "Type ID cannot be empty" };
  }
  // TODO Phase 2: Validate that typeId exists in schema
  // TODO Phase 2: Check if type is being used by other elements/types
  return { valid: true };
}

export function validateModifyComplexType(
  command: ModifyComplexTypeCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.typeId.trim()) {
    return { valid: false, error: "Type ID cannot be empty" };
  }
  // TODO Phase 2: Validate that typeId exists in schema
  return { valid: true };
}
