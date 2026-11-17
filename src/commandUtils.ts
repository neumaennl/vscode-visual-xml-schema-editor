/**
 * Shared command-ID parsing utilities used by both executors and validators.
 *
 * ID Conventions:
 * - `documentationId` for non-schema nodes: `{elementPath}/documentation[N]`
 *   (e.g. `"/element:person/documentation[0]"`).
 * - `annotationId` for schema-root annotations: `"/schema/annotation[N]"`
 *   (0-based index into the schema's `xs:annotation` array).
 * - `documentationId` for schema-root annotations:
 *   - `"/schema/annotation[N]/documentation[M]"` — M-th doc of the N-th annotation.
 *   - `"/schema/documentation[N]"` — N-th doc of the first annotation (shorthand).
 */

import type { attributeGroupRef } from "../shared/types.js";
import { requireGroup } from "../shared/regexUtils.js";

/**
 * Parses a schema-annotation ID of the form `"/schema/annotation[N]"`.
 *
 * @param id - The ID
 * @returns The 0-based annotation index, or null if the format does not match.
 */
export function parseSchemaAnnotationId(id: string): number | null {
  const match = /^\/schema\/annotation\[(\d+)\]$/.exec(id);
  return match ? parseInt(requireGroup(match, 1), 10) : null;
}

/**
 * Parses a schema-level documentation ID of the form
 * `"/schema/annotation[N]/documentation[M]"`.
 *
 * @param id - The ID
 * @returns Annotation and documentation indices, or null if the format does not match.
 */
export function parseSchemaDocumentationId(
  id: string
): { annotationIndex: number; documentationIndex: number } | null {
  const match = /^\/schema\/annotation\[(\d+)\]\/documentation\[(\d+)\]$/.exec(id);
  if (!match) {
    return null;
  }
  return { annotationIndex: parseInt(requireGroup(match, 1), 10), documentationIndex: parseInt(requireGroup(match, 2), 10) };
}

/**
 * Parses a `documentationId` of the form `{elementPath}/documentation[N]`.
 *
 * @param documentationId - The ID
 * @returns The annotated-element path and the 0-based documentation index.
 * @throws An {@link Error} if the format is invalid.
 */
export function parseDocumentationId(documentationId: string): {
  elementId: string;
  documentationIndex: number;
} {
  const match = /^(.+)\/documentation\[(\d+)\]$/.exec(documentationId);
  // The greedy `.+` is intentional: with the `$` anchor the engine backtracks to
  // match the LAST `/documentation[N]` in the string, so the captured element
  // path is everything before that final suffix (including any intermediate
  // `/documentation[N]` segments in a hypothetical nested path).
  if (!match) {
    throw new Error(
      `Invalid documentationId format — expected "{elementPath}/documentation[N]": ${documentationId}`
    );
  }
  return { elementId: requireGroup(match, 1), documentationIndex: parseInt(requireGroup(match, 2), 10) };
}

/**
 * Finds the attribute group reference that the name and position of an `attributeGroupRef` ID identify
 * among the attribute group references of its parent.
 *
 * @param refs - The attribute group references of the parent
 * @param name - The ref of the reference, if the ID has one
 * @param position - The position among the references, if the ID has one
 * @returns The reference, or `undefined` if none matches or the ID has neither a name nor a position
 */
export function findAttributeGroupRef(
  refs: attributeGroupRef[],
  name: string | undefined,
  position: number | undefined
): attributeGroupRef | undefined {
  if (position !== undefined) {
    // Undefined if the position is out of range; the ID parser only accepts digits, so it is never negative
    const ref = refs.at(position);
    return name === undefined || ref?.ref === name ? ref : undefined;
  }
  return name === undefined ? undefined : refs.find((r) => r.ref === name);
}

/**
 * Returns true if a local element or attribute is the one that the name and position of its ID
 * identify. The position is more specific and wins; otherwise the name matches the name or the ref.
 *
 * @param child - The element or attribute
 * @param index - Its position among the children of its kind of its parent
 * @param name - The name from the ID, if it has one
 * @param position - The position from the ID, if it has one
 * @returns Whether the child matches; never if the ID has neither a name nor a position
 */
function isIdentifiedChild(
  child: { name?: string; ref?: string },
  index: number,
  name: string | undefined,
  position: number | undefined
): boolean {
  if (position !== undefined) {
    return index === position;
  }
  return name !== undefined && (child.name === name || child.ref === name);
}

/**
 * Finds the local element or attribute that the name and position of its ID identify (see
 * {@link isIdentifiedChild}).
 *
 * @param children - The children of one kind of the parent
 * @param name - The name from the ID, if it has one
 * @param position - The position from the ID, if it has one
 * @returns The child, or `undefined` if none matches
 */
export function findIdentifiedChild<T extends { name?: string; ref?: string }>(
  children: T[],
  name: string | undefined,
  position: number | undefined
): T | undefined {
  return children.find((child, index) => isIdentifiedChild(child, index, name, position));
}

/**
 * Identifies a local element or attribute by the name and position of its ID, for the executors (see
 * {@link isIdentifiedChild}).
 *
 * @param label - The kind of child for messages, capitalized, such as `"Element"`
 * @param name - The name from the ID, if it has one
 * @param position - The position from the ID, if it has one
 * @returns A predicate that matches the child, and a description such as `Element person` or
 * `Element at position 2`
 */
export function identifyChild(
  label: string,
  name: string | undefined,
  position: number | undefined
): { matches: (child: { name?: string; ref?: string }, index: number) => boolean; what: string } {
  return {
    matches: (child, index) => isIdentifiedChild(child, index, name, position),
    what: name !== undefined ? `${label} ${name}` : `${label} at position ${position ?? "(none)"}`,
  };
}
