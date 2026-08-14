/**
 * Functions for processing XSD schema structures and building diagram hierarchies.
 * Handles processing of complex types, sequences, choices, extensions, and restrictions.
 */

import { DiagramItem } from "./DiagramItem";
import {
  DiagramItemType,
  DiagramItemGroupType,
  ComplexTypeLike,
  SimpleTypeLike,
  ContentTypeLike,
  GroupDefLike,
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
import { toArray } from "../../shared/schemaUtils";
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

  // Merge documentation from the anonymous type if parent has none
  if (!parent.documentation) {
    const anonymousComplexTypeId = generateSchemaId({
      nodeType: SchemaNodeType.AnonymousComplexType,
      parentId: parent.id,
      position: 0,
    });
    parent.documentationAnnotations = extractDocumentationAnnotations(
      anonymousComplexTypeId,
      complexType.annotation
    );
    parent.documentation = extractDocumentation(complexType.annotation) ?? "";
  }

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

  // Merge documentation from the anonymous type if parent has none
  if (!parent.documentation) {
    const anonymousSimpleTypeId = generateSchemaId({
      nodeType: SchemaNodeType.AnonymousSimpleType,
      parentId: parent.id,
      position: 0,
    });
    parent.documentationAnnotations = extractDocumentationAnnotations(
      anonymousSimpleTypeId,
      simpleType.annotation
    );
    parent.documentation = extractDocumentation(simpleType.annotation) ?? "";
  }

  // Set type before processing restriction so += works correctly
  if (!parent.type) {
    parent.type = "<anonymous simpleType>";
  }

  // Process restriction/list/union if present to extract derivation details
  if (simpleType.restriction) {
    processRestriction(parent, simpleType.restriction);
    return;
  }
  if (simpleType.list) {
    processList(parent, simpleType.list);
    return;
  }
  if (simpleType.union) {
    processUnion(parent, simpleType.union);
  }
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
  // Process attributes
  extractAttributes(parent, complexType);

  // Process complexContent
  if (complexType.complexContent) {
    parent.type += " with complexContent";

    if (complexType.complexContent.extension) {
      parent.complexDerivationKind = "extension";
      processExtension(parent, complexType.complexContent.extension);
    }

    if (complexType.complexContent.restriction) {
      parent.complexDerivationKind = "restriction";
      processRestriction(parent, complexType.complexContent.restriction);
    }
  }

  // Process simpleContent
  if (complexType.simpleContent) {
    parent.isSimpleContent = true;
    parent.type += " with simpleContent";

    if (complexType.simpleContent.extension) {
      parent.complexDerivationKind = "extension";
      processExtension(parent, complexType.simpleContent.extension);
    }

    if (complexType.simpleContent.restriction) {
      parent.complexDerivationKind = "restriction";
      processRestriction(parent, complexType.simpleContent.restriction);
    }
  }

  // Process sequence
  if (complexType.sequence) {
    processSequence(parent, complexType.sequence);
  }

  // Process choice
  if (complexType.choice) {
    processChoice(parent, complexType.choice);
  }

  // Process all
  if (complexType.all) {
    processAll(parent, complexType.all);
  }

  if (complexType.group) {
    processGroupRef(parent, complexType.group, 0);
  }
}

/**
 * Processes a sequence group in the schema.
 * Creates a sequence group container and processes its elements.
 *
 * @param parent - Parent diagram item to add the sequence to
 * @param sequence - Sequence definition from schema
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

  // Process elements within the group.
  // Import and use createElementNode from TypeNodeCreators would create a circular dependency,
  // so we create a lightweight element node inline with essential properties.
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
 * Extracts base type and attributes, then processes child groups.
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

  // Extract attributes from extension
  extractAttributes(parent, extension);

  // Process sequence in extension
  if (extension.sequence) {
    processSequence(parent, extension.sequence);
  }

  // Process choice in extension
  if (extension.choice) {
    processChoice(parent, extension.choice);
  }

  // Process all in extension
  if (extension.all) {
    processAll(parent, extension.all);
  }

  if (extension.group) {
    processGroupRef(parent, extension.group, 0);
  }
}

