/**
 * Properties-panel editor for the facets that can occur several times in a restriction:
 * enumeration values and patterns. Both are shown as a list of chips.
 */

import { RestrictionSnapshot } from "./propertiesPanelDraft";
import { getFacetIconStyle, type FacetPaletteConstruct } from "../palette/FacetIconStyles";
import { PaletteSchemaConstruct } from "../palette/PaletteSchemaConstruct";

/** Commits an update of the restriction draft. */
type BuildAndDispatch = (updater: (next: RestrictionSnapshot) => void) => void;

/** The facets with several values. */
export type ValueListFacet = "enumeration" | "pattern";

/** The icon, label and add button text of each facet with several values. */
const VALUE_LIST_FACETS: Record<
  ValueListFacet,
  { construct: FacetPaletteConstruct; label: string; addText: string }
> = {
  enumeration: { construct: PaletteSchemaConstruct.Enumeration, label: "Enumeration", addText: "+ value" },
  pattern: { construct: PaletteSchemaConstruct.Pattern, label: "Pattern", addText: "+ pattern" },
};

/** Title of the remove buttons that are disabled because the restriction needs a facet. */
const LAST_FACET_TITLE = "A restriction requires at least one facet";

/**
 * Turns a facet field into a removable facet by adding a remove button to it.
 *
 * @param field - The field of the facet
 * @param label - The label of the facet, used in the title of the button
 * @param canRemove - Whether the facet may be removed; the last facet of a restriction may not
 * @param onRemove - Called when the button is clicked
 * @returns The field
 */
export function appendFacetRemoveButton(
  field: HTMLElement,
  label: string,
  canRemove: boolean,
  onRemove: () => void
): HTMLElement {
  field.classList.add("property-facet");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "property-facet-remove property-docs-action-icon-only";
  button.disabled = !canRemove;
  button.setAttribute("aria-label", `Remove ${label} facet`);
  button.title = canRemove ? `Remove ${label} facet` : LAST_FACET_TITLE;

  const icon = document.createElement("span");
  icon.className = "codicon codicon-close";
  icon.setAttribute("aria-hidden", "true");
  button.appendChild(icon);
  button.addEventListener("click", onRemove);
  field.appendChild(button);
  return field;
}

/**
 * Renders a facet with several values as a list of chips that can be edited, removed and reordered by
 * dragging their grab handle, with a button that adds a value. A value that the list already contains is not added.
 *
 * @param root - Container to append the editor to
 * @param facet - The facet to edit
 * @param initialValues - The current values of the facet
 * @param buildAndDispatch - Callback used to commit a restriction-snapshot update
 * @param canRemove - Whether the facet may be removed; the last facet of a restriction may not
 * @param onRemove - Called when the whole facet is removed
 */
export function renderValueListFacet(
  root: HTMLElement,
  facet: ValueListFacet,
  initialValues: string[],
  buildAndDispatch: BuildAndDispatch,
  canRemove: boolean,
  onRemove: () => void
): void {
  const { construct, label, addText } = VALUE_LIST_FACETS[facet];
  const field = createFacetListField(construct, label, canRemove, onRemove);
  const list = document.createElement("div");
  list.className = "property-value-list";
  field.appendChild(list);

  let values = [...initialValues];
  let isAdding = false;
  let editedIndex: number | null = null;
  const drag: DragState = { index: null };

  const update = (next: string[]): void => {
    values = next;
    buildAndDispatch((draft) => {
      draft[facet] = values.length > 0 ? [...values] : undefined;
    });
    render();
  };

  /**
   * Finishes editing a value: an empty value removes it, an unchanged value, a value the list already
   * contains or a cancelled edit keeps the old value.
   */
  const finishEditing = (index: number, next: string | null): void => {
    editedIndex = null;
    const canRemoveValue = values.length > 1 || canRemove;
    if (next === "" && canRemoveValue) {
      update(values.filter((_, i) => i !== index));
    } else if (next && !values.includes(next)) {
      update(values.map((value, i) => (i === index ? next : value)));
    } else {
      render();
    }
  };

  const render = (): void => {
    list.replaceChildren();
    const canRemoveValue = values.length > 1 || canRemove;
    values.forEach((value, index) => {
      if (index === editedIndex) {
        const input = createValueInput(value, `Edit ${value}`, (next) => finishEditing(index, next));
        list.appendChild(input);
        input.focus();
        input.select();
        return;
      }
      const chip = createValueChip(
        value,
        canRemoveValue,
        () => {
          editedIndex = index;
          render();
        },
        () => update(values.filter((_, i) => i !== index))
      );
      if (values.length > 1) {
        addReorderHandlers(chip, index, list, drag, (sourceIndex) => {
          const next = moveValue(values, sourceIndex, index);
          if (next) {
            update(next);
          }
        });
      }
      list.appendChild(chip);
    });

    if (isAdding) {
      const input = createValueInput("", "New value", (next) => {
        isAdding = false;
        if (next && !values.includes(next)) {
          update([...values, next]);
        } else {
          render();
        }
      });
      list.appendChild(input);
      input.focus();
    } else {
      const addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className = "property-value-add-button";
      addButton.textContent = addText;
      addButton.addEventListener("click", () => {
        isAdding = true;
        render();
      });
      list.appendChild(addButton);
    }
  };

  render();
  root.appendChild(field);
}

