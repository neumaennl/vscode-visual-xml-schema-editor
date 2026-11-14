/**
 * Executors for element commands.
 * Implements add, remove, and modify operations for schema elements.
 */

import {
  schema,
  AddElementCommand,
  RemoveElementCommand,
  ModifyElementCommand,
  ModifyElementPayload,
  topLevelElement,
  localElement,
  narrowMaxMin,
} from "../../shared/types.js";
import { assumeValidated, assumptionFailed, locateValidated } from "./assumeValidated.js";
import { parseSchemaId, SCHEMA_ROOT_ID, SchemaNodeType } from "../../shared/idStrategy.js";
import { renameLocalElementRefInSchema } from "./schemaLocalRenamer.js";
import { createAnnotation, setDocumentation } from "./annotationUtils.js";
import { appendTo, removeFrom } from "./nodeProperties.js";
import { identifyChild } from "../commandUtils.js";

/** An element of any kind: top-level in the schema, local in a sequence or choice, or local in an all. */
type AnyElement = topLevelElement | localElement | narrowMaxMin;

/** The changes of a modifyElement command. */
type ElementChanges = Omit<ModifyElementPayload, "elementId">;

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
  const location = locateValidated(schemaObj, command.payload.parentId);
  const newElement = createNewElement(command.payload, location.parentType);
  appendTo(elementsOf(location.parent, location.parentType), "element", newElement);
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
  const parsed = parseSchemaId(command.payload.elementId);
  const location = locateValidated(schemaObj, parsed.parentId || SCHEMA_ROOT_ID);
  const child = identifyChild("Element", parsed.name, parsed.position);
  removeFrom(elementsOf(location.parent, location.parentType), "element", child.matches, child.what);
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
  const { elementId, ...changes } = command.payload;
  const parsed = parseSchemaId(elementId);
  const location = locateValidated(schemaObj, parsed.parentId || SCHEMA_ROOT_ID);

  // When a top-level element is renamed, update all element refs and
  // substitutionGroup references pointing to the old name.
  if (
    changes.elementName !== undefined &&
    parsed.nodeType === SchemaNodeType.Element &&
    !parsed.parentId &&
    parsed.name
  ) {
    renameLocalElementRefInSchema(parsed.name, changes.elementName, schemaObj);
  }

  const child = identifyChild("Element", parsed.name, parsed.position);
  const element = assumeValidated((elementsOf(location.parent, location.parentType).element ?? []).find(child.matches), child.what);
  updateElementProperties(element, changes, location.parentType);
}

// ===== Helper Functions =====

/**
 * Returns a parent that holds elements, in the property `element`: the schema, a sequence, a choice or
 * an all.
 *
 * @param parent - Parent container object
 * @param parentType - Type of the parent container
 * @returns The parent as a holder of elements
 * @throws Error if the parent cannot hold elements
 */
function elementsOf(parent: unknown, parentType: string): { element?: AnyElement[] } {
  if (!["schema", "sequence", "choice", "all"].includes(parentType)) {
    return assumptionFailed(`Parent of type '${parentType}' for an element`);
  }
  return parent as { element?: AnyElement[] };
}

/**
 * Creates a new element: top-level in the schema, `narrowMaxMin` in an all, whose occurrences are
 * strings, and a local element otherwise. A reference only gets its ref and occurrences.
 *
 * @param payload - The payload of the addElement command
 * @param parentType - Type of the parent container
 * @returns New element instance
 */
function createNewElement(payload: AddElementCommand["payload"], parentType: string): AnyElement {
  const { elementName, elementType, ref, minOccurs, maxOccurs, documentation } = payload;
  const element =
    parentType === "schema" ? new topLevelElement() : parentType === "all" ? new narrowMaxMin() : new localElement();

  if (ref !== undefined) {
    (element as localElement).ref = ref;
  } else {
    element.name = elementName;
    element.type_ = elementType;
  }
  setOccurrences(element, parentType, minOccurs, maxOccurs);
  if (documentation) {
    element.annotation = createAnnotation(documentation);
  }
  return element;
}

/**
 * Sets the occurrences of a local element; top-level elements have none. The elements of an all
 * hold them as strings.
 *
 * @param element - The element
 * @param parentType - Type of the parent container
 * @param minOccurs - The new minimum occurrences, if any
 * @param maxOccurs - The new maximum occurrences, if any
 */
function setOccurrences(
  element: AnyElement,
  parentType: string,
  minOccurs: number | undefined,
  maxOccurs: number | "unbounded" | undefined
): void {
  if (parentType === "schema") {
    return;
  }
  if (parentType === "all") {
    const allElement = element as narrowMaxMin;
    if (minOccurs !== undefined) {
      allElement.minOccurs = String(minOccurs);
    }
    if (maxOccurs !== undefined) {
      allElement.maxOccurs = String(maxOccurs);
    }
    return;
  }
  const localElem = element as localElement;
  if (minOccurs !== undefined) {
    localElem.minOccurs = minOccurs;
  }
  if (maxOccurs !== undefined) {
    localElem.maxOccurs = maxOccurs;
  }
}

/**
 * Updates element properties based on provided values.
 * When `ref` is set, clears `name` and `type_`. When `elementName` is set, clears `ref`.
 *
 * @param element - Element to update
 * @param changes - The changes of the modifyElement command; `abstract` only applies to top-level
 * elements and the occurrences only to local ones, and an empty `default_` or `fixed` clears it
 * @param parentType - Type of the parent container
 */
function updateElementProperties(element: AnyElement, changes: ElementChanges, parentType: string): void {
  const { elementName, elementType, ref, minOccurs, maxOccurs, documentation, nillable, abstract: isAbstract, default_, fixed } =
    changes;
  if (ref !== undefined) {
    // Switching to a reference: clear name and type
    (element as localElement).ref = ref;
    element.name = undefined;
    element.type_ = undefined;
    (element as localElement | topLevelElement).simpleType = undefined;
    (element as localElement | topLevelElement).complexType = undefined;
    // XML Schema allows none of these on a reference
    (element as localElement).default_ = undefined;
    (element as localElement).fixed = undefined;
    (element as localElement).nillable = undefined;
  } else {
    // Update name (clearing ref when switching to named)
    if (elementName !== undefined) {
      element.name = elementName;
      (element as localElement).ref = undefined;
    }
    if (elementType !== undefined) {
      element.type_ = elementType;
      (element as localElement | topLevelElement).simpleType = undefined;
      (element as localElement | topLevelElement).complexType = undefined;
    }
  }

  setOccurrences(element, parentType, minOccurs, maxOccurs);

  // Update nillable flag
  if (nillable !== undefined) {
    (element as topLevelElement | localElement).nillable = nillable ? true : undefined;
  }

  // Update abstract flag (top-level elements only)
  if (isAbstract !== undefined && parentType === "schema") {
    (element as topLevelElement).abstract = isAbstract ? true : undefined;
  }

  // Update default and fixed value; an empty string removes the value
  const valueHolder = element as topLevelElement | localElement;
  if (default_ !== undefined) {
    valueHolder.default_ = default_ || undefined;
  }
  if (fixed !== undefined) {
    valueHolder.fixed = fixed || undefined;
  }
  // An element has at most one of them, so a new value of one removes the other
  if (default_) {
    valueHolder.fixed = undefined;
  }
  if (fixed) {
    valueHolder.default_ = undefined;
  }

  if (documentation !== undefined) {
    setDocumentation(element, documentation);
  }
}
