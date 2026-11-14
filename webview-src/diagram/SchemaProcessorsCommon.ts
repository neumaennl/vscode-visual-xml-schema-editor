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
 * @param processContent - Optional function that adds the content of a schema item to its new diagram
 *   node before the node is added to the parent.
 */
export function processChildCollection<T>(
  parent: DiagramItem,
  items: T[] | undefined,
  createFn: (item: T) => DiagramItem | null,
  processContent?: (node: DiagramItem, item: T) => void
): void {
  for (const item of items ?? []) {
    const node = createFn(item);
    if (node) {
      processContent?.(node, item);
      parent.addChild(node);
    }
  }
}
