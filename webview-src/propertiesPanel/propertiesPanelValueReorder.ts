/**
 * Reordering the values of a facet with several values, such as an enumeration, by dragging their grab
 * handle.
 */

/** The index of the chip that is being dragged, shared by the chips of one list; `null` without a drag. */
export interface DragState {
  index: number | null;
}

/**
 * Adds a grab handle to a chip, like the one of the palette items, that drags the chip onto another
 * chip of the same list to move its value there. Only the handle starts a drag, so that clicking and
 * selecting the value edits it.
 *
 * @param chip - The chip
 * @param index - The index of the chip's value
 * @param list - The list that holds the chips
 * @param drag - The drag state shared by the chips of the list
 * @param onDropFrom - Called with the index of the dragged value when a chip is dropped on this one
 */
export function addReorderHandlers(
  chip: HTMLElement,
  index: number,
  list: HTMLElement,
  drag: DragState,
  onDropFrom: (sourceIndex: number) => void
): void {
  const grip = document.createElement("span");
  grip.className = "codicon codicon-gripper property-value-chip-grip";
  grip.draggable = true;
  grip.title = "Drag to reorder";
  grip.setAttribute("aria-hidden", "true");
  chip.prepend(grip);

  grip.addEventListener("dragstart", (event) => {
    drag.index = index;
    if (event.dataTransfer) {
      // Some browsers start a drag only with data
      event.dataTransfer.setData("text/plain", String(index));
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setDragImage(chip, 0, 0);
    }
    chip.classList.add("property-value-chip-dragging");
  });
  grip.addEventListener("dragend", () => {
    chip.classList.remove("property-value-chip-dragging");
    list.querySelectorAll(".property-value-chip-drag-over").forEach((element) => {
      element.classList.remove("property-value-chip-drag-over");
    });
    drag.index = null;
  });
  chip.addEventListener("dragover", (event) => {
    if (drag.index === null) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    chip.classList.add("property-value-chip-drag-over");
  });
  chip.addEventListener("dragleave", () => {
    chip.classList.remove("property-value-chip-drag-over");
  });
  chip.addEventListener("drop", (event) => {
    if (drag.index === null) {
      return;
    }
    event.preventDefault();
    chip.classList.remove("property-value-chip-drag-over");
    onDropFrom(drag.index);
  });
}

/**
 * Moves a value to another position.
 *
 * @param values - The values
 * @param sourceIndex - The current index of the value
 * @param targetIndex - The new index of the value
 * @returns The reordered values, or `null` if an index is invalid or both are the same
 */
export function moveValue(values: readonly string[], sourceIndex: number, targetIndex: number): string[] | null {
  const isValid = (index: number): boolean => Number.isInteger(index) && index >= 0 && index < values.length;
  const moved = values[sourceIndex];
  if (moved === undefined || !isValid(sourceIndex) || !isValid(targetIndex) || sourceIndex === targetIndex) {
    return null;
  }
  const next = values.filter((_, index) => index !== sourceIndex);
  next.splice(targetIndex, 0, moved);
  return next;
}
