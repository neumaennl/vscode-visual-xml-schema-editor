/**
 * Executors for type commands (simple and complex types).
 * Implements add, remove, and modify operations for schema types.
 *
 * Simple type executors are fully implemented.
 * Complex type executors are stubs for Phase 2+ implementation.
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
  topLevelSimpleType,
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
import { toArray } from "../../shared/schemaUtils";
import { parseSchemaId } from "../../shared/idStrategy";

// ===== Simple Type Executors =====

/**
 * Executes an addSimpleType command.
 * Creates a new top-level simple type with a restriction, optional facets, and optional documentation.
 *
 * @param command - The addSimpleType command to execute
 * @param schemaObj - The schema object to modify
 */
export function executeAddSimpleType(
  command: AddSimpleTypeCommand,
  schemaObj: schema
): void {
  const { typeName, baseType, restrictions, documentation } = command.payload;

  const simpleType = new topLevelSimpleType();
  simpleType.name = typeName;

  const restriction = new restrictionType();
  restriction.base = baseType;
  if (restrictions) {
    applyRestrictionFacets(restriction, restrictions);
  }
  simpleType.restriction = restriction;

  if (documentation) {
    simpleType.annotation = createAnnotation(documentation);
  }

  const simpleTypes = toArray(schemaObj.simpleType);
  simpleTypes.push(simpleType);
  schemaObj.simpleType = simpleTypes;
}

/**
 * Executes a removeSimpleType command.
 * Removes an existing top-level simple type identified by its schema ID.
 *
 * @param command - The removeSimpleType command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the simple type is not found
 */
export function executeRemoveSimpleType(
  command: RemoveSimpleTypeCommand,
  schemaObj: schema
): void {
  const { typeId } = command.payload;
  const parsed = parseSchemaId(typeId);
  const typeName = parsed.name;

  const simpleTypes = toArray(schemaObj.simpleType);
  const filtered = simpleTypes.filter((st) => st.name !== typeName);

  if (filtered.length === simpleTypes.length) {
    throw new Error(`SimpleType not found: ${typeName}`);
  }

  schemaObj.simpleType = filtered.length > 0 ? filtered : undefined;
}

/**
 * Executes a modifySimpleType command.
 * Updates an existing top-level simple type's name, base type, restriction facets, or documentation.
 *
 * @param command - The modifySimpleType command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the simple type is not found
 */
export function executeModifySimpleType(
  command: ModifySimpleTypeCommand,
  schemaObj: schema
): void {
  const { typeId, typeName, baseType, restrictions, documentation } = command.payload;
  const parsed = parseSchemaId(typeId);

  const simpleTypes = toArray(schemaObj.simpleType);
  const simpleType = simpleTypes.find((st) => st.name === parsed.name);

  if (!simpleType) {
    throw new Error(`SimpleType not found: ${parsed.name}`);
  }

  if (typeName !== undefined) {
    simpleType.name = typeName;
  }

  if (baseType !== undefined || restrictions !== undefined) {
    if (!simpleType.restriction) {
      if (baseType === undefined) {
        throw new Error(
          `Cannot apply restrictions to SimpleType '${parsed.name}' without a base type`
        );
      }
      simpleType.restriction = new restrictionType();
      simpleType.restriction.base = baseType;
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

// ===== Helper Functions =====

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

/**
 * Creates an annotation containing a single documentation entry.
 *
 * @param text - The documentation text
 * @returns A new annotationType instance with the text
 */
function createAnnotation(text: string): annotationType {
  const annotation = new annotationType();
  const doc = new documentationType();
  doc.value = text;
  annotation.documentation = [doc];
  return annotation;
}

// ===== Complex Type Executors =====

/**
 * Executes an addComplexType command.
 *
 * @param _command - The addComplexType command to execute
 * @param _schemaObj - The schema object to modify
 * @throws Error - Not yet implemented
 */
export function executeAddComplexType(
  _command: AddComplexTypeCommand,
  _schemaObj: schema
): void {
  throw new Error("addComplexType execution not yet implemented");
}

/**
 * Executes a removeComplexType command.
 *
 * @param _command - The removeComplexType command to execute
 * @param _schemaObj - The schema object to modify
 * @throws Error - Not yet implemented
 */
export function executeRemoveComplexType(
  _command: RemoveComplexTypeCommand,
  _schemaObj: schema
): void {
  throw new Error("removeComplexType execution not yet implemented");
}

/**
 * Executes a modifyComplexType command.
 *
 * @param _command - The modifyComplexType command to execute
 * @param _schemaObj - The schema object to modify
 * @throws Error - Not yet implemented
 */
export function executeModifyComplexType(
  _command: ModifyComplexTypeCommand,
  _schemaObj: schema
): void {
  throw new Error("modifyComplexType execution not yet implemented");
}
