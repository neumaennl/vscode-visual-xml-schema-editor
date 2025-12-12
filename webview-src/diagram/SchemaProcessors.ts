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
  SchemaNodeType,
} from "../../shared/idStrategy";
import {
  extractDocumentation,
  extractAttributes,
  extractOccurrenceConstraints,
} from "./DiagramBuilderHelpers";
import { toArray } from "../../shared/schemaUtils";
import type { localElement } from "../../shared/generated/localElement";
import type { explicitGroup } from "../../shared/generated/explicitGroup";
import type { all } from "../../shared/generated/all";
import type { restrictionType } from "../../shared/generated/restrictionType";
import type { restrictionType_1 } from "../../shared/generated/restrictionType_1";

/**
 * Union type for restriction structures that may contain facets.
 * Includes both simple and complex restriction types.
 */
type RestrictionTypeLike =
  | restrictionType
  | restrictionType_1
  | ContentTypeLike;

/**
 * Type guard to check if a restriction has simple type facets.
 * These facets are present on restrictionType and restrictionType_1.
 */
function hasSimpleTypeFacets(
  restriction: RestrictionTypeLike
): restriction is restrictionType | restrictionType_1 {
  return (
    "enumeration" in restriction ||
    "pattern" in restriction ||
    "length" in restriction ||
    "minLength" in restriction ||
    "maxLength" in restriction ||
    "minInclusive" in restriction ||
    "maxInclusive" in restriction ||
    "minExclusive" in restriction ||
    "maxExclusive" in restriction ||
    "totalDigits" in restriction ||
    "fractionDigits" in restriction ||
    "whiteSpace" in restriction
  );
}

/**
 * Processes child items from a schema collection and adds them to a parent.
 * Uses a factory function to create diagram items from schema items.
 *
 * @param parent - Parent diagram item to add children to
 * @param items - Collection of items to process (may be undefined, single item, or array)
 * @param createFn - Function to create diagram item from schema item
 */
export function processChildCollection<T>(
  parent: DiagramItem,
  items: T[] | T | undefined,
  createFn: (item: T) => DiagramItem | null
): void {
  const itemArray = toArray(items);
  for (const item of itemArray) {
    const node = createFn(item);
    if (node) {
      parent.addChild(node);
    }
  }
}

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

  // Merge documentation from the anonymous type if parent has none
  if (!parent.documentation) {
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
    parent.documentation = extractDocumentation(simpleType.annotation) ?? "";
  }

  // Set type before processing restriction so += works correctly
  if (!parent.type) {
    parent.type = "<anonymous simpleType>";
  }

  // Process restriction/list/union if present to extract base type
  if (simpleType.restriction) {
    processRestriction(parent, simpleType.restriction);
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
      processExtension(parent, complexType.complexContent.extension);
    }

    if (complexType.complexContent.restriction) {
      processRestriction(parent, complexType.complexContent.restriction);
    }
  }

  // Process simpleContent
  if (complexType.simpleContent) {
    parent.isSimpleContent = true;
    parent.type += " with simpleContent";

    if (complexType.simpleContent.extension) {
      processExtension(parent, complexType.simpleContent.extension);
    }

    if (complexType.simpleContent.restriction) {
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
  sequence: explicitGroup
): void {
  processGroup(parent, sequence, "sequence", DiagramItemGroupType.Sequence);
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
  choice: explicitGroup
): void {
  processGroup(parent, choice, "choice", DiagramItemGroupType.Choice);
}

/**
 * Processes an all group in the schema.
 * Creates an all group container and processes its elements.
 *
 * @param parent - Parent diagram item to add the all group to
 * @param all - All group definition from schema
 */
export function processAll(parent: DiagramItem, all: all): void {
  processGroup(parent, all, "all", DiagramItemGroupType.All);
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
  groupType: DiagramItemGroupType
): void {
  // Groups don't have names, so we use position-based ID
  const position = parent.childElements.length;
  const groupItem = new DiagramItem(
    generateSchemaId({
      nodeType: SchemaNodeType.Group,
      parentId: parent.id,
      position,
    }),
    groupName,
    DiagramItemType.group,
    parent.diagram
  );
  groupItem.groupType = groupType;

  // Process elements within the group
  // Import and use createElementNode from TypeNodeCreators would create a circular dependency,
  // so we create a lightweight element node inline with essential properties
  const elementsArray = toArray(
    groupDef.element as localElement | localElement[] | undefined
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
    item.documentation = extractDocumentation(elem.annotation) ?? "";

    // Extract occurrence constraints for the element
    extractOccurrenceConstraints(item, elem);

    groupItem.addChild(item);
  });

  // Only add the group if it has children
  if (groupItem.childElements.length > 0) {
    parent.addChild(groupItem);
  }
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
}

