/**
 * Shared command-ID parsing utilities used by both executors and validators.
 *
 * ID Conventions:
 * - documentationId for non-schema nodes: "{elementPath}/documentation[N]"
 *   (e.g. "/element:person/documentation[0]").
 * - annotationId for schema-root annotations: "schema/annotation[N]"
 *   (0-based index into the schema's xs:annotation array).
 * - documentationId for schema-root annotations:
 *   - "schema/annotation[N]/documentation[M]" — M-th doc of the N-th annotation.
 *   - "schema/documentation[N]" — N-th doc of the first annotation (shorthand).
 */

/**
 * Parses a schema-annotation ID of the form "schema/annotation[N]".
 * @returns The 0-based annotation index, or null if the format does not match.
 */
export function parseSchemaAnnotationId(id: string): number | null {
  const match = id.match(/^(?:\/?)schema\/annotation\[(\d+)\]$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Parses a schema-level documentation ID of the form
 * "schema/annotation[N]/documentation[M]".
 * @returns Annotation and documentation indices, or null if the format does not match.
 */
export function parseSchemaDocumentationId(
  id: string
): { annotIndex: number; docIndex: number } | null {
  const match = id.match(
    /^(?:\/?)schema\/annotation\[(\d+)\]\/documentation\[(\d+)\]$/
  );
  return match
    ? { annotIndex: parseInt(match[1], 10), docIndex: parseInt(match[2], 10) }
    : null;
}

/**
 * Parses a documentationId of the form "{elementPath}/documentation[N]".
 *
 * @returns The annotated-element path and the 0-based documentation index.
 * @throws Error if the format is invalid.
 */
export function parseDocumentationId(documentationId: string): {
  elementId: string;
  docIndex: number;
} {
  const match = documentationId.match(/^(.+)\/documentation\[(\d+)\]$/);
  // The greedy `.+` is intentional: with the `$` anchor the engine backtracks to
  // match the LAST `/documentation[N]` in the string, so the captured element
  // path is everything before that final suffix (including any intermediate
  // `/documentation[N]` segments in a hypothetical nested path).
  if (!match) {
    throw new Error(
      `Invalid documentationId format — expected "{elementPath}/documentation[N]": ${documentationId}`
    );
  }
  return { elementId: match[1], docIndex: parseInt(match[2], 10) };
}
