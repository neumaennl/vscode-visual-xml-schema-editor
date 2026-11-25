/**
 * Reads the documentation of the schema objects that diagram items stand for: their `xs:annotation` and
 * `xs:documentation` nodes, with the IDs that the commands address. Like `schemaAccessors`, this module
 * knows the shape of the generated schema classes, so that the renderer and the properties panel do not
 * (see ADR 007).
 */

import type { annotationType } from "../../shared/generated/annotationType";
import { SCHEMA_ROOT_ID, SchemaNodeType, anonymousTypeId, type TypeKind } from "../../shared/idStrategy";
import type { DiagramItem } from "./DiagramItem";
import type { DiagramAnnotationEntry } from "./DiagramTypes";

/** A schema object that can have an annotation; the schema has a list of them. */
interface Annotated {
  annotation?: annotationType | annotationType[];
}

/** The inline types of an element, whose documentation the element shows if it has none of its own. */
const INLINE_TYPE_KINDS: readonly TypeKind[] = ["complexType", "simpleType"];

/**
 * Builds the ID of an `xs:annotation` node. A component has at most one annotation, which has the ID of
 * the component; the annotations of the schema are numbered.
 *
 * @param ownerId - Schema ID of the annotated component, or the schema-root ID for schema annotations
 * @param annotationIndex - Zero-based annotation index
 * @returns The schema ID of the annotation node
 */
function buildAnnotationId(ownerId: string, annotationIndex: number): string {
  return ownerId === SCHEMA_ROOT_ID ? `${SCHEMA_ROOT_ID}/annotation[${annotationIndex}]` : ownerId;
}

/**
 * Returns the annotations of an `annotation` field as a list. A component has at most one annotation, so
 * its field holds a single object; only the schema has a list.
 *
 * @param annotation - The annotation of a component, or the annotations of the schema
 * @returns The annotations, empty if there are none
 */
function annotationsOf(annotation: Annotated["annotation"]): annotationType[] {
  if (annotation === undefined) {
    return [];
  }
  return Array.isArray(annotation) ? annotation : [annotation];
}

/**
 * Reads the annotations of a schema object with the IDs of their nodes.
 *
 * @param ownerId - Schema ID of the annotated component
 * @param annotation - The annotation of a component, or the annotations of the schema
 * @returns The annotations with their documentation entries
 */
function readAnnotations(ownerId: string, annotation: Annotated["annotation"]): DiagramAnnotationEntry[] {
  return annotationsOf(annotation).map((entry, annotationIndex) => {
    const annotationId = buildAnnotationId(ownerId, annotationIndex);
    const documentationEntries = (entry.documentation ?? []).map((documentation, documentationIndex) => ({
      id: `${annotationId}/documentation[${documentationIndex}]`,
      content: documentation.value ?? "",
      lang: documentation._anyAttributes?.["xml:lang"],
    }));
    return { id: annotationId, documentationEntries };
  });
}

/**
 * Joins the texts of all documentation entries of annotations.
 *
 * @param annotations - The annotations
 * @returns The texts, one per line
 */
function joinDocumentation(annotations: readonly DiagramAnnotationEntry[]): string {
  return annotations
    .flatMap((annotation) => annotation.documentationEntries)
    .map((entry) => entry.content)
    .join("\n");
}

/**
 * Returns the annotations that an item shows. An element without documentation of its own shows the
 * documentation of its inline type, with the IDs of that type, so that editing it changes the type's
 * annotation.
 *
 * @param item - The diagram item
 * @returns The annotations with their documentation entries, empty if there are none
 */
export function getDocumentationAnnotations(item: DiagramItem): DiagramAnnotationEntry[] {
  const own = readAnnotations(item.id, (item.schemaObject as Annotated).annotation);
  if (item.nodeType !== SchemaNodeType.Element || joinDocumentation(own)) {
    return own;
  }
  const element = item.schemaObject as Partial<Record<TypeKind, Annotated>>;
  const kind = INLINE_TYPE_KINDS.find((candidate) => element[candidate] !== undefined);
  return kind ? readAnnotations(anonymousTypeId(item.id, kind), element[kind]?.annotation) : own;
}

/**
 * Returns the documentation that an item shows (see {@link getDocumentationAnnotations}).
 *
 * @param item - The diagram item
 * @returns The texts of all documentation entries, one per line, or the empty string if there are none
 */
export function getDocumentation(item: DiagramItem): string {
  return joinDocumentation(getDocumentationAnnotations(item));
}
