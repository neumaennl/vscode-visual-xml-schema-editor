/**
 * Shared helpers for processing schema collections into diagram children.
 */

import { DiagramItem } from "./DiagramItem";

/**
 * Processes a collection of schema items and adds the resulting diagram nodes to a parent.
 *
 * @param parent - Parent diagram item that should receive the created child nodes.
 * @param items - An array of items, or undefined.
 * @param createFn - Factory used to turn each schema item into a diagram node.
 */
export function processChildCollection<T>(
  parent: DiagramItem,
  items: T[] | undefined,
  createFn: (item: T) => DiagramItem | null
): void {
  for (const item of items ?? []) {
    const node = createFn(item);
    if (node) {
      parent.addChild(node);
    }
  }
}
