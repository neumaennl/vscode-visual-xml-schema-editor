/**
 * Validators for simple type commands.
 */

import {
  schema,
  AddSimpleTypeCommand,
  RemoveSimpleTypeCommand,
  ModifySimpleTypeCommand,
  RestrictionFacets,
  SimpleTypeDerivationKind,
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

/** Container types that may hold an anonymous simpleType inline. */
const INLINE_SIMPLE_TYPE_PARENT_TYPES = ["topLevelElement", "localElement", "topLevelAttribute", "attribute"];

function hasRestrictionFacetValues(restrictions: RestrictionFacets): boolean {
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
  existingBodyKind: SimpleTypeDerivationKind | undefined,
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
      error: `Base type: ${baseTypeResult.error}`,
    };
  }
  return { valid: true };
}

/**
 * Returns the kind of the body of an existing simple type.
 *
 * @param simpleType - The simple type
 * @returns The kind, or `undefined` for a simple type without a body, which is not valid XSD
 */
function bodyKindOf(simpleType: { restriction?: unknown; list?: unknown; union?: unknown }): SimpleTypeDerivationKind | undefined {
  if (simpleType.restriction) return "restriction";
  if (simpleType.list) return "list";
  if (simpleType.union) return "union";
  return undefined;
}

function validateSimpleTypeBody(
  payload: {
    baseType?: string;
    listItemType?: string;
    unionMemberTypes?: string[];
    restrictions?: RestrictionFacets;
  },
  schemaObj: schema,
  existingBodyKind?: SimpleTypeDerivationKind
): ValidationResult {
  const hasRestrictionBody = payload.baseType !== undefined || payload.restrictions !== undefined;
  const hasListBody = payload.listItemType !== undefined;
  const hasUnionBody = payload.unionMemberTypes !== undefined;
  const bodyKinds = [hasRestrictionBody ? "restriction" : null, hasListBody ? "list" : null, hasUnionBody ? "union" : null].filter(Boolean) as Array<SimpleTypeDerivationKind>;

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
        error: `List item type: ${listTypeResult.error}`,
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
    // validateAnonymousTypeParent() has checked that the parent has an anonymous simpleType
    const existingSimpleType = (result.location.parent as { simpleType: { restriction?: unknown; list?: unknown; union?: unknown } }).simpleType;
    const bodyValidation = validateSimpleTypeBody(
      command.payload,
      schemaObj,
      bodyKindOf(existingSimpleType)
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
    bodyKindOf(existingSimpleType)
  );
  if (!bodyValidation.valid) {
    return bodyValidation;
  }
  return { valid: true };
}
