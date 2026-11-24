/**
 * Executors for simpleType commands.
 * Implements add, remove, and modify operations for simple schema types.
 *
 * Supports both top-level named types and anonymous types embedded within elements or attributes.
 */

import type {
  schema,
  AddSimpleTypeCommand,
  RemoveSimpleTypeCommand,
  ModifySimpleTypeCommand,
  RestrictionFacets,
  SimpleTypeDerivationKind,
  annotationType,
} from "../../shared/types.js";
import {
  topLevelSimpleType,
  localSimpleType,
  restrictionType,
  listType,
  unionType,
  facet,
  numFacet,
  totalDigitsType,
  noFixedFacet,
  whiteSpaceType,
  patternType,
} from "../../shared/types.js";
import { isSchemaRoot } from "../../shared/schemaUtils.js";
import { assumeValidated } from "./assumeValidated.js";
import { locateModifiedType, placeNewType, removeType } from "./typeTargets.js";
import { createAnnotation } from "./annotationUtils.js";

/**
 * Executes an `addSimpleType` command.
 * When `payload.parentId` points to an element or attribute, creates an anonymous simpleType
 * inside that node. Otherwise creates a top-level named simpleType.
 *
 * @param command - The `addSimpleType` command to execute
 * @param schemaObj - The schema object to modify
 * @throws An {@link Error} if the parent element or attribute is not found (anonymous case)
 */
export function executeAddSimpleType(command: AddSimpleTypeCommand, schemaObj: schema): void {
  const { parentId, typeName, documentation, ...body } = command.payload;
  const simpleType = isSchemaRoot(parentId)
    ? Object.assign(new topLevelSimpleType(), { name: assumeValidated(typeName, "Type name") })
    : new localSimpleType();
  applySimpleTypeBody(simpleType, body, assumeValidated(derivationKindOf(body), "Simple type body"));
  if (documentation) {
    simpleType.annotation = createAnnotation(documentation);
  }
  placeNewType(schemaObj, parentId, "simpleType", simpleType);
}

/**
 * Executes a `removeSimpleType` command.
 * Detects whether the `typeId` refers to an anonymous simpleType in an element or attribute
 * (node type `anonymousSimpleType`) or a top-level type and removes it accordingly.
 *
 * @param command - The `removeSimpleType` command to execute
 * @param schemaObj - The schema object to modify
 * @throws An {@link Error} if the type or its parent is not found
 */
export function executeRemoveSimpleType(command: RemoveSimpleTypeCommand, schemaObj: schema): void {
  removeType(schemaObj, command.payload.typeId, "simpleType");
}

/**
 * Executes a `modifySimpleType` command.
 * Detects whether the `typeId` refers to an anonymous simpleType in an element or attribute
 * or a top-level type and updates it accordingly.
 *
 * @param command - The `modifySimpleType` command to execute
 * @param schemaObj - The schema object to modify
 * @throws An {@link Error} if the type or its parent is not found
 */
export function executeModifySimpleType(command: ModifySimpleTypeCommand, schemaObj: schema): void {
  const { typeId, typeName, ...updates } = command.payload;
  const { type } = locateModifiedType(schemaObj, typeId, "simpleType", typeName);
  updateTypeContents(type, updates);
}

// ===== Helper Functions =====

/**
 * Builds a new `restrictionType` with the given base and optional facets.
 *
 * @param base - The base type name
 * @param facets - Optional restriction facets to apply
 * @returns A new `restrictionType` instance
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
 * Updates the body (restriction, list or union) and/or annotation of any simpleType object.
 * Works for both `topLevelSimpleType` and `localSimpleType`.
 *
 * @param simpleType - The simpleType object to update
 * @param updates - The new base type, list item type, union member types and restriction facets; each is
 *   optional, and without them the body stays as it is
 */
function updateTypeContents(
  simpleType: { restriction?: restrictionType; list?: listType; union?: unionType; annotation?: annotationType },
  updates: {
    baseType?: string;
    listItemType?: string;
    unionMemberTypes?: string[];
    restrictions?: RestrictionFacets;
  }
): void {
  const { baseType, listItemType, unionMemberTypes, restrictions } = updates;

  // Without body fields, the body stays as it is
  const body = { baseType, listItemType, unionMemberTypes, restrictions };
  const derivationKind = derivationKindOf(body);
  if (derivationKind) {
    applySimpleTypeBody(simpleType, body, derivationKind);
  }
}

