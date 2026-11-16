/**
 * Functions for processing XSD schema structures and building diagram hierarchies.
 * Handles processing of complex types, sequences, choices, extensions, and restrictions.
 */

import { DiagramItem } from "./DiagramItem";
import type {
  ComplexTypeLike,
  SimpleTypeLike,
  ContentTypeLike,
  GroupDefLike,
} from "./DiagramTypes";
import {
  DiagramItemType,
  DiagramItemGroupType
} from "./DiagramTypes";
import {
  generateSchemaId,
  parseSchemaId,
  SchemaNodeType,
} from "../../shared/idStrategy";
import {
  extractDocumentation,
  extractDocumentationAnnotations,
  extractAttributes,
  extractOccurrenceConstraints,
} from "./DiagramBuilderHelpers";
import { getAttributeContainer } from "../../shared/schemaUtils";
import type { localElement } from "../../shared/generated/localElement";
import type { explicitGroup } from "../../shared/generated/explicitGroup";
import type { all } from "../../shared/generated/all";
import type { simpleExplicitGroup } from "../../shared/generated/simpleExplicitGroup";
import type { allType } from "../../shared/generated/allType";
import type { groupRef } from "../../shared/generated/groupRef";
import type { narrowMaxMin } from "../../shared/generated/narrowMaxMin";
import {
  extractRestrictionFacets as extractRestrictionFacetsImpl,
  processList,
  processRestriction,
  processUnion,
} from "./SchemaProcessorsSimpleTypes";
import { processChildCollection as processChildCollectionImpl } from "./SchemaProcessorsCommon";

export { processChildCollectionImpl as processChildCollection };
export { extractRestrictionFacetsImpl as extractRestrictionFacets };
export { processRestriction, processList, processUnion };

/**
 * Processes an anonymous inline complex type within an element.
 * Merges the complex type structure directly into the parent element.
 *
 * @param parent - Parent element item containing the anonymous type
 * @param complexType - Anonymous complex type definition
 */
export function processAnonymousComplexType(
  parent: DiagramItem,
  complexType: ComplexTypeLike
): void {
  // Mark the parent type as anonymous complex type
  if (!parent.type) {
    parent.type = "<anonymous complexType>";
  }

  // Flag the parent element as owning an anonymous complex type
  parent.hasAnonymousComplexType = true;

  // Extract mixed content flag from the anonymous complex type
  if ((complexType as { mixed?: boolean }).mixed === true) {
    parent.isMixed = true;
  }

  mergeAnonymousTypeDocumentation(parent, SchemaNodeType.AnonymousComplexType, complexType.annotation);

  // Process the complex type structure directly on the parent
  processComplexType(parent, complexType);
}

/**
 * Processes an anonymous inline simple type within an element.
 * Marks the parent as having simple content and extracts base type information.
 *
 * @param parent - Parent element item containing the anonymous type
 * @param simpleType - Anonymous simple type definition
 */
export function processAnonymousSimpleType(
  parent: DiagramItem,
  simpleType: SimpleTypeLike
): void {
  // Mark the parent as having simple content
  parent.isSimpleContent = true;

  mergeAnonymousTypeDocumentation(parent, SchemaNodeType.AnonymousSimpleType, simpleType.annotation);

  // Set type before processing restriction so += works correctly
  if (!parent.type) {
    parent.type = "<anonymous simpleType>";
  }

  processSimpleTypeBody(parent, simpleType);
}

/**
 * Processes the anonymous inline complexType or simpleType of an element, top-level or local.
 *
 * @param item - Diagram item of the element
 * @param element - The element
 */
export function processAnonymousTypes(
  item: DiagramItem,
  element: { complexType?: ComplexTypeLike; simpleType?: SimpleTypeLike }
): void {
  if (element.complexType) {
    processAnonymousComplexType(item, element.complexType);
  }
  if (element.simpleType) {
    processAnonymousSimpleType(item, element.simpleType);
  }
}

/**
 * Processes the restriction, list or union of a simpleType to extract its derivation.
 *
 * @param item - Diagram item of the simpleType, or of the element that holds it inline
 * @param simpleType - The simpleType
 */
export function processSimpleTypeBody(item: DiagramItem, simpleType: SimpleTypeLike): void {
  if (simpleType.restriction) {
    processRestriction(item, simpleType.restriction);
  } else if (simpleType.list) {
    processList(item, simpleType.list);
  } else if (simpleType.union) {
    processUnion(item, simpleType.union);
  }
}

/**
 * Gives an element the documentation of its anonymous type if it has none of its own. The annotations
 * keep the ID of the anonymous type, so that editing them changes the type's annotation.
 *
 * @param parent - Diagram item of the element
 * @param nodeType - The node type of the anonymous type
 * @param annotation - The annotation of the anonymous type
 */
function mergeAnonymousTypeDocumentation(
  parent: DiagramItem,
  nodeType: SchemaNodeType.AnonymousComplexType | SchemaNodeType.AnonymousSimpleType,
  annotation: Parameters<typeof extractDocumentation>[0]
): void {
  if (parent.documentation) {
    return;
  }
  const anonymousTypeId = generateSchemaId({ nodeType, parentId: parent.id, position: 0 });
  parent.documentationAnnotations = extractDocumentationAnnotations(anonymousTypeId, annotation);
  parent.documentation = extractDocumentation(annotation) ?? "";
}

