/**
 * Executors for complexType commands.
 * Implements add, remove, and modify operations for complex schema types.
 *
 * Supports both top-level named types and anonymous types embedded within elements,
 * with compositors (sequence, choice, all), abstract/mixed flags, base type
 * extension, and documentation.
 */

import type {
  schema,
  AddComplexTypeCommand,
  RemoveComplexTypeCommand,
  ModifyComplexTypeCommand,
  Compositor,
  ComplexTypeDerivationKind,
} from "../../shared/types.js";
import {
  topLevelComplexType,
  localComplexType,
  complexContentType,
  complexRestrictionType,
  extensionType,
} from "../../shared/types.js";
import { isSchemaRoot } from "../../shared/idStrategy.js";
import {
  getContentDerivation,
  getHeldCompositor,
  getParticleContainer,
  type ComplexTypeObject,
  type ParticleContainer,
} from "../../shared/schemaObjects.js";
import { assumeValidated } from "./assumeValidated.js";
import { assignDefined } from "./nodeProperties.js";
import { setComplexTypeCompositor } from "./compositorReplacement.js";
import { locateModifiedType, placeNewType, removeType } from "./typeTargets.js";
import { createAnnotation } from "./annotationUtils.js";

/** The content of a complex type that a change of its structure keeps: compositor, group reference and attributes. */
type CapturedContent = Pick<
  ParticleContainer,
  "sequence" | "choice" | "all" | "group" | "attribute" | "attributeGroup" | "anyAttribute"
>;

/**
 * Executes an `addComplexType` command.
 * When `payload.parentId` points to an element (not schema root), creates an anonymous
 * complexType inside that element. Otherwise creates a top-level named complexType.
 * When `baseType` is provided the compositor is nested inside a
 * `complexContent > extension` wrapper.
 *
 * @param command - The `addComplexType` command to execute
 * @param schemaObj - The schema object to modify
 * @throws An {@link Error} if the parent element is not found (anonymous case)
 */
export function executeAddComplexType(command: AddComplexTypeCommand, schemaObj: schema): void {
  const { parentId, typeName, compositor, abstract, baseType, derivationKind, mixed, documentation } = command.payload;
  const ct = isSchemaRoot(parentId)
    ? assignDefined(new topLevelComplexType(), { name: assumeValidated(typeName, "Type name"), abstract })
    : new localComplexType();
  assignDefined(ct, { mixed });
  if (documentation) {
    ct.annotation = createAnnotation(documentation);
  }
  applyContentStructure(ct, compositor, baseType, derivationKind);
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
export function executeRemoveComplexType(command: RemoveComplexTypeCommand, schemaObj: schema): void {
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
export function executeModifyComplexType(command: ModifyComplexTypeCommand, schemaObj: schema): void {
  const { typeId, typeName, abstract, ...updates } = command.payload;
  const { type, topLevel } = locateModifiedType(schemaObj, typeId, "complexType", typeName);
  // Only top-level complex types can be abstract
  if (topLevel) {
    assignDefined(type as topLevelComplexType, { abstract });
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
  ct: ComplexTypeObject,
  updates: {
    mixed?: boolean;
    compositor?: Compositor;
    baseType?: string;
    derivationKind?: ComplexTypeDerivationKind;
  }
): void {
  const { mixed, compositor, baseType, derivationKind } = updates;
  if (mixed !== undefined) {
    ct.mixed = mixed;
  }
  if (compositor !== undefined || baseType !== undefined || derivationKind !== undefined) {
    const effectiveBase = baseType ?? getBaseType(ct);
    // Without a compositor, the content (a group reference, attributes or nothing) is moved as it is
    const effectiveModel = compositor ?? getCompositor(ct);
    const effectiveDerivationKind = derivationKind ?? getDerivationKind(ct) ?? "extension";
    applyContentStructure(ct, effectiveModel, effectiveBase, effectiveDerivationKind);
  }
}

/**
 * Rebuilds the full content structure (direct compositor or complexContent wrapper)
 * on a complexType holder, clearing any previously set content first.
 *
 * @param ct - The complexType holder to update
 * @param compositor - The compositor to apply, or `undefined` for a type without one
 * @param baseType - Optional base type; when truthy wraps the compositor in
 *   a `complexContent`/`extension` element
 * @param derivationKind - Whether the complexContent wrapper is an extension or a restriction
 */
function applyContentStructure(
  ct: ComplexTypeObject,
  compositor: Compositor | undefined,
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
      restoreContentState(restriction, compositor, existingContent);
      cc.restriction = restriction;
    } else {
      const ext = new extensionType();
      ext.base = baseType;
      restoreContentState(ext, compositor, existingContent);
      cc.extension = ext;
    }
    ct.complexContent = cc;
  } else {
    restoreContentState(ct, compositor, existingContent);
  }
}

/**
 * Returns the base type of a complexType if it derives from one with complexContent.
 *
 * @param ct - The complexType holder to inspect
 * @returns The base type name or undefined
 */
function getBaseType(ct: ComplexTypeObject): string | undefined {
  return getContentDerivation(ct)?.base;
}

/**
 * Returns the compositor of a complexType from its particle container
 * (see {@link getParticleContainer}).
 *
 * @param ct - The complexType holder to inspect
 * @returns The compositor, or undefined if the complex type has none
 */
function getCompositor(ct: ComplexTypeObject): Compositor | undefined {
  const content = getParticleContainer(ct);
  return content && getHeldCompositor(content)?.kind;
}

/**
 * Returns whether a complexType derives from its base by extension or by restriction. Like
 * {@link getContentDerivation}, it checks the extension first.
 *
 * @param ct - The complexType holder to inspect
 * @returns The derivation kind, or undefined if the type has no complexContent
 */
function getDerivationKind(ct: ComplexTypeObject): ComplexTypeDerivationKind | undefined {
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
function captureContentState(ct: ComplexTypeObject): CapturedContent {
  // Content may live directly on the complexType or inside an existing
  // complexContent/extension|restriction wrapper. Capture whichever structure
  // is active so derivation-mode switches can rebuild the holder without
  // discarding the current compositor or attribute content.
  // A complex type with simple content is never restructured: the validator rejects such changes
  const source = assumeValidated(getParticleContainer(ct), "Complex content of the complex type");
  // Copy properties because the source object will be mutated when rebuilding
  // derivation wrappers in executeModifyComplexType.
  const { sequence, choice, all, group, attribute, attributeGroup, anyAttribute } = source;
  return { sequence, choice, all, group, attribute, attributeGroup, anyAttribute };
}

/**
 * Puts captured content into a rebuilt content structure. The compositor is kept, or replaced with one of
 * the given kind that takes over its content; the group reference and the attributes are kept as they are.
 *
 * @param target - The complexType or its new extension or restriction
 * @param compositor - The compositor of the rebuilt structure, or undefined for none
 * @param existingContent - The content captured before the rebuild
 */
function restoreContentState(
  target: ParticleContainer,
  compositor: Compositor | undefined,
  existingContent: CapturedContent
): void {
  if (compositor) {
    target.sequence = existingContent.sequence;
    target.choice = existingContent.choice;
    target.all = existingContent.all;
    setComplexTypeCompositor(target, compositor);
  }
  target.group = existingContent.group;
  target.attribute = existingContent.attribute;
  target.attributeGroup = existingContent.attributeGroup;
  target.anyAttribute = existingContent.anyAttribute;
}
