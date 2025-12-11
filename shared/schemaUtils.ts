/**
 * Utility functions for working with schema objects.
 * These utilities are shared between the extension and webview.
 */

/**
 * Normalizes a value that may be undefined, a single item, or an array.
 * 
 * @param value - Value that may be a single item, an array, or undefined
 * @returns Array of items (empty array if value is undefined)
 * 
 * @example
 * ```typescript
 * toArray(undefined) // => []
 * toArray("single") // => ["single"]
 * toArray(["a", "b"]) // => ["a", "b"]
 * ```
 */
export function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}
