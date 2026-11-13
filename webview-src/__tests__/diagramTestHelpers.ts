/**
 * Test helpers that build the diagram of a real schema, so that tests use the diagram items that the
 * user can select.
 */

import { schema } from "../../shared/types";
import { DiagramBuilder } from "../diagram/DiagramBuilder";
import type { DiagramItem } from "../diagram/DiagramItem";

/**
 * Builds the diagram of a schema and returns all its items, depth first. The diagram builder logs
 * every schema it builds, so tests that use it usually mock `console.log`.
 *
 * @param schemaObj - The schema
 * @returns The diagram items
 */
export function diagramItems(schemaObj: schema): DiagramItem[] {
  const items: DiagramItem[] = [];
  const collect = (item: DiagramItem): void => {
    items.push(item);
    item.childElements.forEach(collect);
  };
  new DiagramBuilder().buildFromSchema(schemaObj).rootElements.forEach(collect);
  return items;
}

/**
 * Builds the diagram of a schema and returns the item with the given ID.
 *
 * @param schemaObj - The schema
 * @param id - The ID of the item
 * @returns The item
 */
export function diagramItem(schemaObj: schema, id: string): DiagramItem {
  const item = diagramItems(schemaObj).find((candidate) => candidate.id === id);
  if (!item) {
    return expect.fail(`No diagram item ${id}`);
  }
  return item;
}
