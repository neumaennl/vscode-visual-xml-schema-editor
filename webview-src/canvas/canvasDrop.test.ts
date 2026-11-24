/**
 * Unit tests of `canvasDrop`: highlighting the nodes that accept a dragged schema construct, and the drop.
 */

import { setUpNodeDrop, type NodeDropHandlers } from "./canvasDrop";
import { DiagramItem } from "../diagram";
import { DiagramItemType } from "../diagram/DiagramTypes";
import { setDraggedSchemaConstruct } from "../dragAndDrop/draggedSchemaConstruct";
import { DraggableSchemaConstruct } from "../dragAndDrop/DraggableSchemaConstruct";
import { emptyDiagram, NOT_READ_SCHEMA_OBJECT } from "../__tests__/diagramTestHelpers";

/** The node that the canvas shows. */
const ITEM = new DiagramItem("/element:Test", "Test", DiagramItemType.element, NOT_READ_SCHEMA_OBJECT, emptyDiagram());

/**
 * Creates a drag event.
 *
 * @param type - The type of the event, such as `drop` or `dragover`
 * @returns The event
 */
function dragEvent(type: string): DragEvent {
  return new Event(type, { bubbles: true, cancelable: true }) as DragEvent;
}

/**
 * Creates a `dragleave` event without a related target.
 *
 * @returns The event
 */
function dragLeaveEvent(): DragEvent {
  const event = new Event("dragleave", { bubbles: true }) as DragEvent;
  Object.defineProperty(event, "relatedTarget", { value: null });
  return event;
}

describe("setUpNodeDrop", () => {
  let itemGroup: SVGGElement;
  let itemChild: SVGRectElement;
  let handlers: {
    canDrop: ReturnType<typeof vi.fn<NodeDropHandlers["canDrop"]>>;
    drop: ReturnType<typeof vi.fn<NodeDropHandlers["drop"]>>;
  };

  beforeEach(() => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    itemGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    itemGroup.setAttribute("data-item-id", ITEM.id);
    itemChild = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    itemGroup.appendChild(itemChild);
    svg.appendChild(itemGroup);
    handlers = { canDrop: vi.fn(() => true), drop: vi.fn() };
    setUpNodeDrop(svg, (itemId) => (itemId === ITEM.id ? ITEM : null), handlers);
    setDraggedSchemaConstruct(DraggableSchemaConstruct.Element);
  });

  afterEach(() => {
    setDraggedSchemaConstruct(null);
  });

  test("should report a drop with the node and the dragged schema construct, and end the drag", () => {
    itemChild.dispatchEvent(dragEvent("drop"));

    expect(handlers.drop).toHaveBeenCalledWith(ITEM, DraggableSchemaConstruct.Element);
    expect(itemGroup.classList.contains("drag-over")).toBe(false);
  });

  test("should not report a drop that the node does not accept", () => {
    handlers.canDrop.mockReturnValue(false);

    itemChild.dispatchEvent(dragEvent("drop"));

    expect(handlers.drop).not.toHaveBeenCalled();
  });

  test("should ignore a drop when nothing is dragged from the palette", () => {
    setDraggedSchemaConstruct(null);

    itemChild.dispatchEvent(dragEvent("drop"));

    expect(handlers.canDrop).not.toHaveBeenCalled();
    expect(handlers.drop).not.toHaveBeenCalled();
  });

  test("should not highlight a node that does not accept the schema construct", () => {
    handlers.canDrop.mockReturnValue(false);

    itemChild.dispatchEvent(dragEvent("dragover"));

    expect(itemGroup.classList.contains("drag-over")).toBe(false);
  });

  test("should highlight a node that accepts the dragged schema construct", () => {
    itemChild.dispatchEvent(dragEvent("dragover"));

    expect(handlers.canDrop).toHaveBeenCalledWith(ITEM, DraggableSchemaConstruct.Element);
    expect(itemGroup.classList.contains("drag-over")).toBe(true);
  });

  test("should keep the highlight while the pointer is still inside the node", () => {
    itemGroup.classList.add("drag-over");
    // jsdom has no elementFromPoint()
    const documentWithElementFromPoint = document as Omit<Document, "elementFromPoint"> & {
      elementFromPoint?: (x: number, y: number) => Element | null;
    };
    const originalElementFromPoint = documentWithElementFromPoint.elementFromPoint?.bind(document);
    documentWithElementFromPoint.elementFromPoint = (): Element => itemChild;
    itemChild.dispatchEvent(dragLeaveEvent());

    expect(itemGroup.classList.contains("drag-over")).toBe(true);
    documentWithElementFromPoint.elementFromPoint = originalElementFromPoint;
  });

  test("should remove the highlight when the pointer leaves the node", () => {
    itemGroup.classList.add("drag-over");
    itemChild.dispatchEvent(dragLeaveEvent());

    expect(itemGroup.classList.contains("drag-over")).toBe(false);
  });
});
