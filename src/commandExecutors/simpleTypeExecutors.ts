/**
 * Executors for simpleType commands.
 * Implements add, remove, and modify operations for simple schema types.
 *
 * Supports both top-level named types and anonymous types embedded within elements or attributes.
 */

import {
  schema,
  AddSimpleTypeCommand,
  RemoveSimpleTypeCommand,
  ModifySimpleTypeCommand,
  RestrictionFacets,
  topLevelSimpleType,
  localSimpleType,
  restrictionType,
  facet,
  numFacet,
  totalDigitsType,
  noFixedFacet,
  whiteSpaceType,
  patternType,
  annotationType,
  documentationType,
} from "../../shared/types";
import { toArray, isSchemaRoot } from "../../shared/schemaUtils";
import { parseSchemaId, SchemaNodeType } from "../../shared/idStrategy";
import { locateNodeById } from "../schemaNavigator";
import { createAnnotation } from "./annotationUtils";
import { renameLocalTypeInSchema } from "./schemaLocalRenamer";

/**
 * Executes an addSimpleType command.
 * When `payload.parentId` points to an element or attribute, creates an anonymous simpleType
 * inside that node. Otherwise creates a top-level named simpleType.
 *
 * @param command - The addSimpleType command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the parent element or attribute is not found (anonymous case)
 */
export function executeAddSimpleType(
  command: AddSimpleTypeCommand,
  schemaObj: schema
): void {
  const { parentId, typeName, baseType, restrictions, documentation } = command.payload;

  if (!isSchemaRoot(parentId)) {
    // Anonymous simpleType inside an element or attribute — isSchemaRoot guarantees parentId is a non-empty string here
    const location = locateNodeById(schemaObj, parentId as string);
    // Both elements and attributes share the same localSimpleType inline child structure
    const holder = location.parent as {
      type_?: string;
      simpleType?: localSimpleType;
      complexType?: unknown;
    };
    const anonType = new localSimpleType();
    anonType.restriction = buildRestriction(baseType, restrictions);
    if (documentation) {
      anonType.annotation = createAnnotation(documentation);
    }
    holder.type_ = undefined;
    holder.complexType = undefined;
    holder.simpleType = anonType;
    return;
  }

  // Top-level named simpleType — typeName is a valid non-empty string here (enforced by the validator)
  const simpleType = new topLevelSimpleType();
  simpleType.name = typeName as string;
  simpleType.restriction = buildRestriction(baseType, restrictions);
  if (documentation) {
    simpleType.annotation = createAnnotation(documentation);
  }

  const simpleTypes = toArray(schemaObj.simpleType);
  simpleTypes.push(simpleType);
  schemaObj.simpleType = simpleTypes;
}

/**
 * Executes a removeSimpleType command.
 * Detects whether the typeId refers to an anonymous simpleType in an element or attribute
 * (nodeType "anonymousSimpleType") or a top-level type and removes it accordingly.
 *
 * @param command - The removeSimpleType command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the type or its parent is not found
 */
export function executeRemoveSimpleType(
  command: RemoveSimpleTypeCommand,
  schemaObj: schema
): void {
  const { typeId } = command.payload;
  const parsed = parseSchemaId(typeId);

  if (parsed.nodeType === SchemaNodeType.AnonymousSimpleType) {
    const parentId = parsed.parentId;
    if (!parentId) {
      return;
    }
    const location = locateNodeById(schemaObj, parentId);
    const holder = location.parent as { simpleType?: localSimpleType };
    holder.simpleType = undefined;
    return;
  }

  // Top-level named simpleType
  const simpleTypes = toArray(schemaObj.simpleType);
  const filtered = simpleTypes.filter((st) => st.name !== parsed.name);
  schemaObj.simpleType = filtered.length > 0 ? filtered : undefined;
}

/**
 * Executes a modifySimpleType command.
 * Detects whether the typeId refers to an anonymous simpleType in an element or attribute
 * or a top-level type and updates it accordingly.
 *
 * @param command - The modifySimpleType command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the type or its parent is not found
 */
export function executeModifySimpleType(
  command: ModifySimpleTypeCommand,
  schemaObj: schema
): void {
  const { typeId, typeName, baseType, restrictions, documentation } = command.payload;
  const parsed = parseSchemaId(typeId);

  if (parsed.nodeType === SchemaNodeType.AnonymousSimpleType) {
    const parentId = parsed.parentId;
    if (!parentId) {
      return;
    }
    const location = locateNodeById(schemaObj, parentId);
    const holder = location.parent as { simpleType?: localSimpleType };
    if (!holder.simpleType) return;
    updateTypeContents(holder.simpleType, baseType, restrictions, documentation);
    return;
  }

  // Top-level named simpleType
  const simpleType = toArray(schemaObj.simpleType).find((st) => st.name === parsed.name);
  if (!simpleType) {
    return;
  }
  if (typeName !== undefined) {
    renameLocalTypeInSchema(parsed.name as string, typeName, schemaObj);
    simpleType.name = typeName;
  }
  updateTypeContents(simpleType, baseType, restrictions, documentation);
}

