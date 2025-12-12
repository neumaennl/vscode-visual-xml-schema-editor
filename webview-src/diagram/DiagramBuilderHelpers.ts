/**
 * Helper utility functions for DiagramBuilder.
 * Contains common operations like ID generation and extraction of schema metadata.
 */

import { DiagramItem } from "./DiagramItem";
import type { ElementWithOccurrence, ElementWithAttributes } from "./DiagramTypes";
import type { annotationType } from "../../shared/generated/annotationType";
import { toArray } from "../../shared/schemaUtils";

/**
 * Extracts documentation from an annotation object in an XSD schema.
 * Concatenates multiple documentation elements with newlines.
 * 
 * @param annotation - Annotation object from schema element
 * @returns Concatenated documentation string or undefined if no documentation exists
 */
export function extractDocumentation(annotation?: annotationType): string | undefined {
  if (!annotation?.documentation) {
    return undefined;
  }

  const docs = toArray(annotation.documentation);
  return docs.map((doc) => doc.value?.toString() || "").join("\n");
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
  source: ElementWithOccurrence
): void {
  if (source.minOccurs !== undefined) {
    item.minOccurrence = source.minOccurs;
  }
  if (source.maxOccurs !== undefined) {
    item.maxOccurrence =
      source.maxOccurs === "unbounded" ? -1 : source.maxOccurs;
  }
}

/**
 * Extracts attributes from a complex type or extension definition.
 * Parses attribute properties and adds them to the diagram item.
 * 
 * @param item - Diagram item to add attributes to
 * @param source - Source object that may contain attribute definitions
 */
export function extractAttributes(item: DiagramItem, source: ElementWithAttributes | null | undefined): void {
  if (!source) {
    return;
  }

  const attrArray = toArray(source.attribute);

  for (const attr of attrArray) {
    if (!attr.name) {
      continue;
    }

    item.attributes.push({
      name: attr.name,
      type: attr.type_ || "inner simpleType or ref",
      use: attr.use,
      defaultValue: attr.default_,
      fixedValue: attr.fixed,
    });
  }
}