/**
 * Returns the kind of body that the body fields of a payload describe. The validator ensures that
 * they describe at most one kind.
 *
 * @param body - The body fields of the payload
 * @returns The kind, or `undefined` if the payload has no body fields
 */
function derivationKindOf(body: {
  baseType?: string;
  listItemType?: string;
  unionMemberTypes?: string[];
  restrictions?: RestrictionFacets;
}): SimpleTypeDerivationKind | undefined {
  if (body.listItemType !== undefined) return "list";
  if (body.unionMemberTypes !== undefined) return "union";
  if (body.baseType !== undefined || body.restrictions !== undefined) return "restriction";
  return undefined;
}

/**
 * Replaces the body of a simple type with a body of the given kind.
 *
 * @param simpleType - The simple type to change
 * @param updates - The body fields of the payload
 * @param derivationKind - The kind of the new body
 */
function applySimpleTypeBody(
  simpleType: { restriction?: restrictionType; list?: listType; union?: unionType },
  updates: {
    baseType?: string;
    listItemType?: string;
    unionMemberTypes?: string[];
    restrictions?: RestrictionFacets;
  },
  derivationKind: SimpleTypeDerivationKind
): void {
  const { baseType, listItemType, unionMemberTypes, restrictions } = updates;

  if (derivationKind === "list") {
    simpleType.list ??= new listType();
    simpleType.list.itemType = assumeValidated(listItemType, "List item type").trim();
    simpleType.list.simpleType = undefined;
    simpleType.restriction = undefined;
    simpleType.union = undefined;
    return;
  }

  if (derivationKind === "union") {
    simpleType.union ??= new unionType();
    simpleType.union.memberTypes = assumeValidated(unionMemberTypes, "Union member types")
      .map((memberType) => memberType.trim())
      .join(" ");
    simpleType.union.simpleType = undefined;
    simpleType.restriction = undefined;
    simpleType.list = undefined;
    return;
  }

  if (!simpleType.restriction) {
    simpleType.restriction = buildRestriction(assumeValidated(baseType, "Base type"), restrictions);
  } else {
    // Without a base type, the restriction keeps its base, which may be an inline simple type
    if (baseType !== undefined) {
      simpleType.restriction.base = baseType.trim();
      simpleType.restriction.simpleType = undefined;
    }
    if (restrictions !== undefined) {
      applyRestrictionFacets(simpleType.restriction, restrictions);
    }
  }
  simpleType.list = undefined;
  simpleType.union = undefined;
}

/** The class of the elements of each facet of a restriction. */
const FACET_CLASSES = {
  minInclusive: facet,
  maxInclusive: facet,
  minExclusive: facet,
  maxExclusive: facet,
  length: numFacet,
  minLength: numFacet,
  maxLength: numFacet,
  totalDigits: totalDigitsType,
  fractionDigits: numFacet,
  enumeration: noFixedFacet,
  whiteSpace: whiteSpaceType,
  pattern: patternType,
} satisfies Record<keyof RestrictionFacets, new () => object>;

/**
 * Applies restriction facets to a `restrictionType` object.
 * Any previously set facets are cleared and replaced with the provided ones.
 *
 * @param restriction - The restriction object to update
 * @param facets - The new restriction facets to apply
 */
function applyRestrictionFacets(restriction: restrictionType, facets: RestrictionFacets): void {
  // Facets with a list of values (enumeration, pattern) get one element per value
  const facetElements = restriction as Record<keyof RestrictionFacets, object[] | undefined>;
  for (const key of Object.keys(FACET_CLASSES) as Array<keyof RestrictionFacets>) {
    const value = facets[key];
    const values = value === undefined ? undefined : Array.isArray(value) ? value : [value];
    facetElements[key] = values?.map((v) => Object.assign(new FACET_CLASSES[key](), { value: v }));
  }
}
