/**
 * Helpers for the optional properties of schema nodes. The generated classes leave a property
 * `undefined` when the node does not have it, and the executors keep it that way: they only set the
 * values that a command contains, create an array property for the first child and remove it with the
 * last one.
 */

import { assumeRemoved } from "./assumeValidated.js";

/** The names of the optional array properties of a node. */
type ArrayKeys<N> = { [K in keyof N]-?: NonNullable<N[K]> extends unknown[] ? K : never }[keyof N];

/** The type of the items of an array property. */
type ItemOf<N, K extends keyof N> = NonNullable<N[K]> extends Array<infer T> ? T : never;

/**
 * Appends an item to an optional array property, creating the array if needed.
 *
 * @param node - The node that holds the array
 * @param key - The name of the array property
 * @param item - The item to append
 */
export function appendTo<N, K extends ArrayKeys<N>>(node: N, key: K, item: ItemOf<N, K>): void {
  const items = (node[key] ?? []) as Array<ItemOf<N, K>>;
  items.push(item);
  node[key] = items as N[K];
}

/**
 * Removes the items that the validator found from an optional array property, and the property
 * itself when no item remains.
 *
 * @param node - The node that holds the array
 * @param key - The name of the array property
 * @param isRemoved - Returns true for the items to remove
 * @param what - What is removed, for the error message
 * @throws An {@link Error} if no item was removed
 */
export function removeFrom<N, K extends ArrayKeys<N>>(
  node: N,
  key: K,
  isRemoved: (item: ItemOf<N, K>, index: number) => boolean,
  what: string
): void {
  const items = (node[key] ?? []) as Array<ItemOf<N, K>>;
  const remaining = assumeRemoved(
    items,
    items.filter((item, index) => !isRemoved(item, index)),
    what
  );
  node[key] = (remaining.length > 0 ? remaining : undefined) as N[K];
}

/**
 * Sets the properties of a node for which `values` has a value other than `undefined`, and leaves the
 * others as they are.
 *
 * @param node - The node to change
 * @param values - The new values
 * @returns The node
 */
export function assignDefined<T extends object>(node: T, values: Partial<T>): T {
  for (const key of Object.keys(values) as Array<keyof T>) {
    const value = values[key];
    if (value !== undefined) {
      node[key] = value;
    }
  }
  return node;
}
