import { parseSchemaId, SchemaNodeType } from "../../shared/idStrategy";
import { DiagramItem } from "./DiagramItem";

export function isCompositorGroup(item: DiagramItem): boolean {
  try {
    const parsed = parseSchemaId(item.id);
    return (
      parsed.nodeType === SchemaNodeType.Group &&
      parsed.parentId !== undefined &&
      (parsed.name === "sequence" ||
        parsed.name === "choice" ||
        parsed.name === "all")
    );
  } catch {
    return false;
  }
}
