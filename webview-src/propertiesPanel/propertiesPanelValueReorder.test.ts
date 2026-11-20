/**
 * Unit tests of `propertiesPanelValueReorder`.
 */

import { addReorderHandlers, type DragState, moveValue } from "./propertiesPanelValueReorder";
import { createDataTransfer, dispatchDrag } from "../__tests__/dragTestHelpers";

/** Two chips of one list, each with reorder handlers, and the drop callbacks of each. */
interface ReorderList {
  list: HTMLElement;
  chips: HTMLElement[];
  grips: HTMLElement[];
  drag: DragState;
  onDropFrom: Array<ReturnType<typeof vi.fn<(sourceIndex: number) => void>>>;
}

/**
 * Creates a list with two chips and adds the reorder handlers to both.
 *
 * @returns The list, the chips, their grab handles, the shared drag state and the drop callbacks
 */
function createList(): ReorderList {
  const list = document.createElement("div");
  const drag: DragState = { index: null };
  const chips = [0, 1].map(() => document.createElement("span"));
  const onDropFrom = chips.map(() => vi.fn<(sourceIndex: number) => void>());
  chips.forEach((chip, index) => {
    list.appendChild(chip);
    addReorderHandlers(chip, index, list, drag, onDropFrom[index]!);
  });
  const grips = chips.map((chip) => chip.querySelector<HTMLElement>(".property-value-chip-grip")!);
  return { list, chips, grips, drag, onDropFrom };
}

describe("addReorderHandlers", () => {
  test("should put a draggable grab handle at the start of the chip", () => {
    const { chips, grips } = createList();

    expect(chips[0]!.firstElementChild).toBe(grips[0]);
    expect(grips[0]!.draggable).toBe(true);
    expect(grips[0]!.title).toBe("Drag to reorder");
  });

  test("should remember the dragged chip, mark it and allow moving it", () => {
    const { chips, grips, drag } = createList();
    const dataTransfer = createDataTransfer();

    dispatchDrag(grips[0]!, "dragstart", dataTransfer);

    expect(drag.index).toBe(0);
    expect(chips[0]!.classList).toContain("property-value-chip-dragging");
    expect(dataTransfer.effectAllowed).toBe("move");
    expect(dataTransfer.getData("text/plain")).toBe("0");
  });

  test("should accept a drag over another chip and mark it until the pointer leaves", () => {
    const { chips, grips } = createList();
    const dataTransfer = createDataTransfer();
    dispatchDrag(grips[0]!, "dragstart", dataTransfer);

    const dragOver = dispatchDrag(chips[1]!, "dragover", dataTransfer);

    expect(dragOver.defaultPrevented).toBe(true);
    expect(dataTransfer.dropEffect).toBe("move");
    expect(chips[1]!.classList).toContain("property-value-chip-drag-over");
    dispatchDrag(chips[1]!, "dragleave", dataTransfer);
    expect(chips[1]!.classList).not.toContain("property-value-chip-drag-over");
  });

  test("should report the dragged index to the chip it is dropped on", () => {
    const { chips, grips, onDropFrom } = createList();
    dispatchDrag(grips[0]!, "dragstart");
    dispatchDrag(chips[1]!, "dragover");

    const drop = dispatchDrag(chips[1]!, "drop");

    expect(drop.defaultPrevented).toBe(true);
    expect(onDropFrom[1]).toHaveBeenCalledExactlyOnceWith(0);
    expect(chips[1]!.classList).not.toContain("property-value-chip-drag-over");
  });

  test("should remove the marks and forget the drag when it ends", () => {
    const { chips, grips, drag } = createList();
    dispatchDrag(grips[0]!, "dragstart");
    dispatchDrag(chips[1]!, "dragover");

    dispatchDrag(grips[0]!, "dragend");

    expect(drag.index).toBeNull();
    expect(chips[0]!.classList).not.toContain("property-value-chip-dragging");
    expect(chips[1]!.classList).not.toContain("property-value-chip-drag-over");
  });

  test("should ignore a drag that does not come from a chip of the list", () => {
    const { chips, onDropFrom } = createList();

    expect(dispatchDrag(chips[1]!, "dragover").defaultPrevented).toBe(false);
    expect(dispatchDrag(chips[1]!, "drop").defaultPrevented).toBe(false);
    expect(onDropFrom[1]).not.toHaveBeenCalled();
  });
});

describe("moveValue", () => {
  test.each([
    { source: 0, target: 2, expected: ["B", "C", "A"] },
    { source: 2, target: 0, expected: ["C", "A", "B"] },
    { source: 1, target: 2, expected: ["A", "C", "B"] },
  ])("should move the value at $source to $target", ({ source, target, expected }) => {
    expect(moveValue(["A", "B", "C"], source, target)).toEqual(expected);
  });

  test.each([
    ["the same index", 1, 1],
    ["a source index outside the list", 3, 0],
    ["a target index outside the list", 0, 3],
    ["a negative index", -1, 0],
    ["an index that is no integer", 0.5, 1],
  ])("should return null for %s", (_case, source, target) => {
    expect(moveValue(["A", "B", "C"], source, target)).toBeNull();
  });

  test("should not change the given values", () => {
    const values = ["A", "B"];

    moveValue(values, 0, 1);

    expect(values).toEqual(["A", "B"]);
  });
});
