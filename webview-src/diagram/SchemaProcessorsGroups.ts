/**
 * Helpers for processing schema groups and references into diagram items.
 */

import { DiagramItem } from "./DiagramItem";
import { DiagramItemType, DiagramItemGroupType, GroupDefLike } from "./DiagramTypes";
import {
  generateSchemaId,
  parseSchemaId,
  SchemaNodeType,
} from "../../shared/idStrategy";
import {
  extractDocumentation,
  extractDocumentationAnnotations,
  extractOccurrenceConstraints,
} from "./DiagramBuilderHelpers";
import { toArray } from "../../shared/schemaUtils";
import type { localElement } from "../../shared/generated/localElement";
import type { explicitGroup } from "../../shared/generated/explicitGroup";
import type { all } from "../../shared/generated/all";
import type { simpleExplicitGroup } from "../../shared/generated/simpleExplicitGroup";
import type { allType } from "../../shared/generated/allType";
import type { groupRef } from "../../shared/generated/groupRef";
import type { narrowMaxMin } from "../../shared/generated/narrowMaxMin";
import { processAnonymousComplexType, processAnonymousSimpleType } from "./SchemaProcessors";

/**
 * Processes a sequence group and creates a corresponding diagram item.
 *
 * @param parent - Parent diagram item to receive the sequence group.
 * @param sequence - Sequence definition from the schema.
 * @param positionOverride - Optional explicit position override for ordering.
 */
export function processSequence(
  parent: DiagramItem,
  sequence: explicitGroup | simpleExplicitGroup,
  positionOverride?: number
): void {
  processGroup(parent, sequence, "sequence", DiagramItemGroupType.Sequence, positionOverride);
}

/**
 * Processes a choice group and creates a corresponding diagram item.
 *
 * @param parent - Parent diagram item to receive the choice group.
 * @param choice - Choice definition from the schema.
 * @param positionOverride - Optional explicit position override for ordering.
 */
export function processChoice(
  parent: DiagramItem,
  choice: explicitGroup | simpleExplicitGroup,
  positionOverride?: number
): void {
  processGroup(parent, choice, "choice", DiagramItemGroupType.Choice, positionOverride);
}

/**
 * Processes an all group and creates a corresponding diagram item.
 *
 * @param parent - Parent diagram item to receive the all group.
 * @param all - All group definition from the schema.
 * @param positionOverride - Optional explicit position override for ordering.
 */
export function processAll(parent: DiagramItem, all: all | allType, positionOverride?: number): void {
  processGroup(parent, all, "all", DiagramItemGroupType.All, positionOverride);
}

