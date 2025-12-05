/**
 * Functions for processing XSD schema structures and building diagram hierarchies.
 * Handles processing of complex types, sequences, choices, extensions, and restrictions.
 */

import { DiagramItem } from "./DiagramItem";
import { DiagramItemType, DiagramItemGroupType } from "./DiagramTypes";
import {
  toArray,
  generateId,
  extractDocumentation,
  extractAttributes,
} from "./DiagramBuilderHelpers";

/**
 * Processes child items from a schema collection and adds them to a parent.
 * Uses a factory function to create diagram items from schema items.
 * 
 * @param parent - Parent diagram item to add children to
 * @param items - Collection of items to process (may be undefined, single item, or array)
 * @param createFn - Function to create diagram item from schema item
 */
export function processChildCollection(
  parent: DiagramItem,
  items: any,
  createFn: (item: any) => DiagramItem | null
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
  complexType: any
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
  simpleType: any
): void {
  // Mark the parent as having simple content
  parent.isSimpleContent = true;

  // Merge documentation from the anonymous type if parent has none
  if (!parent.documentation) {
    parent.documentation = extractDocumentation(simpleType.annotation) ?? "";
  }

  // Process restriction/list/union if present to extract base type
  if (simpleType.restriction) {
    processRestriction(parent, simpleType.restriction);
  }

  // Set type if not already set
  if (!parent.type && simpleType.restriction?.base) {
    parent.type = `<simpleType: ${simpleType.restriction.base.toString()}>`;
  } else if (!parent.type) {
    parent.type = "<anonymous simpleType>";
  }
}

/**
 * Processes a complex type and adds its children to the parent item.
 * Handles complexContent, simpleContent, sequences, choices, and all groups.
 * 
 * @param parent - Parent diagram item to add children to
 * @param complexType - Complex type definition from schema
 */
export function processComplexType(parent: DiagramItem, complexType: any): void {
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
export function processSequence(parent: DiagramItem, sequence: any): void {
  processGroup(parent, sequence, "sequence", DiagramItemGroupType.Sequence);
}

/**
 * Processes a choice group in the schema.
 * Creates a choice group container and processes its elements.
 * 
 * @param parent - Parent diagram item to add the choice to
 * @param choice - Choice definition from schema
 */
export function processChoice(parent: DiagramItem, choice: any): void {
  processGroup(parent, choice, "choice", DiagramItemGroupType.Choice);
}

/**
 * Processes an all group in the schema.
 * Creates an all group container and processes its elements.
 * 
 * @param parent - Parent diagram item to add the all group to
 * @param all - All group definition from schema
 */
export function processAll(parent: DiagramItem, all: any): void {
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
  groupDef: any,
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
  processChildCollection(groupItem, groupDef.element, (elem) => {
    const item = new DiagramItem(
      generateId(),
      elem.name?.toString() || "unnamed",
      DiagramItemType.element,
      parent.diagram
    );
    if (elem.type_) {
      item.type = elem.type_.toString();
    }
    item.documentation = extractDocumentation(elem.annotation) ?? "";
    return item;
  });

  parent.addChild(groupItem);
}

/**
 * Processes an extension in complexContent or simpleContent.
 * Extracts base type and attributes, then processes child groups.
 * 
 * @param parent - Parent diagram item to extend
 * @param extension - Extension definition from schema
 */
export function processExtension(parent: DiagramItem, extension: any): void {
  // Extract base type
  if (extension.base) {
    parent.type = `extends ${extension.base.toString()}`;
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
 * Processes a restriction in complexContent or simpleContent.
 * Extracts base type and processes child groups.
 * 
 * @param parent - Parent diagram item being restricted
 * @param restriction - Restriction definition from schema
 */
export function processRestriction(parent: DiagramItem, restriction: any): void {
  // Extract base type from restriction
  if (restriction.base) {
    if (parent.type) {
      parent.type = `${parent.type} (restricts ${restriction.base.toString()})`;
    } else {
      parent.type = `restricts ${restriction.base.toString()}`;
    }
  }

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
  // TODO: Could also extract enumeration values, patterns, etc. here in the future
}
