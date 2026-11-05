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
  RestrictionFacets,
} from "../../shared/types.js";
import {
  ValidationResult,
  isValidXmlName,
  validateElementType,
} from "./validationUtils.js";
import { parseSchemaId, SchemaNodeType } from "../../shared/idStrategy.js";
import { isSchemaRoot } from "../../shared/schemaUtils.js";
import { locateNodeById, NodeLocation } from "../schemaNavigator.js";

function hasRestrictionFacetValues(restrictions: RestrictionFacets | undefined): boolean {
  if (!restrictions) {
    return false;
  }
  return Object.values(restrictions).some((value) => {
    if (value === undefined || value === null) {
      return false;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return true;
  });
}

/**
 * Validates the facets of a restriction body.
 *
 * @param restrictions - The `restrictions` of the payload
 * @returns The validation result; a body without `restrictions` is valid
 */
function validateRestrictionFacets(restrictions: RestrictionFacets | undefined): ValidationResult {
  if (restrictions !== undefined && !hasRestrictionFacetValues(restrictions)) {
    return { valid: false, error: "Restriction simpleType body must include at least one facet" };
  }
  return { valid: true };
}

/**
 * Validates the base type of a new restriction body.
 *
 * @param baseTypeField - The `baseType` of the payload
 * @param existingBodyKind - The kind of the current body, or `undefined` if the type is new
 * @param schemaObj - The schema, to resolve the base type
 * @returns The validation result
 */
function validateRestrictionBaseType(
  baseTypeField: string | undefined,
  existingBodyKind: "restriction" | "list" | "union" | undefined,
  schemaObj: schema
): ValidationResult {
  if (baseTypeField === undefined && existingBodyKind !== undefined) {
    return { valid: false, error: "Cannot apply restrictions without a base type" };
  }
  const baseType = (baseTypeField ?? "").trim();
  if (!baseType) {
    return { valid: false, error: "Base type cannot be empty" };
  }
  const baseTypeResult = validateElementType(baseType, schemaObj);
  if (!baseTypeResult.valid) {
    return {
      valid: false,
      error: baseTypeResult.error ? `Base type: ${baseTypeResult.error}` : `Base type '${baseType}' is not a recognized XSD type`,
    };
  }
  return { valid: true };
}

function validateSimpleTypeBody(
  payload: {
    baseType?: string;
    listItemType?: string;
    unionMemberTypes?: string[];
    restrictions?: RestrictionFacets;
  },
  schemaObj: schema,
  existingBodyKind?: "restriction" | "list" | "union"
): ValidationResult {
  const hasRestrictionBody = payload.baseType !== undefined || payload.restrictions !== undefined;
  const hasListBody = payload.listItemType !== undefined;
  const hasUnionBody = payload.unionMemberTypes !== undefined;
  const bodyKinds = [hasRestrictionBody ? "restriction" : null, hasListBody ? "list" : null, hasUnionBody ? "union" : null].filter(Boolean) as Array<"restriction" | "list" | "union">;

  if (bodyKinds.length === 0) {
    return existingBodyKind
      ? { valid: true }
      : { valid: false, error: "Simple type body is required" };
  }

  if (bodyKinds.length > 1) {
    return { valid: false, error: "Simple type body must be specified as exactly one of restriction, list, or union" };
  }

  const derivationKind = bodyKinds[0];
  if (derivationKind === "restriction") {
    // Facets without a base type keep the base of an existing restriction
    if (payload.baseType !== undefined || existingBodyKind !== "restriction") {
      const baseTypeResult = validateRestrictionBaseType(payload.baseType, existingBodyKind, schemaObj);
      if (!baseTypeResult.valid) {
        return baseTypeResult;
      }
    }
    return validateRestrictionFacets(payload.restrictions);
  }

  if (derivationKind === "list") {
    const listItemType = payload.listItemType?.trim() ?? "";
    if (!listItemType) {
      return { valid: false, error: "List item type cannot be empty" };
    }
    const listTypeResult = validateElementType(listItemType, schemaObj);
    if (!listTypeResult.valid) {
      return {
        valid: false,
        error: listTypeResult.error ? `List item type: ${listTypeResult.error}` : `List item type '${listItemType}' is not a recognized XSD type`,
      };
    }
    return { valid: true };
  }

  if (!payload.unionMemberTypes || payload.unionMemberTypes.length === 0) {
    return { valid: false, error: "Union member types cannot be empty" };
  }

  for (const memberType of payload.unionMemberTypes) {
    const trimmed = memberType.trim();
    if (!trimmed) {
      return { valid: false, error: "Union member types cannot contain empty entries" };
    }

    const typeResult = validateElementType(trimmed, schemaObj);
    if (!typeResult.valid) {
      return {
        valid: false,
        error: `Union member type '${trimmed}' is not a recognized type`,
      };
    }
  }

  return { valid: true };
}

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

/** Container types that may hold an anonymous simpleType inline. */
const INLINE_SIMPLE_TYPE_PARENT_TYPES = ["topLevelElement", "localElement", "topLevelAttribute", "attribute"];

/** Container types that may hold an anonymous complexType inline. */
const INLINE_COMPLEX_TYPE_PARENT_TYPES = ["topLevelElement", "localElement"];

/**
 * Validates that an anonymous type's parent exists and carries the expected property.
 *
 * @param typeId - The full ID of the anonymous type (used in error messages).
 * @param parentId - The ID of the parent container element/attribute.
 * @param schemaObj - The root schema object to search.
 * @param prop - The property name to check and use in error messages (e.g. `"simpleType"` or `"complexType"`).
 * @returns `{ success: true, location }` when valid; `{ success: false, error }` otherwise.
 */
function validateAnonymousTypeParent(
  typeId: string,
  parentId: string | undefined,
  schemaObj: schema,
  prop: string
): { success: false; error: ValidationResult } | { success: true; location: Extract<NodeLocation, { found: true }> } {
  if (!parentId) {
    return { success: false, error: { valid: false, error: `Invalid anonymous ${prop} ID: ${typeId}` } };
  }
  const location = locateNodeById(schemaObj, parentId);
  if (!location.found) {
    return { success: false, error: { valid: false, error: `Parent not found: ${parentId}` } };
  }
  const holder = location.parent as Record<string, unknown>;
  if (!holder[prop]) {
    return {
      success: false,
      error: {
        valid: false,
        error: `No anonymous ${prop} found in parent: ${parentId}`,
      },
    };
  }
  return { success: true, location };
}

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
        error: baseTypeResult.error ? `Base type: ${baseTypeResult.error}` : `Base type '${baseType}' is not a recognized type`,
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

// ===== SimpleType Command Validation =====

export function validateAddSimpleType(
  command: AddSimpleTypeCommand,
  schemaObj: schema
): ValidationResult {
  const { parentId, typeName } = command.payload;

  if (!isSchemaRoot(parentId)) {
    // Anonymous simpleType inside an element or attribute — isSchemaRoot guarantees parentId is a non-empty string here
    const location = locateNodeById(schemaObj, parentId as string);
    if (!location.found) {
      return { valid: false, error: `Parent not found: ${parentId}` };
    }
    if (!INLINE_SIMPLE_TYPE_PARENT_TYPES.includes(location.parentType)) {
      return {
        valid: false,
        error: `Parent of type '${location.parentType}' cannot contain a simpleType`,
      };
    }
    const holder = location.parent as { ref?: string; type_?: string; simpleType?: unknown };
    if (holder.ref) {
      return {
        valid: false,
        error: `'${parentId}' has a ref attribute and cannot carry an inline simpleType`,
      };
    }
    if (holder.simpleType) {
      return { valid: false, error: `'${parentId}' already has an anonymous simpleType` };
    }
    const bodyValidation = validateSimpleTypeBody(command.payload, schemaObj);
    if (!bodyValidation.valid) {
      return bodyValidation;
    }
    return { valid: true };
  }

  // Top-level named simpleType
  if (!isValidXmlName(typeName ?? "")) {
    return { valid: false, error: "Type name must be a valid XML name" };
  }

  if ((schemaObj.simpleType ?? []).some(st => st.name === typeName)) {
    return { valid: false, error: `Simple type '${typeName}' already exists in schema` };
  }
  const bodyValidation = validateSimpleTypeBody(command.payload, schemaObj);
  if (!bodyValidation.valid) {
    return bodyValidation;
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
    const result = validateAnonymousTypeParent(command.payload.typeId, parsed.parentId, schemaObj, "simpleType");
    return result.success ? { valid: true } : result.error;
  }

  // TODO Phase 2: Check if type is being used by other elements/types
  // Top-level named simpleType: check it exists
  if (!(schemaObj.simpleType ?? []).some(st => st.name === parsed.name)) {
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
    const result = validateAnonymousTypeParent(command.payload.typeId, parsed.parentId, schemaObj, "simpleType");
    if (!result.success) return result.error;
    const location = result.location;
    const existingSimpleType = (location.parent as { simpleType?: { restriction?: unknown; list?: unknown; union?: unknown } }).simpleType;
    if (!existingSimpleType) {
      return { valid: false, error: `No anonymous simpleType found in parent: ${parsed.parentId}` };
    }
    const bodyValidation = validateSimpleTypeBody(
      command.payload,
      schemaObj,
      existingSimpleType.restriction ? "restriction" : existingSimpleType.list ? "list" : existingSimpleType.union ? "union" : undefined
    );
    if (!bodyValidation.valid) {
      return bodyValidation;
    }
    if (command.payload.typeName !== undefined) {
      return {
        valid: false,
        error: "Cannot provide 'typeName' when modifying an anonymous simpleType",
      };
    }
    return { valid: true };
  }

  const existingSimpleType = (schemaObj.simpleType ?? []).find(st => st.name === parsed.name);
  if (!existingSimpleType) {
    return { valid: false, error: `Simple type '${parsed.name}' not found in schema` };
  }

  const bodyValidation = validateSimpleTypeBody(
    command.payload,
    schemaObj,
    existingSimpleType.restriction ? "restriction" : existingSimpleType.list ? "list" : existingSimpleType.union ? "union" : undefined
  );
  if (!bodyValidation.valid) {
    return bodyValidation;
  }
  return { valid: true };
}

// ===== ComplexType Command Validation =====

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
