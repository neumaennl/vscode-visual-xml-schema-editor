import { parseSchemaId, SchemaNodeType } from "../../shared/idStrategy";
import type { DiagramItem } from "./DiagramItem";

/**
 * Tells whether the item is a compositor (sequence, choice or all), not a named group or a group
 * reference.
 *
 * @param item - The diagram item
 * @returns True for a compositor
 */
export function isCompositorGroup(item: DiagramItem): boolean {
  try {
    const parsed = parseSchemaId(item.id);
    return (
      parsed.nodeType === SchemaNodeType.Group &&
      parsed.parentId !== undefined &&
      (parsed.name === "sequence" || parsed.name === "choice" || parsed.name === "all")
    );
  } catch {
    return false;
  }
}
