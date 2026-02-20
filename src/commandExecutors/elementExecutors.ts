/**
 * Executors for element commands.
 * Implements add, remove, and modify operations for schema elements.
 */

import {
  schema,
  AddElementCommand,
  RemoveElementCommand,
  ModifyElementCommand,
  topLevelElement,
  localElement,
  narrowMaxMin,
  annotationType,
  documentationType,
  explicitGroup,
  all,
} from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";
import { locateNodeById } from "../schemaNavigator";
import { parseSchemaId } from "../../shared/idStrategy";

/**
 * Executes an addElement command.
 *
 * @param command - The addElement command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if parent node not found or element cannot be added
 */
export function executeAddElement(
  command: AddElementCommand,
  schemaObj: schema
): void {
  const { parentId, elementName, elementType, minOccurs, maxOccurs, documentation } = command.payload;

  // Locate the parent node
  const location = locateNodeById(schemaObj, parentId);
  if (!location.found || !location.parent || !location.parentType) {
    throw new Error(`Parent node not found: ${parentId}`);
  }

  // Create the new element
  const newElement = createNewElement(
    elementName,
    elementType,
    minOccurs,
    maxOccurs,
    documentation,
    location.parentType === "schema",
    location.parentType === "all"
  );

  // Add the element to the appropriate parent
  addElementToParent(location.parent, location.parentType, newElement);
}

/**
 * Executes a removeElement command.
 *
 * @param command - The removeElement command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if parent node or element not found
 */
export function executeRemoveElement(
  command: RemoveElementCommand,
  schemaObj: schema
): void {
  const { elementId } = command.payload;

  // Parse the element ID to get information about the element
  const parsed = parseSchemaId(elementId);
  
  // Determine the parent location
  const parentId = parsed.parentId || "schema";
  const location = locateNodeById(schemaObj, parentId);
  
  if (!location.found || !location.parent || !location.parentType) {
    throw new Error(`Parent node not found for element: ${elementId}`);
  }

  // Remove the element from its parent container
  removeElementFromParent(location.parent, location.parentType, parsed.name, parsed.position);
}

/**
 * Executes a modifyElement command.
 *
 * @param command - The modifyElement command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if parent node or element not found
 */
export function executeModifyElement(
  command: ModifyElementCommand,
  schemaObj: schema
): void {
  const { elementId, elementName, elementType, minOccurs, maxOccurs, documentation } = command.payload;

  // Parse the element ID to get information about the element
  const parsed = parseSchemaId(elementId);
  
  // Determine the parent location from the parsed ID
  const parentId = parsed.parentId || "schema";
  const location = locateNodeById(schemaObj, parentId);
  
  if (!location.found || !location.parent || !location.parentType) {
    throw new Error(`Parent node not found for element: ${elementId}`);
  }

  // Find and modify the element in its parent container
  modifyElementInParent(
    location.parent,
    location.parentType,
    parsed.name,
    parsed.position,
    elementName,
    elementType,
    minOccurs,
    maxOccurs,
    documentation
  );
}

// ===== Helper Functions =====

/**
 * Creates a new element (either top-level or local).
 *
 * @param name - Element name
 * @param type - Element type
 * @param minOccurs - Minimum occurrences (optional)
 * @param maxOccurs - Maximum occurrences (optional)
 * @param documentation - Documentation text (optional)
 * @param isTopLevel - Whether this is a top-level element
 * @param isInAllGroup - Whether this element is in an 'all' group
 * @returns New element instance
 */
function createNewElement(
  name: string,
  type: string,
  minOccurs?: number,
  maxOccurs?: number | "unbounded",
  documentation?: string,
  isTopLevel: boolean = false,
  isInAllGroup: boolean = false
): topLevelElement | localElement | narrowMaxMin {
  let element: topLevelElement | localElement | narrowMaxMin;
  
  if (isTopLevel) {
    element = new topLevelElement();
  } else if (isInAllGroup) {
    // For 'all' groups, we need to use narrowMaxMin which has string-typed occurrences
    element = new narrowMaxMin();
  } else {
    element = new localElement();
  }

  element.name = name;
  element.type_ = type;

  // For local elements and narrowMaxMin, set minOccurs and maxOccurs
  if (!isTopLevel) {
    if (isInAllGroup) {
      const allElement = element as narrowMaxMin;
      if (minOccurs !== undefined) {
        allElement.minOccurs = String(minOccurs);
      }
      if (maxOccurs !== undefined) {
        allElement.maxOccurs = String(maxOccurs);
      }
    } else {
      const localElem = element as localElement;
      if (minOccurs !== undefined) {
        localElem.minOccurs = minOccurs;
      }
      if (maxOccurs !== undefined) {
        localElem.maxOccurs = maxOccurs;
      }
    }
  }

  // Add documentation if provided
  if (documentation) {
    const annotation = new annotationType();
    const doc = new documentationType();
    doc.value = documentation;
    annotation.documentation = [doc];
    element.annotation = annotation;
  }

  return element;
}

