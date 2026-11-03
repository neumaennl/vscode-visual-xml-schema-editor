/**
 * Utility functions for working with schema objects.
 * These utilities are shared between the extension and webview.
 */

import { SCHEMA_ROOT_ID } from "./idStrategy.js";
import { schema } from "./types.js";

/**
 * Returns true when `parentId` designates the schema root rather than a
 * specific child node.
 *
 * The two accepted values are considered equivalent schema-root selectors:
 * - `undefined` — no ID provided, defaults to the schema root
 * - `"/schema"` — the canonical schema root ID
 *
 * **Annotation command ID conventions for the schema root:**
 * Schema-root annotations use special composite IDs rather than a plain "schema" ID:
 * - `"/schema/annotation[N]"` — identifies the N-th (0-based) `xs:annotation` child on the schema
 * - `"/schema/annotation[N]/documentation[M]"` — the M-th `xs:documentation` of the N-th schema annotation
 * - `"/schema/documentation[N]"` — shorthand for the N-th doc of the first schema annotation
 *
 * @param parentId - The parent ID to test
 * @returns true if the ID refers to the schema root
 */
export function isSchemaRoot(parentId: string | undefined): boolean {
  return parentId === undefined || parentId === SCHEMA_ROOT_ID;
}

/**
 * Returns the prefixes that map to the schema's own target namespace.
 *
 * @param schemaObj - Schema whose namespace declarations should be inspected
 * @returns Non-default prefixes that resolve to targetNamespace
 */
export function getCurrentSchemaPrefixes(schemaObj: schema): string[] {
  const targetNamespace = schemaObj.targetNamespace?.toString();
  if (!targetNamespace) {
    return [];
  }
  return Object.entries(schemaObj._namespacePrefixes ?? {})
    .filter(([prefix, namespaceUri]) => prefix !== "" && namespaceUri === targetNamespace)
    .map(([prefix]) => prefix);
}