/** The index of the chip that is being dragged, shared by the chips of one list; `null` without a drag. */
interface DragState {
  index: number | null;
}

/**
 * Creates the chip of a value. The value is a button that starts editing it, followed by a button
 * that removes it.
 *
 * @param value - The value
 * @param canRemove - Whether the value may be removed
 * @param onEdit - Called when the value is clicked
 * @param onRemove - Called when the remove button is clicked
 * @returns The chip
 */
function createValueChip(
  value: string,
  canRemove: boolean,
  onEdit: () => void,
  onRemove: () => void
): HTMLElement {
  const chip = document.createElement("span");
  chip.className = "property-value-chip";

  const valueButton = document.createElement("button");
  valueButton.type = "button";
  valueButton.className = "property-value-chip-text";
  valueButton.textContent = value;
  valueButton.setAttribute("aria-label", `Edit ${value}`);
  valueButton.title = "Click to edit";
  valueButton.addEventListener("click", onEdit);
  chip.appendChild(valueButton);

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "property-value-chip-remove";
  removeButton.setAttribute("aria-label", `Remove ${value}`);
  removeButton.disabled = !canRemove;
  removeButton.title = canRemove ? `Remove ${value}` : LAST_FACET_TITLE;
  const icon = document.createElement("span");
  icon.className = "codicon codicon-close";
  icon.setAttribute("aria-hidden", "true");
  removeButton.appendChild(icon);
  removeButton.addEventListener("click", onRemove);
  chip.appendChild(removeButton);
  return chip;
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
function addReorderHandlers(
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
function moveValue(values: readonly string[], sourceIndex: number, targetIndex: number): string[] | null {
  const isValid = (index: number): boolean => Number.isInteger(index) && index >= 0 && index < values.length;
  if (!isValid(sourceIndex) || !isValid(targetIndex) || sourceIndex === targetIndex) {
    return null;
  }
  const next = [...values];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

/**
 * Creates the text field for a new or an edited value. Enter and leaving the field finish the input;
 * Escape cancels it.
 *
 * @param value - The value to start with
 * @param label - The accessible name of the field
 * @param onFinish - Called once, with the trimmed value or with `null` when the input is cancelled
 * @returns The text field
 */
function createValueInput(value: string, label: string, onFinish: (value: string | null) => void): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "property-value-input";
  input.value = value;
  input.setAttribute("aria-label", label);
  let isFinished = false;
  const finish = (value: string | null): void => {
    if (!isFinished) {
      isFinished = true;
      onFinish(value);
    }
  };
  input.addEventListener("blur", () => finish(input.value.trim()));
  input.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      input.blur();
    }
    if (event.key === "Escape") {
      finish(null);
    }
  });
  return input;
}

/**
 * Creates the field of a facet with several values: a label with the icon of the facet and a button
 * that removes the whole facet.
 *
 * @param construct - The facet, for its icon
 * @param label - The label of the facet
 * @param canRemove - Whether the facet may be removed; the last facet of a restriction may not
 * @param onRemove - Called when the whole facet is removed
 * @returns The field, to which the editor appends its values
 */
function createFacetListField(
  construct: FacetPaletteConstruct,
  label: string,
  canRemove: boolean,
  onRemove: () => void
): HTMLElement {
  const field = document.createElement("div");
  field.className = "property";

  const labelElement = document.createElement("label");
  const labelIcon = document.createElement("span");
  const iconStyle = getFacetIconStyle(construct);
  labelIcon.className = `codicon codicon-${iconStyle.icon} property-facet-icon`;
  labelIcon.setAttribute("aria-hidden", "true");
  labelIcon.style.color = iconStyle.color;
  labelElement.appendChild(labelIcon);
  labelElement.appendChild(document.createTextNode(`${label}:`));
  field.appendChild(labelElement);
  return appendFacetRemoveButton(field, label, canRemove, onRemove);
}
