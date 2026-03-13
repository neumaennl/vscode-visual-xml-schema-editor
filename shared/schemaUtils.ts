/**
 * Utility functions for working with schema objects.
 * These utilities are shared between the extension and webview.
 */

/**
 * Normalizes a value that may be undefined, a single item, or an array.
 * 
 * @param value - Value that may be a single item, an array, or undefined/null
 * @returns Array of items (empty array if value is undefined or null)
 * 
 * @example
 * ```typescript
 * toArray(undefined) // => []
 * toArray(null) // => []
 * toArray("single") // => ["single"]
 * toArray(["a", "b"]) // => ["a", "b"]
 * toArray(0) // => [0]
 * toArray(false) // => [false]
 * ```
 */
export function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

/** Accepted string values that refer to the schema root node. */
const SCHEMA_ROOT_IDS = new Set(["schema", "/schema"]);

/**
 * Returns true when `parentId` designates the schema root rather than a
 * specific child node.  Accepts `undefined`, `"schema"`, and `"/schema"`.
 *
 * @param parentId - The parent ID to test
 * @returns true if the ID refers to the schema root
 */
export function isSchemaRoot(parentId: string | undefined): boolean {
  return parentId === undefined || SCHEMA_ROOT_IDS.has(parentId);
}
