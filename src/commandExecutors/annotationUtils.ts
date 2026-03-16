/**
 * Shared annotation helper utilities for command executors.
 * These are used by multiple executor modules to avoid code duplication.
 */

import { annotationType, documentationType } from "../../shared/types";

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
