/**
 * Helper utility functions for DiagramBuilder.
 * Contains common operations like ID generation and extraction of schema metadata.
 */

import { DiagramItem } from "./DiagramItem";
import type {
  DiagramAnnotationEntry,
  DiagramDocumentationEntry,
  ElementWithOccurrence,
  ElementWithAttributes,
} from "./DiagramTypes";
import type { annotationType } from "../../shared/generated/annotationType";
import { SCHEMA_ROOT_ID } from "../../shared/idStrategy";

/**
 * Builds the schema ID for an xs:annotation node owned by the given schema component.
 *
 * @param ownerId - Schema ID of the annotated component, or the schema-root ID for schema annotations
 * @param annotationIndex - Zero-based annotation index
 * @returns The schema ID of the annotation node
 */
export function buildAnnotationId(ownerId: string, annotationIndex: number): string {
  return ownerId === SCHEMA_ROOT_ID ? `${SCHEMA_ROOT_ID}/annotation[${annotationIndex}]` : ownerId;
}

/**
 * Builds the schema ID for an xs:documentation node within an annotation.
 *
 * @param annotationId - Schema ID of the owning xs:annotation node
 * @param documentationIndex - Zero-based documentation index
 * @returns The schema ID of the documentation node
 */
export function buildDocumentationId(annotationId: string, documentationIndex: number): string {
  return `${annotationId}/documentation[${documentationIndex}]`;
}

/**
 * Returns the annotations of an `annotation` field as an array. A component has at most
 * one annotation, so its field holds a single object; only the schema has an array.
 *
 * @param annotation - The annotation of a component, or the annotations of the schema
 * @returns The annotations, empty if there are none
 */
function annotationsOf(annotation: annotationType | annotationType[] | undefined): annotationType[] {
  if (annotation === undefined) return [];
  return Array.isArray(annotation) ? annotation : [annotation];
}

/**
 * Extracts xs:annotation / xs:documentation structure from an XSD annotation field.
 * The returned entries keep their schema IDs so the properties panel can edit or remove
 * the exact annotation/documentation nodes later without flattening the structure.
 *
 * @param ownerId - Schema ID of the annotated component
 * @param annotation - The annotation of a component, or the annotations of the schema
 * @returns Structured annotation entries with nested documentation entries
 */
export function extractDocumentationAnnotations(
  ownerId: string,
  annotation?: annotationType | annotationType[]
): DiagramAnnotationEntry[] {
  return annotationsOf(annotation).map((entry, annotationIndex) => {
    const annotationId = buildAnnotationId(ownerId, annotationIndex);
    const documentationEntries: DiagramDocumentationEntry[] = (entry.documentation ?? []).map(
      (doc, documentationIndex) => ({
        id: buildDocumentationId(annotationId, documentationIndex),
        content: doc.value?.toString() || "",
        lang: doc._anyAttributes?.["xml:lang"],
      })
    );

    return { id: annotationId, documentationEntries };
  });
}

/**
 * Extracts documentation from an annotation object in an XSD schema.
 * Concatenates multiple documentation elements with newlines.
 * 
 * @param annotation - The annotation of a component, or the annotations of the schema
 * @returns Concatenated documentation string or undefined if no documentation exists
 */
export function extractDocumentation(
  annotation?: annotationType | annotationType[]
): string | undefined {
  const annotations = annotationsOf(annotation);
  if (annotations.length === 0) {
    return undefined;
  }

  const hasDocumentationField = annotations.some((entry) => entry.documentation !== undefined);
  const documentations = annotations.flatMap((entry) => entry.documentation ?? []);
  if (documentations.length === 0) {
    return hasDocumentationField ? "" : undefined;
  }
  return documentations.map((doc) => doc.value?.toString() || "").join("\n");
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

  const attrArray = source.attribute ?? [];

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
