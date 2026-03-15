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

/** Container types that may hold an anonymous complexType inline. */
const INLINE_COMPLEX_TYPE_PARENT_TYPES = ["topLevelElement", "localElement"];

/**
 * Validates that an anonymous type's parent exists and carries the expected property.
 * Returns a `ValidationResult` with an error when validation fails, or `null` when the
 * parent is valid and the anonymous type slot is occupied (exists).
 *
 * @param typeId - The full ID of the anonymous type (used in error messages).
 * @param parentId - The ID of the parent container element/attribute.
 * @param schemaObj - The root schema object to search.
 * @param prop - The property name to check (e.g. `"simpleType"` or `"complexType"`).
 * @param label - Human-readable type label for error messages (e.g. `"simpleType"`).
 */
function validateAnonymousTypeParent(
  typeId: string,
  parentId: string | undefined,
  schemaObj: schema,
  prop: string,
  label: string
): { error: ValidationResult; location?: never } | { error?: never; location: ReturnType<typeof locateNodeById> } {
  if (!parentId) {
    return { error: { valid: false, error: `Invalid anonymous ${label} ID: ${typeId}` } };
  }
  const location = locateNodeById(schemaObj, parentId);
  if (!location.found) {
    return { error: { valid: false, error: `Parent not found: ${parentId}` } };
  }
  const holder = location.parent as Record<string, unknown>;
  if (!holder[prop]) {
    return {
      error: {
        valid: false,
        error: `No anonymous ${label} found in parent: ${parentId}`,
      },
    };
  }
  return { location };
}

/**
 * Validates a content model value against the provided list of valid models.
 * Returns a validation error if the model is missing or unsupported, otherwise null.
 */
function validateContentModel(
  contentModel: string | undefined,
  validModels: readonly string[]
): ValidationResult | null {
  if (!contentModel) {
    return { valid: false, error: "Content model is required" };
  }
  if (!validModels.includes(contentModel)) {
    return {
      valid: false,
      error: `Content model must be one of: ${validModels.join(", ")}`,
    };
  }
  return null;
}

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
      return {
        valid: false,
        error:
          baseTypeResult.error
            ? `Base type: ${baseTypeResult.error}`
            : `Base type '${baseType}' is not a recognized XSD type`,
      };
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
    const result = validateAnonymousTypeParent(command.payload.typeId, parsed.parentId, schemaObj, "simpleType", "simpleType");
    return result.error ?? { valid: true };
  }

  // TODO Phase 2: Check if type is being used by other elements/types
  // Top-level named simpleType: check it exists
  if (!toArray(schemaObj.simpleType).some(st => st.name === parsed.name)) {
    return { valid: false, error: `SimpleType not found: ${parsed.name}` };
  }
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
    const result = validateAnonymousTypeParent(command.payload.typeId, parsed.parentId, schemaObj, "simpleType", "simpleType");
    if (result.error) return result.error;
    const location = result.location!;
    if (command.payload.restrictions !== undefined && command.payload.baseType === undefined) {
      const anonSt = (location.parent as { simpleType?: { restriction?: unknown } }).simpleType;
      if (anonSt && !(anonSt as { restriction?: unknown }).restriction) {
        return { valid: false, error: "Cannot apply restrictions without a base type" };
      }
    }
    if (command.payload.typeName !== undefined) {
      return {
        valid: false,
        error: "Cannot provide 'typeName' when modifying an anonymous simpleType",
      };
    }
    return { valid: true };
  }

  // Top-level named simpleType: validate it exists in the schema
  if (!toArray(schemaObj.simpleType).some(st => st.name === parsed.name)) {
    return { valid: false, error: `Simple type '${parsed.name}' not found in schema` };
  }
  if (command.payload.restrictions !== undefined && command.payload.baseType === undefined) {
    const simpleType = toArray(schemaObj.simpleType).find(st => st.name === parsed.name);
    if (simpleType && !simpleType.restriction) {
      return { valid: false, error: "Cannot apply restrictions without a base type" };
    }
  }
  return { valid: true };
}

// ===== ComplexType Command Validation =====

