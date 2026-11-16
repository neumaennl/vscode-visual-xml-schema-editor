/**
 * Validators for simple type commands.
 */

import type {
  schema,
  AddSimpleTypeCommand,
  RemoveSimpleTypeCommand,
  ModifySimpleTypeCommand,
  RestrictionFacets,
  SimpleTypeDerivationKind,
} from "../../shared/types.js";
import type { ValidationResult } from "./validationUtils.js";
import { isValidXmlName, validateElementType } from "./validationUtils.js";
import { isSchemaRoot } from "../../shared/schemaUtils.js";
import { locateType, validateInlineTypeParent, validateNewTypeName } from "./commonValidators.js";

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
  const bodyKinds = [hasRestrictionBody ? "restriction" : null, hasListBody ? "list" : null, hasUnionBody ? "union" : null].filter(Boolean) as SimpleTypeDerivationKind[];

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
    const parentResult = validateInlineTypeParent(parentId as string, schemaObj, "simpleType", INLINE_SIMPLE_TYPE_PARENT_TYPES);
    if (!parentResult.valid) {
      return parentResult;
    }
  } else if (!isValidXmlName(typeName ?? "")) {
    return { valid: false, error: "Type name must be a valid XML name" };
  } else if ((schemaObj.simpleType ?? []).some(st => st.name === typeName)) {
    return { valid: false, error: `Simple type '${typeName}' already exists in schema` };
  }
  return validateSimpleTypeBody(command.payload, schemaObj);
}

export function validateRemoveSimpleType(
  command: RemoveSimpleTypeCommand,
  schemaObj: schema
): ValidationResult {
  // TODO Phase 2: Check if type is being used by other elements/types
  const located = locateType(command.payload.typeId, schemaObj, "simpleType", schemaObj.simpleType);
  return located.valid ? { valid: true } : located;
}

export function validateModifySimpleType(
  command: ModifySimpleTypeCommand,
  schemaObj: schema
): ValidationResult {
  const { typeId, typeName } = command.payload;
  const located = locateType(typeId, schemaObj, "simpleType", schemaObj.simpleType);
  if (!located.valid) {
    return located;
  }
  const nameResult = validateNewTypeName(typeName, located, "simpleType");
  if (!nameResult.valid) {
    return nameResult;
  }
  return validateSimpleTypeBody(command.payload, schemaObj, bodyKindOf(located.type));
}
