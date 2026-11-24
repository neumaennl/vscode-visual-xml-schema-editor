/**
 * Properties-panel editor for the facets that can occur several times in a restriction:
 * enumeration values and patterns. Both are shown as a list of chips.
 */

import { validateFacetValue } from "../../shared/facets";
import type { RestrictionFacets } from "../../shared/types";
import type { LIST_FACETS } from "../../shared/facets";
import { getFacetIconStyle } from "../facetIcons";
import { createFieldMessage } from "./propertiesPanelFields";
import { addReorderHandlers, type DragState, moveValue } from "./propertiesPanelValueReorder";
import type { ValidationFailure } from "../../shared/validation";

/** Commits an update of the restriction draft. */
type BuildAndDispatch = (updater: (next: RestrictionFacets) => void) => void;

/** The facets with several values. */
export type ValueListFacet = (typeof LIST_FACETS)[number];

/** The label and add button text of each facet with several values. */
const VALUE_LIST_FACETS: Record<ValueListFacet, { label: string; addText: string }> = {
  enumeration: { label: "Enumeration", addText: "+ value" },
  pattern: { label: "Pattern", addText: "+ pattern" },
};

/** Title of the remove buttons that are disabled because the restriction needs a facet. */
export const LAST_FACET_TITLE = "A restriction requires at least one facet";

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
  field.appendChild(
    createRemoveButton("property-facet-remove property-docs-action-icon-only", `${label} facet`, canRemove, onRemove)
  );
  return field;
}

/**
 * Creates a button with a close icon that removes a facet or a value. The last facet cannot be removed,
 * and the title of the disabled button says why.
 *
 * @param className - The CSS classes of the button
 * @param name - What the button removes, for its label and title
 * @param canRemove - Whether removing is allowed
 * @param onRemove - Called when the button is clicked
 * @returns The button
 */
function createRemoveButton(
  className: string,
  name: string,
  canRemove: boolean,
  onRemove: () => void
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.disabled = !canRemove;
  button.setAttribute("aria-label", `Remove ${name}`);
  button.title = canRemove ? `Remove ${name}` : LAST_FACET_TITLE;
  const icon = document.createElement("span");
  icon.className = "codicon codicon-close";
  icon.setAttribute("aria-hidden", "true");
  button.appendChild(icon);
  button.addEventListener("click", onRemove);
  return button;
}

/**
 * Renders a facet with several values as a list of chips that can be edited, removed and reordered by
 * dragging their grab handle, with a button that adds a value. A value that the list already contains is
 * rejected with a message below the list.
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
  const { label, addText } = VALUE_LIST_FACETS[facet];
  const field = createFacetListField(facet, label, canRemove, onRemove);
  const list = document.createElement("div");
  list.className = "property-value-list";
  field.appendChild(list);
  const message = createFieldMessage();
  field.appendChild(message);
  const reject = (text: string): void => {
    message.textContent = text;
    message.hidden = false;
    render();
  };

  let values = [...initialValues];
  let isAdding = false;
  let editedIndex: number | null = null;
  const drag: DragState = { index: null };

  const update = (next: string[]): void => {
    message.hidden = true;
    values = next;
    buildAndDispatch((draft) => {
      draft[facet] = values.length > 0 ? [...values] : undefined;
    });
    render();
  };

  const apply = (outcome: ValueListOutcome): void => {
    if (outcome === null) {
      render();
    } else if (outcome.valid) {
      update(outcome.values);
    } else {
      reject(outcome.error);
    }
  };

  const render = (): void => {
    list.replaceChildren();
    const canRemoveValue = values.length > 1 || canRemove;
    values.forEach((value, index) => {
      if (index === editedIndex) {
        const input = createValueInput(value, `Edit ${value}`, (next) => {
          editedIndex = null;
          apply(editOutcome(facet, values, index, next, values.length > 1 || canRemove));
        });
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
        () => {
          update(values.filter((_, i) => i !== index));
        }
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

    appendAddControl(
      list,
      isAdding ? null : addText,
      () => {
        isAdding = true;
        render();
      },
      (next) => {
        isAdding = false;
        apply(next ? checkedValues(facet, [...values, next]) : null);
      }
    );
  };

  render();
  root.appendChild(field);
}

/** What a change of a value list leads to: new values, a rejection with a message, or nothing to change. */
type ValueListOutcome = ({ valid: true; values: string[] } | ValidationFailure) | null;

