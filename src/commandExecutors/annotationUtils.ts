/**
 * Shared annotation helper utilities for command executors.
 * These are used by multiple executor modules to avoid code duplication.
 */

import { annotationType, documentationType } from "../../shared/types.js";
import type { AnnotatableNode } from "../../shared/schemaObjects.js";

/**
 * Gives a new component an annotation with a single documentation entry, if a command adds it with
 * documentation.
 *
 * @param node - The new component
 * @param documentation - The documentation text; without it, or when it is empty, the component gets no
 * annotation
 */
export function annotate(node: AnnotatableNode, documentation: string | undefined): void {
  if (!documentation) {
    return;
  }
  const doc = new documentationType();
  doc.value = documentation;
  const annotation = new annotationType();
  annotation.documentation = [doc];
  node.annotation = annotation;
}
