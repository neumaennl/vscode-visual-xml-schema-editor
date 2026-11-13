/**
 * Validators for complex type commands.
 */

import {
  schema,
  AddComplexTypeCommand,
  RemoveComplexTypeCommand,
  ModifyComplexTypeCommand,
} from "../../shared/types.js";
import {
  ValidationResult,
  isValidXmlName,
  validateAnonymousTypeParent,
  validateElementType,
} from "./validationUtils.js";
import { parseSchemaId, SchemaNodeType } from "../../shared/idStrategy.js";
import { isSchemaRoot } from "../../shared/schemaUtils.js";
import { locateNodeById } from "../schemaNavigator.js";

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

/** Valid derivation kinds for complex types that use a base type. */
export const VALID_COMPLEX_TYPE_DERIVATION_KINDS = [
  "extension",
  "restriction",
] as const;

/** Container types that may hold an anonymous complexType inline. */
const INLINE_COMPLEX_TYPE_PARENT_TYPES = ["topLevelElement", "localElement"];

/**
 * Validates a content model value against the provided list of valid models.
 * Returns a validation error if the model is missing or unsupported.
 */
function validateContentModel(
  contentModel: string | undefined,
  validModels: readonly string[]
): ValidationResult {
  if (!contentModel) {
    return { valid: false, error: "Content model is required" };
  }
  if (!validModels.includes(contentModel)) {
    return {
      valid: false,
      error: `Content model must be one of: ${validModels.join(", ")}`,
    };
  }
  return { valid: true };
}

/**
 * Validates the derivation kind of a complex type payload.
 *
 * @param derivationKind - The `derivationKind` of the payload; a payload without one is valid
 * @returns The validation result
 */
function validateDerivationKind(
  derivationKind: string | undefined
): ValidationResult {
  if (derivationKind === undefined) {
    return { valid: true };
  }
  if (!VALID_COMPLEX_TYPE_DERIVATION_KINDS.includes(derivationKind as typeof VALID_COMPLEX_TYPE_DERIVATION_KINDS[number])) {
    return {
      valid: false,
      error: `Derivation kind must be one of: ${VALID_COMPLEX_TYPE_DERIVATION_KINDS.join(", ")}`,
    };
  }
  return { valid: true };
}

/**
 * Structural type for the parts of an existing complex type that decide which changes of its
 * derivation and content are possible.
 */
type ExistingComplexType = {
  simpleContent?: unknown;
  group?: unknown;
  complexContent?: {
    extension?: { base?: string; group?: unknown };
    restriction?: { base?: string; group?: unknown };
  };
};

/**
 * Validates the base type and the derivation kind of a new or changed complex type. A derivation kind
 * needs a base type, from the payload or, when modifying, from the existing type.
 *
 * @param payload - The base type and derivation kind of the payload; an empty base type removes the base
 * @param existing - The existing complex type when modifying, otherwise `undefined`
 * @param schemaObj - The schema, to check the base type against
 * @returns The validation result
 */
function validateComplexTypeDerivation(
  payload: { baseType?: string; derivationKind?: string },
  existing: ExistingComplexType | undefined,
  schemaObj: schema
): ValidationResult {
  const baseType = payload.baseType?.trim();
  if (baseType) {
    const baseTypeResult = validateElementType(baseType, schemaObj);
    if (!baseTypeResult.valid) {
      return {
        valid: false,
        error: `Base type: ${baseTypeResult.error}`,
      };
    }
  }
  const existingBase = existing?.complexContent?.extension?.base ?? existing?.complexContent?.restriction?.base;
  const effectiveBase = payload.baseType !== undefined ? baseType : existingBase;
  if (payload.derivationKind !== undefined && !effectiveBase) {
    return { valid: false, error: "Derivation kind requires a base type" };
  }
  return { valid: true };
}

/**
 * Validates a change of the base type, the derivation kind or the content model of an existing complex type.
 * The editor does not support simple content yet, and a complex type has at most one particle, so a
 * content model cannot be added next to a group reference.
 *
 * @param payload - The changed fields of the payload
 * @param existing - The existing complex type
 * @param typeId - The ID of the complex type, for the error message
 * @returns The validation result
 */
function validateComplexTypeContentChange(
  payload: { baseType?: string; derivationKind?: string; contentModel?: string },
  existing: ExistingComplexType,
  typeId: string
): ValidationResult {
  const changesContent =
    payload.baseType !== undefined || payload.derivationKind !== undefined || payload.contentModel !== undefined;
  if (changesContent && existing.simpleContent) {
    return {
      valid: false,
      error: `'${typeId}' has simple content, whose base type, derivation and content model cannot be changed yet`,
    };
  }
  const groupRef = existing.group ?? existing.complexContent?.extension?.group ?? existing.complexContent?.restriction?.group;
  if (payload.contentModel !== undefined && groupRef) {
    return {
      valid: false,
      error: `'${typeId}' already has a particle (a group reference) and cannot get a content model`,
    };
  }
  return { valid: true };
}

