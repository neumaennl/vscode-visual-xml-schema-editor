/**
 * Executors for complexType commands.
 * Implements add, remove, and modify operations for complex schema types.
 *
 * Supports both top-level named types and anonymous types embedded within elements,
 * with content models (sequence, choice, all), abstract/mixed flags, base type
 * extension, and documentation.
 */

import {
  schema,
  AddComplexTypeCommand,
  RemoveComplexTypeCommand,
  ModifyComplexTypeCommand,
  ContentModel,
  ComplexTypeDerivationKind,
  topLevelComplexType,
  localComplexType,
  complexContentType,
  complexRestrictionType,
  extensionType,
  explicitGroup,
  all,
  groupRef,
  annotationType,
  documentationType,
  attribute,
  attributeGroupRef,
  wildcard,
} from "../../shared/types";
import { toArray, isSchemaRoot } from "../../shared/schemaUtils";
import { parseSchemaId, SchemaNodeType } from "../../shared/idStrategy";
import { locateNodeById } from "../schemaNavigator";
import { createAnnotation } from "./annotationUtils";
import { renameLocalTypeInSchema } from "./schemaLocalRenamer";

/** Structural type shared by topLevelComplexType and localComplexType for content operations. */
type ComplexTypeHolder = {
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
};

type ComplexTypeContentState = {
  group?: groupRef;
  sequence?: explicitGroup;
  choice?: explicitGroup;
  all?: all;
  attribute?: attribute[];
  attributeGroup?: attributeGroupRef[];
  anyAttribute?: wildcard;
};

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
  const { parentId, typeName, contentModel, abstract: isAbstract, baseType, derivationKind, mixed, documentation } =
    command.payload;

  if (!isSchemaRoot(parentId)) {
    // Anonymous complexType inside an element — isSchemaRoot guarantees parentId is a non-empty string here
    const location = locateNodeById(schemaObj, parentId as string);
    const holder = location.parent as {
      type_?: string;
      complexType?: localComplexType;
      simpleType?: unknown;
    };
    const anonType = new localComplexType();
    if (mixed !== undefined) {
      anonType.mixed = mixed;
    }
    if (documentation) {
      anonType.annotation = createAnnotation(documentation);
    }
    applyContentStructure(anonType, contentModel, baseType, derivationKind);
    holder.type_ = undefined;
    holder.simpleType = undefined;
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
  applyContentStructure(ct, contentModel, baseType, derivationKind);

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
  const { typeId, typeName, contentModel, abstract: isAbstract, baseType, derivationKind, mixed, documentation } =
    command.payload;
  const parsed = parseSchemaId(typeId);

  if (parsed.nodeType === SchemaNodeType.AnonymousComplexType) {
    const parentId = parsed.parentId;
    if (!parentId) {
      return;
    }
    const location = locateNodeById(schemaObj, parentId);
    const holder = location.parent as { complexType?: localComplexType };
    if (!holder.complexType) return;
    updateComplexTypeContents(holder.complexType, {
      mixed,
      contentModel,
      baseType,
      derivationKind,
      documentation,
    });
    return;
  }

  // Top-level named complexType
  const ct = toArray(schemaObj.complexType).find((t) => t.name === parsed.name);
  if (!ct) {
    return;
  }

  if (typeName !== undefined) {
    renameLocalTypeInSchema(parsed.name as string, typeName, schemaObj);
    ct.name = typeName;
  }
  if (isAbstract !== undefined) {
    ct.abstract = isAbstract;
  }
  updateComplexTypeContents(ct, { mixed, contentModel, baseType, derivationKind, documentation });
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
    if (!ct.annotation) {
      ct.annotation = new annotationType();
    }
    const doc = new documentationType();
    doc.value = documentation;
    ct.annotation.documentation = [doc];
  }
  if (contentModel !== undefined || baseType !== undefined || derivationKind !== undefined) {
    const effectiveBase = baseType !== undefined ? baseType : getBaseType(ct);
    const effectiveModel = contentModel ?? getContentModel(ct);
    const effectiveDerivationKind = derivationKind ?? getDerivationKind(ct) ?? "extension";
    if (effectiveModel) {
      applyContentStructure(ct, effectiveModel, effectiveBase, effectiveDerivationKind);
    }
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
 * Returns the base type of a complexType if it uses complexContent/extension.
 *
 * @param ct - The complexType holder to inspect
 * @returns The base type name or undefined
 */
function getBaseType(ct: ComplexTypeHolder): string | undefined {
  return ct.complexContent?.extension?.base ?? ct.complexContent?.restriction?.base;
}

/**
 * Infers the current content model of a complexType by inspecting its
 * direct compositor properties and complexContent/extension child.
 *
 * @param ct - The complexType holder to inspect
 * @returns The current ContentModel or undefined if none is set
 */
function getContentModel(ct: ComplexTypeHolder): ContentModel | undefined {
  if (ct.sequence ?? ct.complexContent?.extension?.sequence ?? ct.complexContent?.restriction?.sequence) {
    return "sequence";
  }
  if (ct.choice ?? ct.complexContent?.extension?.choice ?? ct.complexContent?.restriction?.choice) {
    return "choice";
  }
  if (ct.all ?? ct.complexContent?.extension?.all ?? ct.complexContent?.restriction?.all) {
    return "all";
  }
  return undefined;
}

function getDerivationKind(ct: ComplexTypeHolder): ComplexTypeDerivationKind | undefined {
  if (ct.complexContent?.restriction) {
    return "restriction";
  }
  if (ct.complexContent?.extension) {
    return "extension";
  }
  return undefined;
}

function captureContentState(ct: ComplexTypeHolder): ComplexTypeContentState {
  // Content may live directly on the complexType or inside an existing
  // complexContent/extension|restriction wrapper. Capture whichever structure
  // is active so derivation-mode switches can rebuild the holder without
  // discarding the current compositor or attribute content.
  const wrapper = ct.complexContent?.extension ?? ct.complexContent?.restriction;
  const source = wrapper ?? ct;
  // Copy properties because the source object will be mutated when rebuilding
  // derivation wrappers in executeModifyComplexType.
  const { sequence, choice, all, group, attribute, attributeGroup, anyAttribute } =
    source;
  return { sequence, choice, all, group, attribute, attributeGroup, anyAttribute };
}

function restoreContentState(
  target: ComplexTypeContentState,
  contentModel: ContentModel,
  existingContent: ComplexTypeContentState
): void {
  if (contentModel === "sequence") {
    target.sequence = existingContent.sequence ?? new explicitGroup();
  } else if (contentModel === "choice") {
    target.choice = existingContent.choice ?? new explicitGroup();
  } else {
    target.all = existingContent.all ?? new all();
  }
  target.group = existingContent.group;
  target.attribute = existingContent.attribute;
  target.attributeGroup = existingContent.attributeGroup;
  target.anyAttribute = existingContent.anyAttribute;
}
