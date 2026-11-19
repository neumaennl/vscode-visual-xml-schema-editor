/**
 * Dropping schema constructs on the nodes of the canvas: highlights the nodes that accept the dragged
 * schema construct and reports the drop.
 */

import type { DiagramItem } from "../diagram";
import type { DraggableSchemaConstruct } from "../dragAndDrop/DraggableSchemaConstruct";
import { getDraggedSchemaConstruct, setDraggedSchemaConstruct } from "../dragAndDrop/draggedSchemaConstruct";

/** Decides which nodes accept a schema construct and handles the drop. */
export interface NodeDropHandlers {
  /**
   * @param item - The node under the pointer
   * @param schemaConstruct - The dragged schema construct
   * @returns Whether the node accepts the schema construct
   */
  canDrop(item: DiagramItem, schemaConstruct: DraggableSchemaConstruct): boolean;
  /**
   * @param item - The node the schema construct was dropped on
   * @param schemaConstruct - The dropped schema construct
   */
  drop(item: DiagramItem, schemaConstruct: DraggableSchemaConstruct): void;
}

/** The node under a drag event and whether it accepts the dragged schema construct. */
interface DropTarget {
  itemGroup: Element;
  item: DiagramItem | null;
  schemaConstruct: DraggableSchemaConstruct | null;
  canDrop: boolean;
}

/** The class of a node that accepts the dragged schema construct. */
const DRAG_OVER_CLASS = "drag-over";

/**
 * Handles dragging schema constructs over the nodes of the canvas and dropping them.
 *
 * @param svg - The SVG canvas
 * @param findItem - Finds the diagram item of a node by its ID
 * @param handlers - Decide which nodes accept a schema construct and handle the drop
 */
export function setUpNodeDrop(
  svg: SVGSVGElement,
  findItem: (itemId: string | null) => DiagramItem | null,
  handlers: NodeDropHandlers
): void {
  const dropTarget = (event: DragEvent): DropTarget | null => {
    const target = event.target;
    const itemGroup = target instanceof Element ? target.closest("[data-item-id]") : null;
    if (!itemGroup) {
      return null;
    }
    const item = findItem(itemGroup.getAttribute("data-item-id"));
    const schemaConstruct = getDraggedSchemaConstruct();
    const canDrop = item !== null && schemaConstruct !== null && handlers.canDrop(item, schemaConstruct);
    return { itemGroup, item, schemaConstruct, canDrop };
  };

  svg.addEventListener("dragover", (event: DragEvent) => {
    const target = dropTarget(event);
    if (!target) {
      return;
    }
    if (!target.canDrop) {
      target.itemGroup.classList.remove(DRAG_OVER_CLASS);
      return;
    }
    event.preventDefault();
    target.itemGroup.classList.add(DRAG_OVER_CLASS);
  });

  svg.addEventListener("dragleave", (event: DragEvent) => {
    const itemGroup = (event.target as Element).closest("[data-item-id]");
    if (itemGroup && !isStillInside(itemGroup, event)) {
      itemGroup.classList.remove(DRAG_OVER_CLASS);
    }
  });

  svg.addEventListener("drop", (event: DragEvent) => {
    const target = dropTarget(event);
    if (!target?.canDrop || !target.item || !target.schemaConstruct) {
      return;
    }
    event.preventDefault();
    target.itemGroup.classList.remove(DRAG_OVER_CLASS);
    handlers.drop(target.item, target.schemaConstruct);
    setDraggedSchemaConstruct(null);
  });
}

/**
 * Tells whether the pointer is still inside a node when a `dragleave` event fires for one of its parts.
 *
 * @param itemGroup - The SVG group of the node
 * @param event - The `dragleave` event
 * @returns True if the pointer moved to another part of the same node
 */
function isStillInside(itemGroup: Element, event: DragEvent): boolean {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- jsdom, which runs the tests, has no elementFromPoint()
  const underPointer = document.elementFromPoint?.(event.clientX, event.clientY);
  if (underPointer && itemGroup.contains(underPointer)) {
    return true;
  }
  const relatedTarget = event.relatedTarget;
  return relatedTarget instanceof Node && itemGroup.contains(relatedTarget);
}