/**
 * Processes a complex type and adds its children to the parent item.
 * Handles complexContent, simpleContent, sequences, choices, and all groups.
 *
 * @param parent - Parent diagram item to add children to
 * @param complexType - Complex type definition from schema
 */
export function processComplexType(
  parent: DiagramItem,
  complexType: ComplexTypeLike
): void {
  // Process attributes, which live in the extension or restriction of complex or simple content
  extractAttributes(parent, getAttributeContainer(complexType));

  if (complexType.complexContent) {
    parent.type += " with complexContent";
    processDerivation(parent, complexType.complexContent);
  }
  if (complexType.simpleContent) {
    parent.isSimpleContent = true;
    parent.type += " with simpleContent";
    processDerivation(parent, complexType.simpleContent);
  }
  processParticles(parent, complexType);
}

/**
 * Processes the extension or restriction of the complexContent or simpleContent of a complex type.
 *
 * @param parent - Diagram item of the complex type
 * @param content - The complexContent or simpleContent
 */
function processDerivation(
  parent: DiagramItem,
  content: { extension?: ContentTypeLike; restriction?: ContentTypeLike }
): void {
  if (content.extension) {
    parent.complexDerivationKind = "extension";
    processExtension(parent, content.extension);
  }
  if (content.restriction) {
    parent.complexDerivationKind = "restriction";
    processRestriction(parent, content.restriction);
  }
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
    parent.diagram
  );
  groupItem.groupType = groupType;
  groupItem.documentationAnnotations = extractDocumentationAnnotations(groupItem.id, groupDef.annotation);
  groupItem.documentation = extractDocumentation(groupDef.annotation) ?? "";
  const occurrenceGroupDef = groupDef as { minOccurs?: number; maxOccurs?: number | "unbounded" };
  if (occurrenceGroupDef.minOccurs !== undefined) {
    const parsedMin = occurrenceGroupDef.minOccurs;
    if (!Number.isNaN(parsedMin)) {
      groupItem.minOccurrence = parsedMin;
    }
  }
  if (occurrenceGroupDef.maxOccurs !== undefined) {
    if (occurrenceGroupDef.maxOccurs === "unbounded") {
      groupItem.maxOccurrence = -1;
    } else {
      const parsedMax = occurrenceGroupDef.maxOccurs;
      if (!Number.isNaN(parsedMax)) {
        groupItem.maxOccurrence = parsedMax;
      }
    }
  }

  // Process elements within the group.
  // Import and use createElementNode from TypeNodeCreators would create a circular dependency,
  // so we create a lightweight element node inline with essential properties.
  const elementsArray = (groupDef.element as Array<localElement | narrowMaxMin> | undefined) ?? [];
  elementsArray.forEach((elem, elemPosition) => {
    const item = new DiagramItem(
      generateSchemaId({
        nodeType: SchemaNodeType.Element,
        name: elem.name ?? "unnamed",
        parentId: groupItem.id,
        position: elemPosition,
      }),
      elem.name ?? "unnamed",
      DiagramItemType.element,
      parent.diagram
    );
    if (elem.type_) {
      item.type = elem.type_;
    }
    item.documentationAnnotations = extractDocumentationAnnotations(item.id, elem.annotation);
    item.documentation = extractDocumentation(elem.annotation) ?? "";

    // Extract element-level constraints
    item.isNillable = elem.nillable === true;
    item.elementDefault = elem.default_?.toString();
    item.elementFixed = elem.fixed?.toString();

    // Extract occurrence constraints for the element
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

    // Local elements inside groups can also carry inline anonymous types.
    // Process them so UI state (e.g. base-type editing) matches top-level elements.
    processAnonymousTypes(item, elem);

    groupItem.addChild(item);
  });

  ((groupDef as { group?: groupRef[] }).group ?? []).forEach((ref, index) => { processGroupRef(groupItem, ref, index); });
  ((groupDef as { choice?: explicitGroup[] }).choice ?? []).forEach((choice, index) => { processChoice(groupItem, choice, index); });
  ((groupDef as { sequence?: explicitGroup[] }).sequence ?? []).forEach((seq, index) => { processSequence(groupItem, seq, index); });

  parent.addChild(groupItem);
}

/**
 * Returns the ID that compositors and group references use as parent: the anonymous complexType of an
 * element that has one, otherwise the parent itself.
 *
 * @param parent - The diagram item that holds the compositor or group reference
 * @returns The parent ID for the child's ID
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
 * Processes a referenced group and adds it as a child of the current diagram item.
 *
 * @param parent - Parent diagram item that owns the group reference.
 * @param groupReference - Group reference metadata from the schema.
 * @param position - Position of the reference among sibling children.
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

/**
 * Processes an extension in complexContent or simpleContent.
 * Extracts the base type, then processes child groups. The attributes are read by {@link processComplexType}.
 *
 * @param parent - Parent diagram item to extend
 * @param extension - Extension definition from schema
 */
export function processExtension(
  parent: DiagramItem,
  extension: ContentTypeLike
): void {
  // Extract base type - append to existing type info
  if (extension.base) {
    parent.type += ` (extends ${extension.base})`;
  }

  processParticles(parent, extension);
}

