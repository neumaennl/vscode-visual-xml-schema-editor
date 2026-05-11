/**
 * Helpers for cloning and inspecting transient PropertyPanel state.
 * This module keeps the panel's draft node separate from the rendered diagram node.
 */

import { DiagramItem } from "../diagram";

/** Snapshot type used when editing simple-type restriction facets in the panel. */
export type RestrictionSnapshot = NonNullable<DiagramItem["restrictions"]>;

/**
 * Returns whether the given restriction object exposes at least one facet that the
 * current PropertyPanel UI knows how to edit.
 *
 * @param restrictions - Restriction snapshot to inspect
 * @returns True when at least one editable facet is present
 */
export function hasEditableFacetValues(restrictions: RestrictionSnapshot): boolean {
  return (
    !!restrictions.enumeration?.length ||
    !!restrictions.pattern?.length ||
    restrictions.length !== undefined ||
    restrictions.minLength !== undefined ||
    restrictions.maxLength !== undefined ||
    restrictions.minInclusive !== undefined ||
    restrictions.maxInclusive !== undefined ||
    restrictions.minExclusive !== undefined ||
    restrictions.maxExclusive !== undefined ||
    restrictions.totalDigits !== undefined ||
    restrictions.fractionDigits !== undefined ||
    restrictions.whiteSpace !== undefined
  );
}

/**
 * Creates a deep-enough clone of a diagram node for temporary PropertyPanel edits.
 * Mutable collections rendered by the panel are copied so tab switching does not
 * mutate the original selected node until commands are dispatched.
 *
 * @param node - Diagram node to clone for draft editing
 * @returns A cloned draft node instance
 */
export function createDraftNode(node: DiagramItem): DiagramItem {
  const draft = new DiagramItem(node.id, node.name, node.itemType, node.diagram);
  draft.type = node.type;
  draft.groupType = node.groupType;
  draft.parent = node.parent;
  draft.childElements = [...node.childElements];
  draft.inheritFrom = node.inheritFrom;
  draft.minOccurrence = node.minOccurrence;
  draft.maxOccurrence = node.maxOccurrence;
  draft.showChildElements = node.showChildElements;
  draft.hasChildElements = node.hasChildElements;
  draft.isReference = node.isReference;
  draft.isSimpleContent = node.isSimpleContent;
  draft.isAbstract = node.isAbstract;
  draft.isNillable = node.isNillable;
  draft.isMixed = node.isMixed;
  draft.hasAnonymousComplexType = node.hasAnonymousComplexType;
  draft.complexDerivationKind = node.complexDerivationKind;
  draft.location = { ...node.location };
  draft.size = { ...node.size };
  draft.elementBox = { ...node.elementBox };
  draft.documentationBox = { ...node.documentationBox };
  draft.childExpandButtonBox = { ...node.childExpandButtonBox };
  draft.boundingBox = { ...node.boundingBox };
  draft.documentation = node.documentation;
  draft.documentationAnnotations = node.documentationAnnotations.map((annotation) => ({
    id: annotation.id,
    documentationEntries: annotation.documentationEntries.map((entry) => ({ ...entry })),
  }));
  draft.namespace = node.namespace;
  draft.attributes = node.attributes.map((attribute) => ({ ...attribute }));
  draft.elementDefault = node.elementDefault;
  draft.elementFixed = node.elementFixed;
  draft.restrictions = node.restrictions
    ? {
        enumeration: node.restrictions.enumeration ? [...node.restrictions.enumeration] : undefined,
        pattern: node.restrictions.pattern ? [...node.restrictions.pattern] : undefined,
        length: node.restrictions.length,
        minLength: node.restrictions.minLength,
        maxLength: node.restrictions.maxLength,
        minInclusive: node.restrictions.minInclusive,
        maxInclusive: node.restrictions.maxInclusive,
        minExclusive: node.restrictions.minExclusive,
        maxExclusive: node.restrictions.maxExclusive,
        totalDigits: node.restrictions.totalDigits,
        fractionDigits: node.restrictions.fractionDigits,
        whiteSpace: node.restrictions.whiteSpace,
      }
    : undefined;
  return draft;
}