/**
 * Adds an element to its parent container.
 *
 * @param parent - Parent container object
 * @param parentType - Type of the parent container
 * @param element - Element to add
 * @throws Error if element cannot be added or duplicate name exists
 */
function addElementToParent(
  parent: unknown,
  parentType: string,
  element: topLevelElement | localElement | narrowMaxMin
): void {
  if (parentType === "schema") {
    const schemaObj = parent as schema;
    const elements = toArray(schemaObj.element);
    
    // Check for duplicate element names
    if (element.name && elements.some(el => el.name === element.name)) {
      throw new Error(`Cannot add element: duplicate element name '${element.name}' in schema`);
    }
    
    elements.push(element as topLevelElement);
    schemaObj.element = elements;
  } else if (
    parentType === "sequence" ||
    parentType === "choice"
  ) {
    const group = parent as explicitGroup;
    const elements = toArray(group.element);
    
    // Check for duplicate element names
    if (element.name && elements.some(el => el.name === element.name)) {
      throw new Error(`Cannot add element: duplicate element name '${element.name}' in ${parentType}`);
    }
    
    elements.push(element as localElement);
    group.element = elements;
  } else if (parentType === "all") {
    const allGroup = parent as all;
    const elements = toArray(allGroup.element);
    
    // Check for duplicate element names
    if (element.name && elements.some(el => el.name === element.name)) {
      throw new Error(`Cannot add element: duplicate element name '${element.name}' in all group`);
    }
    
    elements.push(element as narrowMaxMin);
    allGroup.element = elements;
  } else {
    throw new Error(`Cannot add element to parent of type: ${parentType}`);
  }
}

/**
 * Removes an element from its parent container.
 *
 * @param parent - Parent container object
 * @param parentType - Type of the parent container
 * @param elementName - Name of the element to remove (optional)
 * @param position - Position of the element to remove (optional)
 * @throws Error if element not found
 */
function removeElementFromParent(
  parent: unknown,
  parentType: string,
  elementName?: string,
  position?: number
): void {
  if (parentType === "schema") {
    const schemaObj = parent as schema;
    const elements = toArray(schemaObj.element);
    const filtered = filterElement(elements, elementName, position);
    schemaObj.element = filtered.length > 0 ? filtered : undefined;
  } else if (
    parentType === "sequence" ||
    parentType === "choice"
  ) {
    const group = parent as explicitGroup;
    const elements = toArray(group.element);
    const filtered = filterElement(elements, elementName, position);
    group.element = filtered.length > 0 ? filtered : undefined;
  } else if (parentType === "all") {
    const allGroup = parent as all;
    const elements = toArray(allGroup.element);
    const filtered = filterElement(elements, elementName, position);
    allGroup.element = filtered.length > 0 ? filtered : undefined;
  } else {
    throw new Error(`Cannot remove element from parent of type: ${parentType}`);
  }
}

/**
 * Filters out an element from an array by name or position.
 * When both name and position are provided, position takes precedence.
 *
 * @param elements - Array of elements
 * @param elementName - Name of the element to filter (optional)
 * @param position - Position of the element to filter (optional)
 * @returns Filtered array
 * @throws Error if element not found
 */
function filterElement<T extends { name?: string }>(
  elements: T[],
  elementName?: string,
  position?: number
): T[] {
  // When both are provided, position takes precedence (more specific)
  if (position !== undefined) {
    // Filter by position
    if (position < 0 || position >= elements.length) {
      throw new Error(`Element not found at position: ${position}`);
    }
    return elements.filter((_, idx) => idx !== position);
  } else if (elementName !== undefined) {
    // Filter by name
    const filtered = elements.filter(el => el.name !== elementName);
    if (filtered.length === elements.length) {
      throw new Error(`Element not found with name: ${elementName}`);
    }
    return filtered;
  }
  throw new Error("Either elementName or position must be provided");
}

