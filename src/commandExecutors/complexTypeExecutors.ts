/**
 * Executors for complexType commands.
 * Implements add, remove, and modify operations for complex schema types.
 *
 * Supports both top-level named types and anonymous types embedded within elements,
 * with content models (sequence, choice, all), abstract/mixed flags, base type
 * extension, and documentation.
 */

import type {
  schema,
  AddComplexTypeCommand,
  RemoveComplexTypeCommand,
  ModifyComplexTypeCommand,
  ContentModel,
  ComplexTypeDerivationKind,
  groupRef,
  annotationType,
  attribute,
  attributeGroupRef,
  wildcard,
} from "../../shared/types.js";
import {
  topLevelComplexType,
  localComplexType,
  complexContentType,
  complexRestrictionType,
  extensionType,
  explicitGroup,
  all
} from "../../shared/types.js";
import { getContentContainer, getContentDerivation, isSchemaRoot } from "../../shared/schemaUtils.js";
import { assumeValidated } from "./assumeValidated.js";
import { assignDefined } from "./nodeProperties.js";
import { locateModifiedType, placeNewType, removeType } from "./typeTargets.js";
import { createAnnotation, setDocumentation } from "./annotationUtils.js";

/** Structural type shared by `topLevelComplexType` and `localComplexType` for content operations. */
interface ComplexTypeHolder {
  mixed?: boolean;
  annotation?: annotationType;
  group?: groupRef;
  sequence?: explicitGroup;
  choice?: explicitGroup;
  all?: all;
  attribute?: attribute[];
  attributeGroup?: attributeGroupRef[];
  anyAttribute?: wildcard;
  complexContent?: complexContentType;
}

interface ComplexTypeContentState {
  group?: groupRef;
  sequence?: explicitGroup;
  choice?: explicitGroup;
  all?: all;
  attribute?: attribute[];
  attributeGroup?: attributeGroupRef[];
  anyAttribute?: wildcard;
}

/**
 * Executes an `addComplexType` command.
 * When `payload.parentId` points to an element (not schema root), creates an anonymous
 * complexType inside that element. Otherwise creates a top-level named complexType.
 * When `baseType` is provided the content model is nested inside a
 * `complexContent > extension` wrapper.
 *
 * @param command - The `addComplexType` command to execute
 * @param schemaObj - The schema object to modify
 * @throws An {@link Error} if the parent element is not found (anonymous case)
 */
export function executeAddComplexType(
  command: AddComplexTypeCommand,
  schemaObj: schema
): void {
  const { parentId, typeName, contentModel, abstract: isAbstract, baseType, derivationKind, mixed, documentation } =
    command.payload;
  const ct = isSchemaRoot(parentId)
    ? assignDefined(new topLevelComplexType(), { name: assumeValidated(typeName, "Type name"), abstract: isAbstract })
    : new localComplexType();
  assignDefined(ct, { mixed });
  if (documentation) {
    ct.annotation = createAnnotation(documentation);
  }
  applyContentStructure(ct, contentModel, baseType, derivationKind);
  placeNewType(schemaObj, parentId, "complexType", ct);
}

/**
 * Executes a `removeComplexType` command.
 * Detects whether the `typeId` refers to an anonymous complexType in an element
 * (node type `anonymousComplexType`) or a top-level type and removes it accordingly.
 *
 * @param command - The `removeComplexType` command to execute
 * @param schemaObj - The schema object to modify
 * @throws An {@link Error} if the type or its parent is not found
 */
export function executeRemoveComplexType(
  command: RemoveComplexTypeCommand,
  schemaObj: schema
): void {
  removeType(schemaObj, command.payload.typeId, "complexType");
}

/**
 * Executes a `modifyComplexType` command.
 * Detects whether the `typeId` refers to an anonymous complexType in an element
 * or a top-level type and updates it accordingly.
 *
 * @param command - The `modifyComplexType` command to execute
 * @param schemaObj - The schema object to modify
 * @throws An {@link Error} if the type or its parent is not found
 */
export function executeModifyComplexType(
  command: ModifyComplexTypeCommand,
  schemaObj: schema
): void {
  const { typeId, typeName, abstract: isAbstract, ...updates } = command.payload;
  const { type, topLevel } = locateModifiedType(
    schemaObj,
    typeId,
    "complexType",
    typeName
  );
  // Only top-level complex types can be abstract
  if (topLevel) {
    assignDefined(type as topLevelComplexType, { abstract: isAbstract });
  }
  updateComplexTypeContents(type, updates);
}

// ===== Helper Functions =====

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
    derivationKind?: ComplexTypeDerivationKind;
    documentation?: string;
  }
): void {
  const { mixed, contentModel, baseType, derivationKind, documentation } = updates;
  if (mixed !== undefined) {
    ct.mixed = mixed;
  }
  if (documentation !== undefined) {
    setDocumentation(ct, documentation);
  }
  if (contentModel !== undefined || baseType !== undefined || derivationKind !== undefined) {
    const effectiveBase = baseType ?? getBaseType(ct);
    // Without a compositor, the content (a group reference, attributes or nothing) is moved as it is
    const effectiveModel = contentModel ?? getContentModel(ct);
    const effectiveDerivationKind = derivationKind ?? getDerivationKind(ct) ?? "extension";
    applyContentStructure(ct, effectiveModel, effectiveBase, effectiveDerivationKind);
  }
}