// ===== Helper Functions =====

/**
 * Builds a new restrictionType with the given base and optional facets.
 *
 * @param base - The base type name
 * @param facets - Optional restriction facets to apply
 * @returns A new restrictionType instance
 */
function buildRestriction(base: string, facets?: RestrictionFacets): restrictionType {
  const restriction = new restrictionType();
  const normalizedBase = base.trim();
  restriction.base = normalizedBase;
  if (facets) {
    applyRestrictionFacets(restriction, facets);
  }
  return restriction;
}

/**
 * Updates the restriction and/or annotation of any simpleType object.
 * Works for both `topLevelSimpleType` and `localSimpleType`.
 *
 * @param simpleType - The simpleType object to update
 * @param baseType - New base type (optional)
 * @param restrictions - New restriction facets (optional)
 * @param documentation - New documentation text (optional)
 */
function updateTypeContents(
  simpleType: { restriction?: restrictionType; annotation?: annotationType },
  baseType?: string,
  restrictions?: RestrictionFacets,
  documentation?: string
): void {
  if (baseType !== undefined || restrictions !== undefined) {
    if (!simpleType.restriction) {
      if (baseType !== undefined) {
        simpleType.restriction = buildRestriction(baseType, restrictions);
      }
    } else {
      if (baseType !== undefined) {
        simpleType.restriction.base = baseType;
      }
      if (restrictions !== undefined) {
        applyRestrictionFacets(simpleType.restriction, restrictions);
      }
    }
  }

  if (documentation !== undefined) {
    if (!simpleType.annotation) {
      simpleType.annotation = new annotationType();
    }
    const doc = new documentationType();
    doc.value = documentation;
    simpleType.annotation.documentation = [doc];
  }
}

/**
 * Applies restriction facets to a restrictionType object.
 * Any previously set facets are cleared and replaced with the provided ones.
 *
 * @param restriction - The restriction object to update
 * @param facets - The new restriction facets to apply
 */
function applyRestrictionFacets(
  restriction: restrictionType,
  facets: RestrictionFacets
): void {
  restriction.minInclusive = undefined;
  restriction.maxInclusive = undefined;
  restriction.minExclusive = undefined;
  restriction.maxExclusive = undefined;
  restriction.length = undefined;
  restriction.minLength = undefined;
  restriction.maxLength = undefined;
  restriction.totalDigits = undefined;
  restriction.fractionDigits = undefined;
  restriction.enumeration = undefined;
  restriction.whiteSpace = undefined;
  restriction.pattern = undefined;

  if (facets.minInclusive !== undefined) {
    const f = new facet();
    f.value = facets.minInclusive;
    restriction.minInclusive = [f];
  }
  if (facets.maxInclusive !== undefined) {
    const f = new facet();
    f.value = facets.maxInclusive;
    restriction.maxInclusive = [f];
  }
  if (facets.minExclusive !== undefined) {
    const f = new facet();
    f.value = facets.minExclusive;
    restriction.minExclusive = [f];
  }
  if (facets.maxExclusive !== undefined) {
    const f = new facet();
    f.value = facets.maxExclusive;
    restriction.maxExclusive = [f];
  }
  if (facets.length !== undefined) {
    const nf = new numFacet();
    nf.value = facets.length;
    restriction.length = [nf];
  }
  if (facets.minLength !== undefined) {
    const nf = new numFacet();
    nf.value = facets.minLength;
    restriction.minLength = [nf];
  }
  if (facets.maxLength !== undefined) {
    const nf = new numFacet();
    nf.value = facets.maxLength;
    restriction.maxLength = [nf];
  }
  if (facets.totalDigits !== undefined) {
    const td = new totalDigitsType();
    td.value = facets.totalDigits;
    restriction.totalDigits = [td];
  }
  if (facets.fractionDigits !== undefined) {
    const nf = new numFacet();
    nf.value = facets.fractionDigits;
    restriction.fractionDigits = [nf];
  }
  if (facets.enumeration !== undefined) {
    restriction.enumeration = facets.enumeration.map((val) => {
      const nff = new noFixedFacet();
      nff.value = val;
      return nff;
    });
  }
  if (facets.whiteSpace !== undefined) {
    const ws = new whiteSpaceType();
    ws.value = facets.whiteSpace;
    restriction.whiteSpace = [ws];
  }
  if (facets.pattern !== undefined) {
    const pt = new patternType();
    pt.value = facets.pattern;
    restriction.pattern = [pt];
  }
}
