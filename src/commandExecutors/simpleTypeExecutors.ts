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
  SimpleTypeDerivationKind,
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
  annotationType,
  documentationType,
} from "../../shared/types.js";
import { isSchemaRoot } from "../../shared/schemaUtils.js";
import { parseSchemaId, SchemaNodeType } from "../../shared/idStrategy.js";
import { assumeRemoved, assumeValidated, locateValidated } from "./assumeValidated.js";
import { createAnnotation } from "./annotationUtils.js";
import { renameLocalTypeInSchema } from "./schemaLocalRenamer.js";

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
  const {
    parentId,
    typeName,
    baseType,
    listItemType,
    unionMemberTypes,
    restrictions,
    documentation,
  } = command.payload;

  if (!isSchemaRoot(parentId)) {
    // Anonymous simpleType inside an element or attribute — isSchemaRoot guarantees parentId is a non-empty string here
    const location = locateValidated(schemaObj, parentId as string);
    // Both elements and attributes share the same localSimpleType inline child structure
    const holder = location.parent as {
      type_?: string;
      simpleType?: localSimpleType;
      complexType?: unknown;
    };
    const anonType = new localSimpleType();
    const anonBody = {
      baseType,
      listItemType,
      unionMemberTypes,
      restrictions,
    };
    applySimpleTypeBody(anonType, anonBody, assumeValidated(derivationKindOf(anonBody), "Simple type body"));
    if (documentation) {
      anonType.annotation = createAnnotation(documentation);
    }
    holder.type_ = undefined;
    holder.complexType = undefined;
    holder.simpleType = anonType;
    return;
  }

  // Top-level named simpleType
  const simpleType = new topLevelSimpleType();
  simpleType.name = assumeValidated(typeName, "Type name");
  const namedBody = {
    baseType,
    listItemType,
    unionMemberTypes,
    restrictions,
  };
  applySimpleTypeBody(simpleType, namedBody, assumeValidated(derivationKindOf(namedBody), "Simple type body"));
  if (documentation) {
    simpleType.annotation = createAnnotation(documentation);
  }

  const simpleTypes = schemaObj.simpleType ?? [];
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
    const location = locateValidated(schemaObj, assumeValidated(parsed.parentId, `Parent of ${typeId}`));
    const holder = location.parent as { simpleType?: localSimpleType };
    assumeValidated(holder.simpleType, `Simple type ${typeId}`);
    holder.simpleType = undefined;
    return;
  }

  // Top-level named simpleType
  const simpleTypes = schemaObj.simpleType ?? [];
  const filtered = assumeRemoved(
    simpleTypes,
    simpleTypes.filter((st) => st.name !== parsed.name),
    `Simple type ${typeId}`
  );
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
  const {
    typeId,
    typeName,
    baseType,
    listItemType,
    unionMemberTypes,
    restrictions,
    documentation,
  } = command.payload;
  const parsed = parseSchemaId(typeId);

  if (parsed.nodeType === SchemaNodeType.AnonymousSimpleType) {
    const location = locateValidated(schemaObj, assumeValidated(parsed.parentId, `Parent of ${typeId}`));
    const holder = location.parent as { simpleType?: localSimpleType };
    updateTypeContents(assumeValidated(holder.simpleType, `Simple type ${typeId}`), {
      baseType,
      listItemType,
      unionMemberTypes,
      restrictions,
      documentation,
    });
    return;
  }

  // Top-level named simpleType
  const simpleType = assumeValidated(
    (schemaObj.simpleType ?? []).find((st) => st.name === parsed.name),
    `Simple type ${typeId}`
  );
  if (typeName !== undefined) {
    renameLocalTypeInSchema(simpleType.name, typeName, schemaObj);
    simpleType.name = typeName;
  }
  updateTypeContents(simpleType, {
    baseType,
    listItemType,
    unionMemberTypes,
    restrictions,
    documentation,
  });
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
  simpleType: { restriction?: restrictionType; list?: listType; union?: unionType; annotation?: annotationType },
  updates: {
    baseType?: string;
    listItemType?: string;
    unionMemberTypes?: string[];
    restrictions?: RestrictionFacets;
    documentation?: string;
  }
): void {
  const {
    baseType,
    listItemType,
    unionMemberTypes,
    restrictions,
    documentation,
  } = updates;

  // Without body fields, the body stays as it is
  const body = { baseType, listItemType, unionMemberTypes, restrictions };
  const derivationKind = derivationKindOf(body);
  if (derivationKind) {
    applySimpleTypeBody(simpleType, body, derivationKind);
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
    if (!simpleType.list) {
      simpleType.list = new listType();
    }
    simpleType.list.itemType = assumeValidated(listItemType, "List item type").trim();
    simpleType.list.simpleType = undefined;
    simpleType.restriction = undefined;
    simpleType.union = undefined;
    return;
  }

  if (derivationKind === "union") {
    if (!simpleType.union) {
      simpleType.union = new unionType();
    }
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
    restriction.pattern = facets.pattern.map((val) => {
      const pt = new patternType();
      pt.value = val;
      return pt;
    });
  }
}
