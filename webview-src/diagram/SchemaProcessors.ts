/**
 * Functions for processing XSD schema structures and building diagram hierarchies.
 * Handles processing of complex types, sequences, choices, extensions, and restrictions.
 */

import { createCompositorItem, DiagramItem } from "./DiagramItem";
import { DiagramItemType } from "./DiagramTypes";
import {
  compositorNodeType,
  generateSchemaId,
  SchemaNodeType,
  UNNAMED_NODE_NAME,
  anonymousTypeId,
} from "../../shared/idStrategy";
import {
  getParticleContainer,
  type ComplexTypeObject,
  type ElementObject,
  type NamedChild,
  type ParticleContainer,
  type CompositorObject,
  type SequenceOrChoiceObject,
  type LocalElementObject,
} from "../../shared/schemaObjects";
import { localNameIfInTargetNamespace } from "../../shared/qNames";
import { getNamespacePrefixes, getTargetNamespace } from "./schemaAccessors";
import type { all } from "../../shared/generated/all";
import type { allType } from "../../shared/generated/allType";
import type { groupRef } from "../../shared/generated/groupRef";
import { hasInlineComplexType } from "./typeAccessors";
import type { Compositor } from "../../shared/types";

/**
 * Adds the content of the anonymous complexType of an element, top-level or local, to the item of the
 * element: the element and its inline type are one item.
 *
 * @param item - Diagram item of the element
 * @param element - The element
 */
export function processAnonymousTypes(item: DiagramItem, element: ElementObject): void {
  if (element.complexType) {
    processComplexType(item, element.complexType);
  }
}

/**
 * Adds the children of a complex type to the item that shows it: its compositor or group reference,
 * which lives in the extension or restriction of complex content, as for the extension host.
 *
 * @param parent - Parent diagram item to add children to
 * @param complexType - Complex type definition from schema
 */
export function processComplexType(parent: DiagramItem, complexType: ComplexTypeObject): void {
  // Simple content has no particles
  const particles = getParticleContainer(complexType);
  if (particles) {
    processParticles(parent, particles);
  }
}

/**
 * Processes the particle of a complex type or of an extension: its sequence, choice, all or group
 * reference.
 *
 * @param parent - Diagram item to add the children to
 * @param holder - The complex type, or the extension or restriction of its complex content
 */
function processParticles(parent: DiagramItem, holder: ParticleContainer): void {
  if (holder.sequence) {
    processSequence(parent, holder.sequence);
  }
  if (holder.choice) {
    processChoice(parent, holder.choice);
  }
  if (holder.all) {
    processAll(parent, holder.all);
  }
  if (holder.group) {
    processGroupRef(parent, holder.group, 0);
  }
}

/**
 * Adds the item of a sequence and its particles to its parent.
 *
 * @param parent - Parent diagram item to add the sequence to
 * @param sequence - Sequence definition from schema
 * @param positionOverride - The position of the compositor in its parent's ID; without it, the compositors
 *   of the same kind that the parent already has are counted
 */
export function processSequence(
  parent: DiagramItem,
  sequence: SequenceOrChoiceObject,
  positionOverride?: number
): void {
  processCompositor(parent, sequence, "sequence", positionOverride);
}

/**
 * Adds the item of a choice and its particles to its parent.
 *
 * @param parent - Parent diagram item to add the choice to
 * @param choice - Choice definition from schema
 * @param positionOverride - The position of the compositor in its parent's ID; without it, the compositors
 *   of the same kind that the parent already has are counted
 */
export function processChoice(parent: DiagramItem, choice: SequenceOrChoiceObject, positionOverride?: number): void {
  processCompositor(parent, choice, "choice", positionOverride);
}

/**
 * Adds the item of an all and its particles to its parent.
 *
 * @param parent - Parent diagram item to add the all to
 * @param all - The all from the schema
 * @param positionOverride - The position of the compositor in its parent's ID; without it, the compositors
 *   of the same kind that the parent already has are counted
 */
export function processAll(parent: DiagramItem, all: all | allType, positionOverride?: number): void {
  processCompositor(parent, all, "all", positionOverride);
}

/**
 * Adds the item of a compositor (sequence, choice or all) and its particles to its parent.
 *
 * @param parent - Parent diagram item
 * @param modelGroup - The model group from the schema
 * @param compositor - Its compositor, which is also the type in its ID and its label
 * @param positionOverride - The position of the compositor in its parent's ID; without it, the compositors
 *   of the same kind that the parent already has are counted
 */