/**
 * Rebuilds the full content structure (direct compositor or complexContent wrapper)
 * on a complexType holder, clearing any previously set content first.
 *
 * @param ct - The complexType holder to update
 * @param contentModel - The content model to apply, or `undefined` for a type without a compositor
 * @param baseType - Optional base type; when truthy wraps the compositor in
 *   a `complexContent`/`extension` element
 * @param derivationKind - Whether the complexContent wrapper is an extension or a restriction
 */
function applyContentStructure(
  ct: ComplexTypeHolder,
  contentModel: ContentModel | undefined,
  baseType?: string,
  derivationKind: ComplexTypeDerivationKind = "extension"
): void {
  const existingContent = captureContentState(ct);
  ct.sequence = undefined;
  ct.choice = undefined;
  ct.all = undefined;
  ct.group = undefined;
  ct.attribute = undefined;
  ct.attributeGroup = undefined;
  ct.anyAttribute = undefined;
  ct.complexContent = undefined;

  if (baseType) {
    const cc = new complexContentType();
    if (derivationKind === "restriction") {
      const restriction = new complexRestrictionType();
      restriction.base = baseType;
      restoreContentState(restriction, contentModel, existingContent);
      cc.restriction = restriction;
    } else {
      const ext = new extensionType();
      ext.base = baseType;
      restoreContentState(ext, contentModel, existingContent);
      cc.extension = ext;
    }
    ct.complexContent = cc;
  } else {
    restoreContentState(ct, contentModel, existingContent);
  }
}

/**
 * Returns the base type of a complexType if it derives from one with complexContent.
 *
 * @param ct - The complexType holder to inspect
 * @returns The base type name or undefined
 */
function getBaseType(ct: ComplexTypeHolder): string | undefined {
  return getContentDerivation<{ base?: string }>(ct)?.base;
}

/**
 * Infers the current content model of a complexType from the compositor in its content container
 * (see {@link getContentContainer}).
 *
 * @param ct - The complexType holder to inspect
 * @returns The current `ContentModel` or undefined if none is set
 */
function getContentModel(ct: ComplexTypeHolder): ContentModel | undefined {
  const content = getContentContainer<ComplexTypeContentState>(ct);
  if (content.sequence) {
    return "sequence";
  }
  if (content.choice) {
    return "choice";
  }
  if (content.all) {
    return "all";
  }
  return undefined;
}

/**
 * Returns whether a complexType derives from its base by extension or by restriction. Like
 * {@link getContentDerivation}, it checks the extension first.
 *
 * @param ct - The complexType holder to inspect
 * @returns The derivation kind, or undefined if the type has no complexContent
 */
function getDerivationKind(ct: ComplexTypeHolder): ComplexTypeDerivationKind | undefined {
  if (ct.complexContent?.extension) {
    return "extension";
  }
  if (ct.complexContent?.restriction) {
    return "restriction";
  }
  return undefined;
}

/**
 * Copies the content of a complexType, from the type itself or from its complexContent extension or
 * restriction, so that the structure can be rebuilt without losing it.
 *
 * @param ct - The complexType
 * @returns The compositor, group reference and attributes of the content
 */
function captureContentState(ct: ComplexTypeHolder): ComplexTypeContentState {
  // Content may live directly on the complexType or inside an existing
  // complexContent/extension|restriction wrapper. Capture whichever structure
  // is active so derivation-mode switches can rebuild the holder without
  // discarding the current compositor or attribute content.
  const source = getContentContainer<ComplexTypeContentState>(ct);
  // Copy properties because the source object will be mutated when rebuilding
  // derivation wrappers in executeModifyComplexType.
  const { sequence, choice, all, group, attribute, attributeGroup, anyAttribute } =
    source;
  return { sequence, choice, all, group, attribute, attributeGroup, anyAttribute };
}

/**
 * Puts captured content into a rebuilt content structure. The compositor of the given kind is kept, or
 * created if the type had another one; the group reference and the attributes are kept as they are.
 *
 * @param target - The complexType or its new extension or restriction
 * @param contentModel - The compositor of the rebuilt structure, or undefined for none
 * @param existingContent - The content captured before the rebuild
 */
function restoreContentState(
  target: ComplexTypeContentState,
  contentModel: ContentModel | undefined,
  existingContent: ComplexTypeContentState
): void {
  if (contentModel === "sequence") {
    target.sequence = existingContent.sequence ?? new explicitGroup();
  } else if (contentModel === "choice") {
    target.choice = existingContent.choice ?? new explicitGroup();
  } else if (contentModel === "all") {
    target.all = existingContent.all ?? new all();
  }
  target.group = existingContent.group;
  target.attribute = existingContent.attribute;
  target.attributeGroup = existingContent.attributeGroup;
  target.anyAttribute = existingContent.anyAttribute;
}
