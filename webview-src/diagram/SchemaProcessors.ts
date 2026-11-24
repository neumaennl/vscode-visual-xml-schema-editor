/**
 * Functions for processing XSD schema structures and building diagram hierarchies.
 * Handles processing of complex types, sequences, choices, extensions, and restrictions.
 */

import { DiagramItem } from "./DiagramItem";
import type { ComplexTypeLike, ContentTypeLike, GroupDefLike } from "./DiagramTypes";
import { DiagramItemType, DiagramItemGroupType } from "./DiagramTypes";
import { generateSchemaId, parseSchemaId, SchemaNodeType, UNNAMED_NODE_NAME } from "../../shared/idStrategy";
import { anonymousTypeId, getContentContainer, getTargetNamespacePrefixes } from "../../shared/schemaUtils";
import { ownComponentName } from "../../shared/qNames";
import type { localElement } from "../../shared/generated/localElement";
import type { explicitGroup } from "../../shared/generated/explicitGroup";
import type { all } from "../../shared/generated/all";
import type { simpleExplicitGroup } from "../../shared/generated/simpleExplicitGroup";
import type { allType } from "../../shared/generated/allType";
import type { groupRef } from "../../shared/generated/groupRef";
import type { narrowMaxMin } from "../../shared/generated/narrowMaxMin";
import { hasInlineComplexType } from "./typeAccessors";

/**
 * Adds the content of the anonymous complexType of an element, top-level or local, to the item of the
 * element: the element and its inline type are one item.
 *
 * @param item - Diagram item of the element
 * @param element - The element
 */
export function processAnonymousTypes(item: DiagramItem, element: { complexType?: ComplexTypeLike }): void {
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
export function processComplexType(parent: DiagramItem, complexType: ComplexTypeLike): void {
  processParticles(parent, getContentContainer<ContentTypeLike>(complexType));
}

/**
 * Processes the particle of a complex type or of an extension: its sequence, choice, all or group
 * reference.
 *
 * @param parent - Diagram item to add the children to
 * @param holder - The complex type or extension
 */
function processParticles(
  parent: DiagramItem,
  holder: Pick<ContentTypeLike, "sequence" | "choice" | "all" | "group">
): void {
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
 * Processes a sequence group in the schema.
 * Creates a sequence group container and processes its elements.
 *
 * @param parent - Parent diagram item to add the sequence to
 * @param sequence - Sequence definition from schema
 * @param positionOverride - The position of the compositor in its parent's ID; without it, the compositors
 *   of the same kind that the parent already has are counted
 */
export function processSequence(
  parent: DiagramItem,
  sequence: explicitGroup | simpleExplicitGroup,
  positionOverride?: number
): void {
  processGroup(parent, sequence, "sequence", DiagramItemGroupType.Sequence, positionOverride);
}

/**
 * Processes a choice group in the schema.
 * Creates a choice group container and processes its elements.
 *
 * @param parent - Parent diagram item to add the choice to
 * @param choice - Choice definition from schema
 * @param positionOverride - The position of the compositor in its parent's ID; without it, the compositors
 *   of the same kind that the parent already has are counted
 */
export function processChoice(
  parent: DiagramItem,
  choice: explicitGroup | simpleExplicitGroup,
  positionOverride?: number
): void {
  processGroup(parent, choice, "choice", DiagramItemGroupType.Choice, positionOverride);
}

/**
 * Processes an all group in the schema.
 * Creates an all group container and processes its elements.
 *
 * @param parent - Parent diagram item to add the all group to
 * @param all - All group definition from schema
 * @param positionOverride - The position of the compositor in its parent's ID; without it, the compositors
 *   of the same kind that the parent already has are counted
 */
export function processAll(parent: DiagramItem, all: all | allType, positionOverride?: number): void {
  processGroup(parent, all, "all", DiagramItemGroupType.All, positionOverride);
}

/**
 * Generic function to process a group (sequence, choice, or all).
 * Creates a group container and processes child elements.
 *
 * @param parent - Parent diagram item
 * @param groupDef - Group definition from schema
 * @param groupName - Name of the group type for display
 * @param groupType - Type of the group (Sequence, Choice, or All)
 * @param positionOverride - The position of the compositor in its parent's ID; without it, the compositors
 *   of the same kind that the parent already has are counted
 */
function processGroup(
  parent: DiagramItem,
  groupDef: GroupDefLike,
  groupName: string,
  groupType: DiagramItemGroupType,
  positionOverride?: number
): void {
  const position =
    positionOverride ??
    parent.childElements.filter((child) => {
      try {
        const parsed = parseSchemaId(child.id);
        return parsed.nodeType === SchemaNodeType.Group && parsed.name === groupName;
      } catch {
        return false;
      }
    }).length;
  const groupParentId = resolveEffectiveGroupParentId(parent);

  // Create the group item with its final ID upfront.
  // Including `groupName` as the `name` lets the navigator distinguish
  // sequence / choice / all when resolving the ID path.
  const groupItem = new DiagramItem(
    generateSchemaId({
      nodeType: SchemaNodeType.Group,
      name: groupName,
      parentId: groupParentId,
      position,
    }),
    groupName,
    DiagramItemType.group,
    groupDef,
    parent.diagram
  );
  groupItem.nodeType = SchemaNodeType.Group;
  groupItem.groupType = groupType;

  const elementsArray = (groupDef.element as Array<localElement | narrowMaxMin> | undefined) ?? [];
  elementsArray.forEach((elem, elemPosition) => {
    groupItem.addChild(createLocalElementItem(elem, elemPosition, groupItem));
  });

  ((groupDef as { group?: groupRef[] }).group ?? []).forEach((ref, index) => {
    processGroupRef(groupItem, ref, index);
  });
  ((groupDef as { choice?: explicitGroup[] }).choice ?? []).forEach((choice, index) => {
    processChoice(groupItem, choice, index);
  });
  ((groupDef as { sequence?: explicitGroup[] }).sequence ?? []).forEach((seq, index) => {
    processSequence(groupItem, seq, index);
  });

  parent.addChild(groupItem);
}

/**
 * Creates the item of a local element of a compositor, with its anonymous type merged into it.
 *
 * @param elem - The local element
 * @param elemPosition - The position of the element among the elements of the compositor
 * @param groupItem - The item of the compositor
 * @returns The item of the element
 */
function createLocalElementItem(
  elem: localElement | narrowMaxMin,
  elemPosition: number,
  groupItem: DiagramItem
): DiagramItem {
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
function elementLabel(element: { name?: string; ref?: string }, parent: DiagramItem): string {
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
  return ownComponentName(ref, getTargetNamespacePrefixes(parent.diagram.schema)) ?? ref;
}

/**
 * Returns the ID that compositors and group references use as parent: the anonymous complexType of an
 * element that has one, otherwise the parent itself.
 *
 * @param parent - The diagram item that holds the compositor or group reference
 * @returns The parent ID for the child's ID
 */
function resolveEffectiveGroupParentId(parent: DiagramItem): string {
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
      parentId: resolveEffectiveGroupParentId(parent),
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
