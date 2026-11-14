/**
 * Searches the schema for references to a named group or attribute group, before its definition is
 * removed.
 */

import { schema, groupRef, attributeGroupRef } from "../../shared/types.js";
import { ContentHolder, getContentContainer } from "../../shared/schemaUtils.js";

/**
 * Structural type for a compositor (sequence, choice or all): its group references, nested
 * compositors and local elements, whose inline complexTypes can hold references too.
 */
export type SearchedCompositor = {
  group?: groupRef[];
  element?: Array<{ complexType?: SearchedComplexType }>;
  choice?: SearchedCompositor[];
  sequence?: SearchedCompositor[];
};

/**
 * Structural type for objects whose content model is a sequence, choice or all: complexTypes, the
 * extensions and restrictions of their content, and named groups.
 */
type SearchedContentModel = {
  sequence?: SearchedCompositor;
  choice?: SearchedCompositor;
  all?: SearchedCompositor;
};

/**
 * Structural type for the content of a complexType: the complexType itself, or the extension or
 * restriction of its complexContent or simpleContent (see {@link getContentContainer}).
 */
export type SearchedContent = SearchedContentModel & {
  group?: groupRef;
  attributeGroup?: attributeGroupRef[];
};

/** Structural type for a complexType: top-level, local, or inline in an element. */
type SearchedComplexType = ContentHolder<SearchedContent>;

/** Decides where a search finds a reference. */
export interface ReferenceMatcher {
  /**
   * @param content - The content of a complexType
   * @returns Whether the content itself holds a reference
   */
  inContent(content: SearchedContent): boolean;
  /**
   * @param compositor - A compositor
   * @returns Whether the compositor itself holds a reference
   */
  inCompositor(compositor: SearchedCompositor): boolean;
}

function isInCompositor(matcher: ReferenceMatcher, compositor: SearchedCompositor): boolean {
  return (
    matcher.inCompositor(compositor) ||
    (compositor.element ?? []).some((el) => el.complexType !== undefined && isInComplexType(matcher, el.complexType)) ||
    [...(compositor.choice ?? []), ...(compositor.sequence ?? [])].some((sub) => isInCompositor(matcher, sub))
  );
}

function isInContentModel(matcher: ReferenceMatcher, holder: SearchedContentModel): boolean {
  return [holder.sequence, holder.choice, holder.all].some(
    (compositor) => compositor !== undefined && isInCompositor(matcher, compositor)
  );
}

function isInComplexType(matcher: ReferenceMatcher, complexType: SearchedComplexType): boolean {
  const content = getContentContainer(complexType);
  return matcher.inContent(content) || isInContentModel(matcher, content);
}

/**
 * Returns true if the matcher finds a reference in the content of the schema: in top-level
 * complexTypes, in the inline complexTypes of top-level elements and in named groups, including
 * nested compositors and the inline complexTypes of local elements at any depth.
 *
 * @param schemaObj - The schema to search
 * @param matcher - Decides where a reference is found
 * @returns Whether a reference was found
 */
export function isReferencedInContent(schemaObj: schema, matcher: ReferenceMatcher): boolean {
  return (
    (schemaObj.complexType ?? []).some((ct) => isInComplexType(matcher, ct)) ||
    (schemaObj.element ?? []).some((el) => el.complexType !== undefined && isInComplexType(matcher, el.complexType)) ||
    (schemaObj.group ?? []).some((group) => isInContentModel(matcher, group))
  );
}