function processCompositor(
  parent: DiagramItem,
  modelGroup: CompositorObject,
  compositor: Compositor,
  positionOverride?: number
): void {
  const position = positionOverride ?? parent.childElements.filter((child) => child.compositor === compositor).length;
  const parentId = resolveParticleParentId(parent);

  // The kind of the compositor is its node type, the type in its ID
  const compositorItem = createCompositorItem(
    generateSchemaId({ nodeType: compositorNodeType(compositor), parentId, position }),
    compositor,
    modelGroup,
    parent.diagram
  );

  const elementsArray = (modelGroup.element as LocalElementObject[] | undefined) ?? [];
  elementsArray.forEach((elem, elemPosition) => {
    compositorItem.addChild(createLocalElementItem(elem, elemPosition, compositorItem));
  });

  // Only sequences and choices hold group references and nest other compositors, not an all
  if ("group" in modelGroup) {
    (modelGroup.group ?? []).forEach((ref, index) => {
      processGroupRef(compositorItem, ref, index);
    });
  }
  if ("choice" in modelGroup) {
    (modelGroup.choice ?? []).forEach((choice, index) => {
      processChoice(compositorItem, choice, index);
    });
  }
  if ("sequence" in modelGroup) {
    (modelGroup.sequence ?? []).forEach((seq, index) => {
      processSequence(compositorItem, seq, index);
    });
  }

  parent.addChild(compositorItem);
}

/**
 * Creates the item of a local element of a compositor, with its anonymous type merged into it.
 *
 * @param elem - The local element
 * @param elemPosition - The position of the element among the elements of the compositor
 * @param groupItem - The item of the compositor
 * @returns The item of the element
 */
function createLocalElementItem(elem: LocalElementObject, elemPosition: number, groupItem: DiagramItem): DiagramItem {
  const item = new DiagramItem(
    generateSchemaId({
      nodeType: SchemaNodeType.Element,
      name: elem.name ?? UNNAMED_NODE_NAME,
      parentId: groupItem.id,
      position: elemPosition,
    }),
    elementLabel(elem, groupItem),
    DiagramItemType.element,
    elem,
    groupItem.diagram
  );
  item.nodeType = SchemaNodeType.Element;

  // Local elements inside groups can also carry inline anonymous types.
  // Process them so UI state (e.g. base-type editing) matches top-level elements.
  processAnonymousTypes(item, elem);

  return item;
}

/**
 * Returns the text that the diagram shows for a local element: its name, or for an element reference the
 * label of the reference.
 *
 * @param element - The local element
 * @param parent - The item that holds the element, for the schema of its diagram
 * @returns The label
 */
function elementLabel(element: NamedChild, parent: DiagramItem): string {
  if (element.name || !element.ref) {
    return element.name ?? UNNAMED_NODE_NAME;
  }
  return referenceLabel(element.ref, parent);
}

/**
 * Returns the text that the diagram shows for an element or group reference: the name of the referenced
 * component, with its prefix if it is in another schema. The reference arrow marks it as a reference.
 *
 * @param ref - The QName of the referenced component
 * @param parent - The item that holds the reference, for the schema of its diagram
 * @returns The label
 */
function referenceLabel(ref: string, parent: DiagramItem): string {
  const { diagram } = parent;
  return localNameIfInTargetNamespace(ref, getNamespacePrefixes(diagram), getTargetNamespace(diagram)) ?? ref;
}

/**
 * Returns the ID that compositors and group references use as parent: the anonymous complexType of an
 * element that has one, otherwise the parent itself.
 *
 * @param parent - The diagram item that holds the compositor or group reference
 * @returns The parent ID for the child's ID
 */
function resolveParticleParentId(parent: DiagramItem): string {
  if (hasInlineComplexType(parent)) {
    return anonymousTypeId(parent.id, "complexType");
  }
  return parent.id;
}

/**
 * Processes a referenced group and adds it as a child of the current diagram item.
 *
 * @param parent - Parent diagram item that owns the group reference.
 * @param groupReference - Group reference metadata from the schema.
 * @param position - Position of the reference among sibling children.
 */
function processGroupRef(parent: DiagramItem, groupReference: groupRef, position: number): void {
  const refName = groupReference.ref || UNNAMED_NODE_NAME;
  const groupRefItem = new DiagramItem(
    generateSchemaId({
      nodeType: SchemaNodeType.GroupRef,
      name: refName,
      parentId: resolveParticleParentId(parent),
      position,
    }),
    groupReference.ref ? referenceLabel(groupReference.ref, parent) : UNNAMED_NODE_NAME,
    DiagramItemType.group,
    groupReference,
    parent.diagram
  );
  groupRefItem.nodeType = SchemaNodeType.GroupRef;
  parent.addChild(groupRefItem);
}
