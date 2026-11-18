/**
 * Helpers for cloning and inspecting transient `PropertiesPanel` state.
 * This module keeps the panel's draft node separate from the rendered diagram node.
 */

import { DiagramItem } from "../diagram";

/** Snapshot type used when editing simple-type restriction facets in the panel. */
export type RestrictionSnapshot = NonNullable<DiagramItem["restrictions"]>;

/**
 * Creates a deep-enough clone of a diagram node for temporary `PropertiesPanel` edits.
 * Mutable collections rendered by the panel are copied so tab switching does not
 * mutate the original selected node until commands are dispatched.
 *
 * @param node - Diagram node to clone for draft editing
 * @returns A cloned draft node instance
 */
export function createDraftNode(node: DiagramItem): DiagramItem {
  // Copy every field, then copy the objects and arrays that the panel changes
  const draft = Object.assign(new DiagramItem(node.id, node.name, node.itemType, node.diagram), node);
  let restrictions: RestrictionSnapshot | undefined;
  if (node.restrictions) {
    restrictions = {
      ...node.restrictions,
      enumeration: node.restrictions.enumeration ? [...node.restrictions.enumeration] : undefined,
      pattern: node.restrictions.pattern ? [...node.restrictions.pattern] : undefined,
    };
  }
  return Object.assign(draft, {
    childElements: [...node.childElements],
    simpleTypeUnionMemberTypes: node.simpleTypeUnionMemberTypes ? [...node.simpleTypeUnionMemberTypes] : undefined,
    location: { ...node.location },
    size: { ...node.size },
    elementBox: { ...node.elementBox },
    documentationBox: { ...node.documentationBox },
    childExpandButtonBox: { ...node.childExpandButtonBox },
    boundingBox: { ...node.boundingBox },
    documentationAnnotations: node.documentationAnnotations.map((annotation) => ({
      id: annotation.id,
      documentationEntries: annotation.documentationEntries.map((entry) => ({ ...entry })),
    })),
    attributes: node.attributes.map((attribute) => ({ ...attribute })),
    restrictions,
  });
}