/**
 * Modifies an element in its parent container.
 *
 * @param parent - Parent container object
 * @param parentType - Type of the parent container
 * @param targetName - Name of the element to modify (optional)
 * @param targetPosition - Position of the element to modify (optional)
 * @param newName - New name for the element (optional)
 * @param newType - New type for the element (optional)
 * @param newMinOccurs - New minimum occurrences (optional)
 * @param newMaxOccurs - New maximum occurrences (optional)
 * @param newDocumentation - New documentation (optional)
 * @throws Error if element not found
 */
function modifyElementInParent(
  parent: unknown,
  parentType: string,
  targetName?: string,
  targetPosition?: number,
  newName?: string,
  newType?: string,
  newMinOccurs?: number,
  newMaxOccurs?: number | "unbounded",
  newDocumentation?: string
): void {
  if (parentType === "schema") {
    const schemaObj = parent as schema;
    const elements = toArray(schemaObj.element);
    const element = findElement(elements, targetName, targetPosition);
    
    if (!element) {
      throw new Error(`Element not found: ${targetName ?? `at position ${targetPosition}`}`);
    }
    
    updateElementProperties(
      element,
      newName,
      newType,
      undefined, // top-level elements don't have occurrences
      undefined,
      newDocumentation,
      false
    );
  } else if (
    parentType === "sequence" ||
    parentType === "choice"
  ) {
    const group = parent as explicitGroup;
    const elements = toArray(group.element);
    const element = findElement(elements, targetName, targetPosition);
    
    if (!element) {
      throw new Error(`Element not found: ${targetName ?? `at position ${targetPosition}`}`);
    }
    
    updateElementProperties(
      element,
      newName,
      newType,
      newMinOccurs,
      newMaxOccurs,
      newDocumentation,
      false
    );
  } else if (parentType === "all") {
    const allGroup = parent as all;
    const elements = toArray(allGroup.element);
    const element = findElement(elements, targetName, targetPosition);
    
    if (!element) {
      throw new Error(`Element not found: ${targetName ?? `at position ${targetPosition}`}`);
    }
    
    updateElementProperties(
      element,
      newName,
      newType,
      newMinOccurs,
      newMaxOccurs,
      newDocumentation,
      true
    );
  } else {
    throw new Error(`Cannot modify element in parent of type: ${parentType}`);
  }
}

/**
 * Finds an element in an array by name or position.
 *
 * @param elements - Array of elements
 * @param elementName - Name of the element to find (optional)
 * @param position - Position of the element to find (optional)
 * @returns Found element or undefined
 */
function findElement<T extends { name?: string }>(
  elements: T[],
  elementName?: string,
  position?: number
): T | undefined {
  // When both are provided, position takes precedence (more specific)
  if (position !== undefined) {
    return elements[position];
  } else if (elementName !== undefined) {
    return elements.find(el => el.name === elementName);
  }
  return undefined;
}

/**
 * Updates element properties based on provided values.
 *
 * @param element - Element to update
 * @param newName - New name (optional)
 * @param newType - New type (optional)
 * @param newMinOccurs - New minimum occurrences (optional)
 * @param newMaxOccurs - New maximum occurrences (optional)
 * @param newDocumentation - New documentation (optional)
 * @param isInAllGroup - Whether this element is in an 'all' group
 */
function updateElementProperties(
  element: topLevelElement | localElement | narrowMaxMin,
  newName?: string,
  newType?: string,
  newMinOccurs?: number,
  newMaxOccurs?: number | "unbounded",
  newDocumentation?: string,
  isInAllGroup: boolean = false
): void {
  // Update name if provided
  if (newName !== undefined) {
    element.name = newName;
  }

  // Update type if provided
  if (newType !== undefined) {
    element.type_ = newType;
  }

  // Update occurrences if provided (only for local elements and narrowMaxMin)
  if (newMinOccurs !== undefined || newMaxOccurs !== undefined) {
    if (isInAllGroup) {
      const allElement = element as narrowMaxMin;
      if (newMinOccurs !== undefined) {
        allElement.minOccurs = String(newMinOccurs);
      }
      if (newMaxOccurs !== undefined) {
        allElement.maxOccurs = String(newMaxOccurs);
      }
    } else if ('minOccurs' in element) {
      const localElem = element as localElement;
      if (newMinOccurs !== undefined) {
        localElem.minOccurs = newMinOccurs;
      }
      if (newMaxOccurs !== undefined) {
        localElem.maxOccurs = newMaxOccurs;
      }
    }
  }

  // Update documentation if provided
  if (newDocumentation !== undefined) {
    if (!element.annotation) {
      element.annotation = new annotationType();
    }
    
    const doc = new documentationType();
    doc.value = newDocumentation;
    element.annotation.documentation = [doc];
  }
}