/**
 * Checks new values of a facet with the shared rules, which reject a value the list already contains.
 *
 * @param facet - The facet
 * @param values - The new values
 * @returns The values, or why the facet does not allow them
 */
function checkedValues(facet: ValueListFacet, values: string[]): ValueListOutcome {
  const result = validateFacetValue(facet, values);
  return result.valid ? { valid: true, values } : result;
}

/**
 * Decides what finishing the edit of a value does: an empty value removes it, unless it is the last value
 * of the only facet; an unchanged value or a cancelled edit changes nothing; a new value is checked (see
 * {@link checkedValues}).
 *
 * @param facet - The facet
 * @param values - The current values
 * @param index - The index of the edited value
 * @param next - The new value, or null if the edit was cancelled
 * @param canRemoveValue - Whether a value may be removed
 * @returns What the edit leads to
 */
function editOutcome(
  facet: ValueListFacet,
  values: string[],
  index: number,
  next: string | null,
  canRemoveValue: boolean
): ValueListOutcome {
  if (next === "") {
    return canRemoveValue
      ? { valid: true, values: values.filter((_, i) => i !== index) }
      : { valid: false, error: LAST_FACET_TITLE };
  }
  if (next === null || next === values[index]) {
    return null;
  }
  return checkedValues(
    facet,
    values.map((value, i) => (i === index ? next : value))
  );
}

/**
 * Appends the button that adds a value, or, while a value is added, the field for it.
 *
 * @param list - The list of values
 * @param addText - The text of the button, or null while a value is added
 * @param onStart - Called when the button is clicked
 * @param onFinish - Called once with the new value, or with `null` when the input is cancelled
 */
function appendAddControl(
  list: HTMLElement,
  addText: string | null,
  onStart: () => void,
  onFinish: (value: string | null) => void
): void {
  if (addText === null) {
    const input = createValueInput("", "New value", onFinish);
    list.appendChild(input);
    input.focus();
    return;
  }
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "property-value-add-button";
  addButton.textContent = addText;
  addButton.addEventListener("click", onStart);
  list.appendChild(addButton);
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
function createValueChip(value: string, canRemove: boolean, onEdit: () => void, onRemove: () => void): HTMLElement {
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

  chip.appendChild(createRemoveButton("property-value-chip-remove", value, canRemove, onRemove));
  return chip;
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
  input.addEventListener("blur", () => {
    finish(input.value.trim());
  });
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
 * @param facet - The facet, for its icon
 * @param label - The label of the facet
 * @param canRemove - Whether the facet may be removed; the last facet of a restriction may not
 * @param onRemove - Called when the whole facet is removed
 * @returns The field, to which the editor appends its values
 */
function createFacetListField(
  facet: ValueListFacet,
  label: string,
  canRemove: boolean,
  onRemove: () => void
): HTMLElement {
  const field = document.createElement("div");
  field.className = "property";

  const labelElement = document.createElement("label");
  const labelIcon = document.createElement("span");
  const iconStyle = getFacetIconStyle(facet);
  labelIcon.className = `codicon codicon-${iconStyle.icon} property-facet-icon`;
  labelIcon.setAttribute("aria-hidden", "true");
  labelIcon.style.color = iconStyle.color;
  labelElement.appendChild(labelIcon);
  labelElement.appendChild(document.createTextNode(`${label}:`));
  field.appendChild(labelElement);
  return appendFacetRemoveButton(field, label, canRemove, onRemove);
}