export function validateAddComplexType(
  command: AddComplexTypeCommand,
  schemaObj: schema
): ValidationResult {
  const { parentId, typeName, contentModel, derivationKind } = command.payload;

  if (!isSchemaRoot(parentId)) {
    // Anonymous complexType inside an element — isSchemaRoot guarantees parentId is a non-empty string here
    const location = locateNodeById(schemaObj, parentId as string);
    if (!location.found) {
      return { valid: false, error: `Parent not found: ${parentId}` };
    }
    if (!INLINE_COMPLEX_TYPE_PARENT_TYPES.includes(location.parentType)) {
      return {
        valid: false,
        error: `Parent of type '${location.parentType}' cannot contain a complexType`,
      };
    }
    const holder = location.parent as { ref?: string; type_?: string; complexType?: unknown };
    // In XSD, nodes with a ref attribute are references to existing declarations rather
    // than local declarations of their own, so they cannot define an inline type here.
    // By contrast, nodes with a type_ attribute are still local declarations and may be
    // converted from an explicit type reference to an inline anonymous type.
    if (holder.ref) {
      return {
        valid: false,
        error: `'${parentId}' has a ref attribute and cannot carry an inline complexType`,
      };
    }
    if (holder.complexType) {
      return { valid: false, error: `'${parentId}' already has an anonymous complexType` };
    }
    const contentModelResult = validateContentModel(contentModel, VALID_COMPLEX_TYPE_CONTENT_MODELS);
    if (!contentModelResult.valid) return contentModelResult;
    const derivationKindResult = validateDerivationKind(derivationKind);
    if (!derivationKindResult.valid) return derivationKindResult;
    const derivationResult = validateComplexTypeDerivation(command.payload, undefined, schemaObj);
    if (!derivationResult.valid) return derivationResult;
    return { valid: true };
  }

  // Top-level named complexType
  if (!isValidXmlName(typeName ?? "")) {
    return { valid: false, error: "Type name must be a valid XML name" };
  }
  const contentModelResult = validateContentModel(contentModel, VALID_COMPLEX_TYPE_CONTENT_MODELS);
  if (!contentModelResult.valid) return contentModelResult;
  const derivationKindResult = validateDerivationKind(derivationKind);
  if (!derivationKindResult.valid) return derivationKindResult;
  const derivationResult = validateComplexTypeDerivation(command.payload, undefined, schemaObj);
  if (!derivationResult.valid) return derivationResult;
  if ((schemaObj.complexType ?? []).some((ct) => ct.name === typeName)) {
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
    const result = validateAnonymousTypeParent(command.payload.typeId, parsed.parentId, schemaObj, "complexType");
    return result.success ? { valid: true } : result.error;
  }

  if (!(schemaObj.complexType ?? []).some((ct) => ct.name === parsed.name)) {
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
    const result = validateAnonymousTypeParent(command.payload.typeId, parsed.parentId, schemaObj, "complexType");
    if (!result.success) return result.error;
    if (command.payload.typeName !== undefined) {
      return {
        valid: false,
        error: "Cannot provide 'typeName' when modifying an anonymous complexType",
      };
    }
    if (command.payload.contentModel !== undefined) {
      const contentModelResult = validateContentModel(command.payload.contentModel, VALID_COMPLEX_TYPE_CONTENT_MODELS);
      if (!contentModelResult.valid) return contentModelResult;
    }
    const derivationKindResult = validateDerivationKind(command.payload.derivationKind);
    if (!derivationKindResult.valid) return derivationKindResult;
    const existing = (result.location.parent as { complexType: ExistingComplexType }).complexType;
    const contentChangeResult = validateComplexTypeContentChange(command.payload, existing, command.payload.typeId);
    if (!contentChangeResult.valid) return contentChangeResult;
    return validateComplexTypeDerivation(command.payload, existing, schemaObj);
  }

  if (command.payload.typeName !== undefined && !isValidXmlName(command.payload.typeName)) {
    return { valid: false, error: "Type name must be a valid XML name" };
  }
  if (command.payload.contentModel !== undefined) {
    const contentModelResult = validateContentModel(command.payload.contentModel, VALID_COMPLEX_TYPE_CONTENT_MODELS);
    if (!contentModelResult.valid) return contentModelResult;
  }
  const derivationKindResult = validateDerivationKind(command.payload.derivationKind);
  if (!derivationKindResult.valid) return derivationKindResult;
  const existing = (schemaObj.complexType ?? []).find((ct) => ct.name === parsed.name);
  if (!existing) {
    return { valid: false, error: `Complex type '${parsed.name}' not found in schema` };
  }
  const contentChangeResult = validateComplexTypeContentChange(command.payload, existing, command.payload.typeId);
  if (!contentChangeResult.valid) return contentChangeResult;
  return validateComplexTypeDerivation(command.payload, existing, schemaObj);
}

