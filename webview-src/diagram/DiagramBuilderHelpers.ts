/**
 * Helper utility functions for DiagramBuilder.
 * Contains common operations like array normalization, ID generation,
 * and extraction of schema metadata.
 */

import { DiagramItem } from "./DiagramItem";

/**
 * Normalizes a value to an array (handles both single values and arrays).
 * This is useful for XML unmarshalling where a single item may not be wrapped in an array.
 * 
 * @param value - Value that may be a single item, an array, or undefined
 * @returns Array of items (empty array if value is undefined)
 * 
 * @example
 * ```typescript
 * toArray(undefined) // => []
 * toArray("single") // => ["single"]
 * toArray(["a", "b"]) // => ["a", "b"]
 * ```
 */
export function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

/**
 * Extracts documentation from an annotation object in an XSD schema.
 * Concatenates multiple documentation elements with newlines.
 * 
 * @param annotation - Annotation object from schema element
 * @returns Concatenated documentation string or undefined if no documentation exists
 */
export function extractDocumentation(annotation: any): string | undefined {
  if (!annotation?.documentation) {
    return undefined;
  }

  const docs = toArray(annotation.documentation);
  return docs.map((d: any) => d.value).join("\n");
}

/**
 * Extracts occurrence constraints (minOccurs/maxOccurs) from a schema element.
 * Updates the diagram item with parsed occurrence values.
 * 
 * @param item - Diagram item to update with occurrence constraints
 * @param source - Source object with minOccurs/maxOccurs properties
 */
export function extractOccurrenceConstraints(
  item: DiagramItem,
  source: any
): void {
  if (source.minOccurs !== undefined) {
    item.minOccurrence = parseInt(source.minOccurs.toString(), 10) || 0;
  }
  if (source.maxOccurs !== undefined) {
    const maxOccurs = source.maxOccurs.toString();
    item.maxOccurrence =
      maxOccurs === "unbounded" ? -1 : parseInt(maxOccurs, 10) || 1;
  }
}

/**
 * Extracts attributes from a complex type or extension definition.
 * Parses attribute properties and adds them to the diagram item.
 * 
 * @param item - Diagram item to add attributes to
 * @param source - Source object that may contain attribute definitions
 */
export function extractAttributes(item: DiagramItem, source: any): void {
  if (!source) {
    return;
  }

  const attrArray = toArray(source.attribute);

  for (const attr of attrArray) {
    if (!attr.name) {
      continue;
    }

    item.attributes.push({
      name: attr.name.toString(),
      type: attr.type_ ? attr.type_.toString() : "inner simpleType or ref",
      use: attr.use ? attr.use.toString() : undefined,
      defaultValue: attr.default_ ? attr.default_.toString() : undefined,
      fixedValue: attr.fixed ? attr.fixed.toString() : undefined,
    });
  }
}

/**
 * ID counter for generating unique diagram item identifiers.
 * Starts at 0 and increments with each call to generateId.
 */
let idCounter: number = 0;

/**
 * Generates a unique ID for a diagram item.
 * Uses an internal counter to ensure uniqueness within a diagram build session.
 * 
 * @returns A unique string identifier in the format "item_N"
 */
export function generateId(): string {
  return `item_${idCounter++}`;
}

/**
 * Resets the ID counter to zero.
 * Should be called at the start of building a new diagram.
 */
export function resetIdCounter(): void {
  idCounter = 0;
}
