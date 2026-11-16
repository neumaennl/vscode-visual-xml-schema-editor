/**
 * Shared annotation helper utilities for command executors.
 * These are used by multiple executor modules to avoid code duplication.
 */

import { annotationType, documentationType } from "../../shared/types.js";

/**
 * Creates an annotation containing a single documentation entry.
 *
 * @param text - The documentation text
 * @returns A new annotationType instance with the text
 */
export function createAnnotation(text: string): annotationType {
  const annotation = new annotationType();
  const doc = new documentationType();
  doc.value = text;
  annotation.documentation = [doc];
  return annotation;
}

/**
 * Replaces the documentation of a node with a single entry, creating its annotation if needed. Other
 * content of the annotation, such as `xs:appinfo`, is kept.
 *
 * @param node - The node to document
 * @param text - The documentation text
 */
export function setDocumentation(node: { annotation?: annotationType }, text: string): void {
  node.annotation ??= new annotationType();
  const doc = new documentationType();
  doc.value = text;
  node.annotation.documentation = [doc];
}
