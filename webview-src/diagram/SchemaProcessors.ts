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
  toArray,
  generateId,
  extractDocumentation,
  extractAttributes,
  extractOccurrenceConstraints,
} from "./DiagramBuilderHelpers";
import type { localElement } from "../../shared/generated/localElement";
import type { explicitGroup } from "../../shared/generated/explicitGroup";
import type { all } from "../../shared/generated/all";
import type { restrictionType } from "../../shared/generated/restrictionType";
import type { restrictionType_1 } from "../../shared/generated/restrictionType_1";

/**
 * Union type for restriction structures that may contain facets.
 * Includes both simple and complex restriction types.
 */
type RestrictionTypeLike = restrictionType | restrictionType_1 | ContentTypeLike;

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
export function processComplexType(parent: DiagramItem, complexType: ComplexTypeLike): void {
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
export function processSequence(parent: DiagramItem, sequence: explicitGroup): void {
  processGroup(parent, sequence, "sequence", DiagramItemGroupType.Sequence);
}

/**
 * Processes a choice group in the schema.
 * Creates a choice group container and processes its elements.
 * 
 * @param parent - Parent diagram item to add the choice to
 * @param choice - Choice definition from schema
 */
export function processChoice(parent: DiagramItem, choice: explicitGroup): void {
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
  const groupItem = new DiagramItem(
    generateId(),
    groupName,
    DiagramItemType.group,
    parent.diagram
  );
  groupItem.groupType = groupType;

  // Process elements within the group
  // Import and use createElementNode from TypeNodeCreators would create a circular dependency,
  // so we create a lightweight element node inline with essential properties
  processChildCollection(groupItem, groupDef.element as localElement | localElement[] | undefined, (elem: localElement) => {
    const item = new DiagramItem(
      generateId(),
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
    
    return item;
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
export function processExtension(parent: DiagramItem, extension: ContentTypeLike): void {
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
 * Helper function to check if an array has elements
 */
function hasElements(arr: unknown): boolean {
  return Array.isArray(arr) && arr.length > 0;
}

/**
 * Extracts restriction facets from a restriction definition.
 * Handles enumeration values, patterns, length constraints, min/max values, etc.
 * 
 * @param parent - Parent diagram item to store restrictions on
 * @param restriction - Restriction definition from schema (any type with restriction facets)
 */
export function extractRestrictionFacets(parent: DiagramItem, restriction: RestrictionTypeLike): void {
  // Cast to any to access properties that may or may not exist on all restriction types
  // This is necessary because ContentTypeLike doesn't have all the restriction facet properties
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
  const r = restriction as any;
  
  // Check if there are any restriction facets to extract
   
  const hasRestrictions = (
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    hasElements(r.enumeration) || 
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    hasElements(r.pattern) || 
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    hasElements(r.length) || 
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    hasElements(r.minLength) || 
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    hasElements(r.maxLength) ||
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    hasElements(r.minInclusive) || 
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    hasElements(r.maxInclusive) ||
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    hasElements(r.minExclusive) || 
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    hasElements(r.maxExclusive) ||
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    hasElements(r.totalDigits) || 
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    hasElements(r.fractionDigits) ||
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    hasElements(r.whiteSpace)
  );

  if (!hasRestrictions) {
    return;
  }

  // Initialize restrictions object if not exists
  if (!parent.restrictions) {
    parent.restrictions = {};
  }

  // Extract enumeration values
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (hasElements(r.enumeration)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    parent.restrictions.enumeration = r.enumeration.map((e: { value: string }) => e.value);
  }

  // Extract pattern values
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (hasElements(r.pattern)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    parent.restrictions.pattern = r.pattern.map((p: { value: string }) => p.value);
  }

  // Extract length constraints (only the first one is used per XSD spec)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (hasElements(r.length)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    parent.restrictions.length = r.length[0].value;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (hasElements(r.minLength)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    parent.restrictions.minLength = r.minLength[0].value;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (hasElements(r.maxLength)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    parent.restrictions.maxLength = r.maxLength[0].value;
  }

  // Extract min/max value constraints (only the first one is used per XSD spec)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (hasElements(r.minInclusive)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    parent.restrictions.minInclusive = r.minInclusive[0].value;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (hasElements(r.maxInclusive)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    parent.restrictions.maxInclusive = r.maxInclusive[0].value;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (hasElements(r.minExclusive)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    parent.restrictions.minExclusive = r.minExclusive[0].value;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (hasElements(r.maxExclusive)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    parent.restrictions.maxExclusive = r.maxExclusive[0].value;
  }

  // Extract digit constraints
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (hasElements(r.totalDigits)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    parent.restrictions.totalDigits = r.totalDigits[0].value;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (hasElements(r.fractionDigits)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    parent.restrictions.fractionDigits = r.fractionDigits[0].value;
  }

  // Extract whiteSpace constraint
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (hasElements(r.whiteSpace)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    parent.restrictions.whiteSpace = r.whiteSpace[0].value;
  }
}

/**
 * Processes a restriction in complexContent or simpleContent.
 * Extracts base type, restriction facets, and processes child groups.
 * 
 * @param parent - Parent diagram item being restricted
 * @param restriction - Restriction definition from schema
 */
export function processRestriction(parent: DiagramItem, restriction: ContentTypeLike): void {
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