/**
 * Extracts restriction facets from a restriction definition.
 * Handles enumeration values, patterns, length constraints, min/max values, etc.
 *
 * @param parent - Parent diagram item to store restrictions on
 * @param restriction - Restriction definition from schema (any type with restriction facets)
 */
export function extractRestrictionFacets(
  parent: DiagramItem,
  restriction: RestrictionTypeLike
): void {
  // Early return if the restriction doesn't have simple type facets
  if (!hasSimpleTypeFacets(restriction)) {
    return;
  }

  // Normalize all facet collections to arrays because XML unmarshalling
  // may provide a single object instead of an array when there is only one facet.
  const enumeration = toArray(restriction.enumeration);
  const pattern = toArray(restriction.pattern);
  const length = toArray(restriction.length);
  const minLength = toArray(restriction.minLength);
  const maxLength = toArray(restriction.maxLength);
  const minInclusive = toArray(restriction.minInclusive);
  const maxInclusive = toArray(restriction.maxInclusive);
  const minExclusive = toArray(restriction.minExclusive);
  const maxExclusive = toArray(restriction.maxExclusive);
  const totalDigits = toArray(restriction.totalDigits);
  const fractionDigits = toArray(restriction.fractionDigits);
  const whiteSpace = toArray(restriction.whiteSpace);

  // Check if there are any restriction facets to extract
  const facetArrays = [
    enumeration,
    pattern,
    length,
    minLength,
    maxLength,
    minInclusive,
    maxInclusive,
    minExclusive,
    maxExclusive,
    totalDigits,
    fractionDigits,
    whiteSpace,
  ];

  const hasRestrictions = facetArrays.some((arr) => arr.length > 0);

  if (!hasRestrictions) {
    return;
  }

  // Initialize restrictions object if not exists
  if (!parent.restrictions) {
    parent.restrictions = {};
  }

  // Extract enumeration values
  if (enumeration.length > 0) {
    parent.restrictions.enumeration = enumeration.map((e) => e.value);
  }

  // Extract pattern values
  if (pattern.length > 0) {
    parent.restrictions.pattern = pattern.map((p) => p.value);
  }

  // Extract length constraints (only the first one is used per XSD spec)
  if (length.length > 0) {
    parent.restrictions.length = length[0].value;
  }

  if (minLength.length > 0) {
    parent.restrictions.minLength = minLength[0].value;
  }

  if (maxLength.length > 0) {
    parent.restrictions.maxLength = maxLength[0].value;
  }

  // Extract min/max value constraints (only the first one is used per XSD spec)
  if (minInclusive.length > 0) {
    parent.restrictions.minInclusive = minInclusive[0].value;
  }

  if (maxInclusive.length > 0) {
    parent.restrictions.maxInclusive = maxInclusive[0].value;
  }

  if (minExclusive.length > 0) {
    parent.restrictions.minExclusive = minExclusive[0].value;
  }

  if (maxExclusive.length > 0) {
    parent.restrictions.maxExclusive = maxExclusive[0].value;
  }

  // Extract digit constraints
  if (totalDigits.length > 0) {
    parent.restrictions.totalDigits = totalDigits[0].value;
  }

  if (fractionDigits.length > 0) {
    parent.restrictions.fractionDigits = fractionDigits[0].value;
  }

  // Extract whiteSpace constraint
  if (whiteSpace.length > 0) {
    parent.restrictions.whiteSpace = whiteSpace[0].value;
  }
}

/**
 * Processes a restriction in complexContent or simpleContent.
 * Extracts base type, restriction facets, and processes child groups.
 *
 * @param parent - Parent diagram item being restricted
 * @param restriction - Restriction definition from schema
 */
export function processRestriction(
  parent: DiagramItem,
  restriction: ContentTypeLike
): void {
  // Extract base type from restriction - append to existing type info
  if (restriction.base) {
    parent.type += ` (restricts ${restriction.base})`;
  }

  // Extract restriction facets (enumeration, pattern, length, etc.)
  extractRestrictionFacets(parent, restriction);

  // Process sequence in restriction
  if (restriction.sequence) {
    processSequence(parent, restriction.sequence);
  }

  // Process choice in restriction
  if (restriction.choice) {
    processChoice(parent, restriction.choice);
  }

  // Process all in restriction
  if (restriction.all) {
    processAll(parent, restriction.all);
  }
}