export function validateAddComplexType(
  command: AddComplexTypeCommand,
  schemaObj: schema
): ValidationResult {
  const { parentId, typeName, contentModel } = command.payload;

  if (!isSchemaRoot(parentId)) {
    // Anonymous complexType inside an element — isSchemaRoot guarantees parentId is a non-empty string here
    const location = locateNodeById(schemaObj, parentId as string);
    if (!location.found) {
      return { valid: false, error: `Parent not found: ${parentId}` };
    }
    if (!INLINE_COMPLEX_TYPE_PARENT_TYPES.includes(location.parentType ?? "")) {
      return {
        valid: false,
        error: `Parent of type '${location.parentType}' cannot contain a complexType`,
      };
    }
    const holder = location.parent as { type_?: string; complexType?: unknown };
    if (holder.type_) {
      return {
        valid: false,
        error: `'${parentId}' already has a type attribute ('${holder.type_}'); cannot add an inline complexType`,
      };
    }
    if (holder.complexType) {
      return { valid: false, error: `'${parentId}' already has an anonymous complexType` };
    }
    const contentModelError = validateContentModel(contentModel, VALID_COMPLEX_TYPE_CONTENT_MODELS);
    if (contentModelError) return contentModelError;
    return { valid: true };
  }

  // Top-level named complexType
  if (!isValidXmlName(typeName ?? "")) {
    return { valid: false, error: "Type name must be a valid XML name" };
  }
  const contentModelError = validateContentModel(contentModel, VALID_COMPLEX_TYPE_CONTENT_MODELS);
  if (contentModelError) return contentModelError;
  if (toArray(schemaObj.complexType).some((ct) => ct.name === typeName)) {
    return {
      valid: false,
      error: `Complex type '${typeName}' already exists in schema`,
    };
  }
  return { valid: true };
}

export function validateRemoveComplexType(
  command: RemoveComplexTypeCommand,
  schemaObj: schema
): ValidationResult {
  if (!command.payload.typeId.trim()) {
    return { valid: false, error: "Type ID cannot be empty" };
  }

  const parsed = parseSchemaId(command.payload.typeId);

  if (parsed.nodeType === SchemaNodeType.AnonymousComplexType) {
    const result = validateAnonymousTypeParent(command.payload.typeId, parsed.parentId, schemaObj, "complexType", "complexType");
    return result.error ?? { valid: true };
  }

  if (!toArray(schemaObj.complexType).some((ct) => ct.name === parsed.name)) {
    return { valid: false, error: `Complex type '${parsed.name}' not found in schema` };
  }
  return { valid: true };
}

export function validateModifyComplexType(
  command: ModifyComplexTypeCommand,
  schemaObj: schema
): ValidationResult {
  if (!command.payload.typeId.trim()) {
    return { valid: false, error: "Type ID cannot be empty" };
  }

  const parsed = parseSchemaId(command.payload.typeId);

  if (parsed.nodeType === SchemaNodeType.AnonymousComplexType) {
    const result = validateAnonymousTypeParent(command.payload.typeId, parsed.parentId, schemaObj, "complexType", "complexType");
    if (result.error) return result.error;
    if (command.payload.typeName !== undefined) {
      return {
        valid: false,
        error: "Cannot provide 'typeName' when modifying an anonymous complexType",
      };
    }
    if (command.payload.contentModel !== undefined) {
      const contentModelError = validateContentModel(command.payload.contentModel, VALID_COMPLEX_TYPE_CONTENT_MODELS);
      if (contentModelError) return contentModelError;
    }
    return { valid: true };
  }

  if (command.payload.typeName !== undefined && !isValidXmlName(command.payload.typeName)) {
    return { valid: false, error: "Type name must be a valid XML name" };
  }
  if (command.payload.contentModel !== undefined) {
    const contentModelError = validateContentModel(command.payload.contentModel, VALID_COMPLEX_TYPE_CONTENT_MODELS);
    if (contentModelError) return contentModelError;
  }
  if (!toArray(schemaObj.complexType).some((ct) => ct.name === parsed.name)) {
    return { valid: false, error: `Complex type '${parsed.name}' not found in schema` };
  }
  return { valid: true };
}