/**
 * Generic group processor for sequences, choices, and all groups.
 *
 * @param parent - Parent diagram item.
 * @param groupDef - Group definition from the schema.
 * @param groupName - Human-readable group type name.
 * @param groupType - Diagram group type.
 * @param positionOverride - Optional explicit position override.
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

  const groupItem = new DiagramItem(
    generateSchemaId({
      nodeType: SchemaNodeType.Group,
      name: groupName,
      parentId: groupParentId,
      position,
    }),
    groupName,
    DiagramItemType.group,
    parent.diagram
  );
  groupItem.groupType = groupType;
  groupItem.documentationAnnotations = extractDocumentationAnnotations(groupItem.id, groupDef.annotation);
  groupItem.documentation = extractDocumentation(groupDef.annotation) ?? "";
  const occurrenceGroupDef = groupDef as { minOccurs?: number; maxOccurs?: number | "unbounded" };
  if (occurrenceGroupDef.minOccurs !== undefined) {
    const parsedMin = Number(occurrenceGroupDef.minOccurs);
    if (!Number.isNaN(parsedMin)) {
      groupItem.minOccurrence = parsedMin;
    }
  }
  if (occurrenceGroupDef.maxOccurs !== undefined) {
    if (occurrenceGroupDef.maxOccurs === "unbounded") {
      groupItem.maxOccurrence = -1;
    } else {
      const parsedMax = Number(occurrenceGroupDef.maxOccurs);
      if (!Number.isNaN(parsedMax)) {
        groupItem.maxOccurrence = parsedMax;
      }
    }
  }

  const elementsArray = toArray(
    groupDef.element as (localElement | narrowMaxMin)[] | localElement | narrowMaxMin | undefined
  );
  elementsArray.forEach((elem, elemPosition) => {
    const item = new DiagramItem(
      generateSchemaId({
        nodeType: SchemaNodeType.Element,
        name: elem.name || "unnamed",
        parentId: groupItem.id,
        position: elemPosition,
      }),
      elem.name || "unnamed",
      DiagramItemType.element,
      parent.diagram
    );
    if (elem.type_) {
      item.type = elem.type_;
    }
    item.documentationAnnotations = extractDocumentationAnnotations(item.id, elem.annotation);
    item.documentation = extractDocumentation(elem.annotation) ?? "";

    item.isNillable = elem.nillable === true;
    item.elementDefault = elem.default_?.toString();
    item.elementFixed = elem.fixed?.toString();

    if (typeof (elem as narrowMaxMin).minOccurs === "string") {
      const parsedMin = Number((elem as narrowMaxMin).minOccurs);
      if (!Number.isNaN(parsedMin)) {
        item.minOccurrence = parsedMin;
      }
      const rawMax = (elem as narrowMaxMin).maxOccurs;
      if (rawMax === "unbounded") {
        item.maxOccurrence = -1;
      } else if (rawMax !== undefined) {
        const parsedMax = Number(rawMax);
        if (!Number.isNaN(parsedMax)) {
          item.maxOccurrence = parsedMax;
        }
      }
    } else {
      extractOccurrenceConstraints(item, elem as localElement);
    }

    const localElementLike = elem as localElement;
    if (localElementLike.complexType) {
      processAnonymousComplexType(item, localElementLike.complexType);
    }
    if (localElementLike.simpleType) {
      processAnonymousSimpleType(item, localElementLike.simpleType);
    }

    groupItem.addChild(item);
  });

  toArray((groupDef as { group?: groupRef | groupRef[] }).group).forEach((groupRefItem, groupRefPosition) => {
    processGroupRef(groupItem, groupRefItem, groupRefPosition);
  });

  toArray((groupDef as { choice?: explicitGroup[] }).choice).forEach((choice, choicePosition) => {
    processChoice(groupItem, choice, choicePosition);
  });

  toArray((groupDef as { sequence?: explicitGroup[] }).sequence).forEach((sequence, sequencePosition) => {
    processSequence(groupItem, sequence, sequencePosition);
  });

  parent.addChild(groupItem);
}

/**
 * Resolves the effective parent ID for a nested group so generated IDs remain stable.
 *
 * @param parent - Parent diagram item.
 * @returns The effective parent ID to use for the child group.
 */
function resolveEffectiveGroupParentId(parent: DiagramItem): string {
  if (parent.itemType === DiagramItemType.element && parent.hasAnonymousComplexType) {
    return generateSchemaId({
      nodeType: SchemaNodeType.AnonymousComplexType,
      parentId: parent.id,
      position: 0,
    });
  }
  return parent.id;
}

/**
 * Processes a group reference and creates a corresponding diagram item.
 *
 * @param parent - Parent diagram item.
 * @param groupReference - Group reference definition from the schema.
 * @param position - Position within the parent.
 */
export function processGroupRef(
  parent: DiagramItem,
  groupReference: groupRef,
  position: number
): void {
  const refName = groupReference.ref || "unnamed";
  const groupRefItem = new DiagramItem(
    generateSchemaId({
      nodeType: SchemaNodeType.GroupRef,
      name: refName,
      parentId: resolveEffectiveGroupParentId(parent),
      position,
    }),
    refName,
    DiagramItemType.group,
    parent.diagram
  );
  groupRefItem.isReference = true;
  groupRefItem.documentationAnnotations = extractDocumentationAnnotations(
    groupRefItem.id,
    groupReference.annotation
  );
  groupRefItem.documentation = extractDocumentation(groupReference.annotation) ?? "";
  extractOccurrenceConstraints(groupRefItem, groupReference);
  parent.addChild(groupRefItem);
}
