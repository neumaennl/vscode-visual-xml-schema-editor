/**
 * Executors for type commands (simple and complex types).
 * Implements add, remove, and modify operations for schema types.
 *
 * Simple type executors support both top-level named types and anonymous types
 * embedded within elements.
 * Complex type executors support both top-level named types and anonymous types
 * embedded within elements, with content models (sequence, choice, all),
 * abstract/mixed flags, base type extension, and documentation.
 */

import {
  schema,
  AddSimpleTypeCommand,
  RemoveSimpleTypeCommand,
  ModifySimpleTypeCommand,
  AddComplexTypeCommand,
  RemoveComplexTypeCommand,
  ModifyComplexTypeCommand,
  ContentModel,
  RestrictionFacets,
  topLevelSimpleType,
  localSimpleType,
  topLevelComplexType,
  localComplexType,
  complexContentType,
  extensionType,
  explicitGroup,
  all,
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

// ===== Simple Type Executors =====

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
    const holder = location.parent as { simpleType?: localSimpleType };
    const anonType = new localSimpleType();
    anonType.restriction = buildRestriction(baseType, restrictions);
    if (documentation) {
      anonType.annotation = createAnnotation(documentation);
    }
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
    updateTypeContents(holder.simpleType!, baseType, restrictions, documentation);
    return;
  }

  // Top-level named simpleType
  const simpleType = toArray(schemaObj.simpleType).find((st) => st.name === parsed.name);
  if (!simpleType) {
    return;
  }
  if (typeName !== undefined) {
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
 * @throws Error if restrictions are provided but no base type exists
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

// ===== Complex Type Executors =====

/**
 * Executes an addComplexType command.
 * When `payload.parentId` points to an element (not schema root), creates an anonymous
 * complexType inside that element. Otherwise creates a top-level named complexType.
 * When `baseType` is provided the content model is nested inside a
 * `complexContent > extension` wrapper.
 *
 * @param command - The addComplexType command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the parent element is not found (anonymous case)
 */
export function executeAddComplexType(
  command: AddComplexTypeCommand,
  schemaObj: schema
): void {
  const { parentId, typeName, contentModel, abstract: isAbstract, baseType, mixed, documentation } =
    command.payload;

  if (!isSchemaRoot(parentId)) {
    // Anonymous complexType inside an element — isSchemaRoot guarantees parentId is a non-empty string here
    const location = locateNodeById(schemaObj, parentId as string);
    const holder = location.parent as { complexType?: localComplexType };
    const anonType = new localComplexType();
    if (mixed !== undefined) {
      anonType.mixed = mixed;
    }
    if (documentation) {
      anonType.annotation = createAnnotation(documentation);
    }
    applyContentStructure(anonType, contentModel, baseType);
    holder.complexType = anonType;
    return;
  }

  // Top-level named complexType — typeName is a valid non-empty string here (enforced by the validator)
  const ct = new topLevelComplexType();
  ct.name = typeName as string;
  if (isAbstract !== undefined) {
    ct.abstract = isAbstract;
  }
  if (mixed !== undefined) {
    ct.mixed = mixed;
  }
  if (documentation) {
    ct.annotation = createAnnotation(documentation);
  }
  applyContentStructure(ct, contentModel, baseType);

  const complexTypes = toArray(schemaObj.complexType);
  complexTypes.push(ct);
  schemaObj.complexType = complexTypes;
}

/**
 * Executes a removeComplexType command.
 * Detects whether the typeId refers to an anonymous complexType in an element
 * (nodeType "anonymousComplexType") or a top-level type and removes it accordingly.
 *
 * @param command - The removeComplexType command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the type or its parent is not found
 */
export function executeRemoveComplexType(
  command: RemoveComplexTypeCommand,
  schemaObj: schema
): void {
  const { typeId } = command.payload;
  const parsed = parseSchemaId(typeId);

  if (parsed.nodeType === SchemaNodeType.AnonymousComplexType) {
    const parentId = parsed.parentId;
    if (!parentId) {
      return;
    }
    const location = locateNodeById(schemaObj, parentId);
    const holder = location.parent as { complexType?: localComplexType };
    holder.complexType = undefined;
    return;
  }

  // Top-level named complexType
  const complexTypes = toArray(schemaObj.complexType);
  const filtered = complexTypes.filter((ct) => ct.name !== parsed.name);
  schemaObj.complexType = filtered.length > 0 ? filtered : undefined;
}

/**
 * Executes a modifyComplexType command.
 * Detects whether the typeId refers to an anonymous complexType in an element
 * or a top-level type and updates it accordingly.
 *
 * @param command - The modifyComplexType command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the type or its parent is not found
 */
export function executeModifyComplexType(
  command: ModifyComplexTypeCommand,
  schemaObj: schema
): void {
  const { typeId, typeName, contentModel, abstract: isAbstract, baseType, mixed, documentation } =
    command.payload;
  const parsed = parseSchemaId(typeId);

  if (parsed.nodeType === SchemaNodeType.AnonymousComplexType) {
    const parentId = parsed.parentId;
    if (!parentId) {
      return;
    }
    const location = locateNodeById(schemaObj, parentId);
    const holder = location.parent as { complexType?: localComplexType };
    updateComplexTypeContents(holder.complexType!, { mixed, contentModel, baseType, documentation });
    return;
  }

  // Top-level named complexType
  const ct = toArray(schemaObj.complexType).find((t) => t.name === parsed.name);
  if (!ct) {
    return;
  }

  if (typeName !== undefined) {
    ct.name = typeName;
  }
  if (isAbstract !== undefined) {
    ct.abstract = isAbstract;
  }
  updateComplexTypeContents(ct, { mixed, contentModel, baseType, documentation });
}

// ===== Complex Type Helper Functions =====

/** Structural type shared by topLevelComplexType and localComplexType for content operations. */
type ComplexTypeHolder = {
  mixed?: boolean;
  annotation?: annotationType;
  sequence?: explicitGroup;
  choice?: explicitGroup;
  all?: all;
  complexContent?: complexContentType;
};

/**
 * Updates the shared mutable properties of any complexType object
 * (works for both `topLevelComplexType` and `localComplexType`).
 *
 * @param ct - The complexType object to update
 * @param updates - The properties to apply
 */
function updateComplexTypeContents(
  ct: ComplexTypeHolder,
  updates: {
    mixed?: boolean;
    contentModel?: ContentModel;
    baseType?: string;
    documentation?: string;
  }
): void {
  const { mixed, contentModel, baseType, documentation } = updates;
  if (mixed !== undefined) {
    ct.mixed = mixed;
  }
  if (documentation !== undefined) {
    if (!ct.annotation) {
      ct.annotation = new annotationType();
    }
    const doc = new documentationType();
    doc.value = documentation;
    ct.annotation.documentation = [doc];
  }
  if (contentModel !== undefined || baseType !== undefined) {
    const effectiveBase = baseType !== undefined ? baseType : getBaseType(ct);
    const effectiveModel = contentModel ?? getContentModel(ct);
    if (effectiveModel) {
      applyContentStructure(ct, effectiveModel, effectiveBase);
    }
  }
}

/**
 * Sets one of the three compositor children (sequence, choice, all) on a holder object.
 *
 * @param holder - Object that carries sequence/choice/all properties
 * @param contentModel - The content model to apply
 */
function setContentModel(
  holder: { sequence?: explicitGroup; choice?: explicitGroup; all?: all },
  contentModel: ContentModel
): void {
  if (contentModel === "sequence") {
    holder.sequence = new explicitGroup();
  } else if (contentModel === "choice") {
    holder.choice = new explicitGroup();
  } else {
    holder.all = new all();
  }
}

/**
 * Rebuilds the full content structure (direct compositor or complexContent wrapper)
 * on a complexType holder, clearing any previously set content first.
 *
 * @param ct - The complexType holder to update
 * @param contentModel - The content model to apply
 * @param baseType - Optional base type; when truthy wraps the compositor in
 *   a complexContent/extension element
 */
function applyContentStructure(
  ct: ComplexTypeHolder,
  contentModel: ContentModel,
  baseType?: string
): void {
  ct.sequence = undefined;
  ct.choice = undefined;
  ct.all = undefined;
  ct.complexContent = undefined;

  if (baseType) {
    const ext = new extensionType();
    ext.base = baseType;
    setContentModel(ext, contentModel);
    const cc = new complexContentType();
    cc.extension = ext;
    ct.complexContent = cc;
  } else {
    setContentModel(ct, contentModel);
  }
}

/**
 * Returns the base type of a complexType if it uses complexContent/extension.
 *
 * @param ct - The complexType holder to inspect
 * @returns The base type name or undefined
 */
function getBaseType(ct: ComplexTypeHolder): string | undefined {
  return ct.complexContent?.extension?.base;
}

/**
 * Infers the current content model of a complexType by inspecting its
 * direct compositor properties and complexContent/extension child.
 *
 * @param ct - The complexType holder to inspect
 * @returns The current ContentModel or undefined if none is set
 */
function getContentModel(ct: ComplexTypeHolder): ContentModel | undefined {
  if (ct.sequence ?? ct.complexContent?.extension?.sequence) {
    return "sequence";
  }
  if (ct.choice ?? ct.complexContent?.extension?.choice) {
    return "choice";
  }
  if (ct.all ?? ct.complexContent?.extension?.all) {
    return "all";
  }
  return undefined;
}
