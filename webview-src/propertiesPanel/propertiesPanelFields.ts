/**
 * The text fields of the properties panel: an input that commits its value when it is left and can reject
 * it with a message below it, labelled fields with suggestions, fields with fixed values, and inputs
 * without a label.
 */

import type { FacetIconStyle } from "../facetIcons";

/** Makes the IDs of the lists of suggestions unique within the webview. */
let nextDatalistId = 0;

/**
 * Called when a field commits its text. It may reject the text with a message, which the field shows below
 * the input, putting back the last accepted value; callbacks that accept every text ignore `reject`.
 */
export type CommitHandler = (next: string, reject: (message: string) => void) => void;

/** A text input that commits its value, and the element that shows why a value was rejected. */
interface CommitInput {
  input: HTMLInputElement;
  message: HTMLElement;
}

/**
 * Creates the element below a field that says why the entered text was rejected; it is hidden until then.
 *
 * @returns The message element
 */
export function createFieldMessage(): HTMLElement {
  const message = document.createElement("div");
  message.className = "property-message";
  message.setAttribute("role", "alert");
  message.hidden = true;
  return message;
}

/**
 * Creates a text input that commits its value when it loses the focus; Enter commits it as well. A value
 * that equals the last accepted one is not committed, so leaving a field unchanged sends nothing, also when
 * a new rendering of the panel removes the focused input. If the callback rejects the text, the message
 * element shows why, and the input shows the last accepted value again; the message disappears with the
 * next accepted value.
 *
 * @param value - Initial value
 * @param onCommit - Callback invoked with the committed value
 * @returns The input and its message element, which the caller places below it
 */
function createCommitInput(value: string, onCommit: CommitHandler): CommitInput {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "property-input";
  input.value = value;
  const message = createFieldMessage();
  let accepted = value;
  input.addEventListener("blur", () => {
    if (input.value === accepted) {
      return;
    }
    let rejection: string | undefined;
    onCommit(input.value, (reason) => {
      rejection = reason;
    });
    message.hidden = rejection === undefined;
    if (rejection === undefined) {
      accepted = input.value;
    } else {
      message.textContent = rejection;
      input.value = accepted;
    }
  });
  input.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      input.blur();
    }
  });
  return { input, message };
}

/**
 * Creates a column of a two-column property row: a label above a text input that commits its value
 * like {@link createCommitInput}.
 *
 * @param label - The label
 * @param value - Initial value
 * @param onCommit - Callback invoked with the committed value
 * @param placeholder - Optional placeholder of the input
 * @returns The column
 */
export function createInputColumn(
  label: string,
  value: string,
  onCommit: CommitHandler,
  placeholder?: string
): HTMLElement {
  const column = document.createElement("div");
  column.className = "property-col";
  const labelEl = document.createElement("label");
  labelEl.textContent = label;
  const { input, message } = createCommitInput(value, onCommit);
  if (placeholder !== undefined) {
    input.placeholder = placeholder;
  }
  column.appendChild(labelEl);
  column.appendChild(input);
  column.appendChild(message);
  return column;
}

/**
 * Creates the label of a field, with the icon of a facet before it if one is given.
 *
 * @param label - The text of the label
 * @param icon - The icon of a facet, or undefined for none
 * @returns The label element
 */
function createFieldLabel(label: string, icon?: FacetIconStyle): HTMLLabelElement {
  const labelEl = document.createElement("label");
  if (icon) {
    const iconEl = document.createElement("span");
    iconEl.className = `codicon codicon-${icon.icon} property-facet-icon`;
    iconEl.setAttribute("aria-hidden", "true");
    if (icon.color) {
      iconEl.style.color = icon.color;
    }
    labelEl.appendChild(iconEl);
    labelEl.appendChild(document.createTextNode(`${label}:`));
  } else {
    labelEl.textContent = `${label}:`;
  }
  return labelEl;
}

/** A value that a field with fixed values offers: the value it stands for and the text it shows. */
export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Creates a labeled field whose value is one of a fixed set of values (see "Fields with fixed values" in
 * `docs/ux-concept.md`): a text field that suggests the values and filters them as the user types. It
 * accepts the label or the value of an option, ignoring case. Any other text is rejected with a message
 * below the field, and the field shows the current value again.
 *
 * @param label - Field label to show in the property row
 * @param value - The current value
 * @param options - The values to choose from, in the order they are suggested
 * @param onChange - Called with a new value; returns false if the change is not applied, which shows the
 * current value again
 * @param icon - Optional shared facet icon style shown before the label
 * @returns A DOM element containing the labeled field
 */
export function createChoiceField<T extends string>(
  label: string,
  value: T,
  options: ReadonlyArray<ChoiceOption<T>>,
  onChange: (next: T) => boolean,
  icon?: FacetIconStyle
): HTMLElement {
  const labelOf = (optionValue: T): string =>
    options.find((option) => option.value === optionValue)?.label ?? optionValue;
  const propertyDiv = document.createElement("div");
  propertyDiv.className = "property";
  propertyDiv.appendChild(createFieldLabel(label, icon));

  let current = value;
  const { input, message } = createCommitInput(labelOf(value), (text, reject) => {
    const entered = text.trim().toLowerCase();
    const next = options.find(
      (option) => option.label.toLowerCase() === entered || option.value.toLowerCase() === entered
    )?.value;
    if (next === undefined) {
      const choices = options.map((option) => option.label).join(", ");
      reject(`'${text.trim()}' is not a value of ${label}. Choose one of: ${choices}`);
      return;
    }
    if (next !== current && onChange(next)) {
      current = next;
    }
    // Shows the label of the value, also when the value was entered, and the current value if the change failed
    input.value = labelOf(current);
  });
  propertyDiv.appendChild(input);
  appendSuggestions(
    propertyDiv,
    input,
    options.map((option) => option.label)
  );
  propertyDiv.appendChild(message);
  return propertyDiv;
}

/**
 * Creates a labeled text input row for editable property values.
 *
 * @param label - Field label to show in the property row
 * @param value - Initial field value
 * @param onCommit - Callback invoked with the committed value
 * @param suggestions - Optional suggestion values rendered through a datalist
 * @param icon - Optional shared facet icon style shown before the label
 * @returns A DOM element containing the labeled input
 */
export function createEditableField(
  label: string,
  value: string,
  onCommit: CommitHandler,
  suggestions?: string[],
  icon?: FacetIconStyle
): HTMLElement {
  const propertyDiv = document.createElement("div");
  propertyDiv.className = "property";

  const labelEl = createFieldLabel(label, icon);
  const { input, message } = createCommitInput(value, onCommit);

  propertyDiv.appendChild(labelEl);
  propertyDiv.appendChild(input);
  appendSuggestions(propertyDiv, input, suggestions ?? []);
  propertyDiv.appendChild(message);
  return propertyDiv;
}

/** What a text input of {@link createTextInput} may have besides its value. */
export interface TextInputOptions {
  /** The suggested values */
  suggestions?: readonly string[];
  /** The placeholder of the input */
  placeholder?: string;
}

/**
 * Creates a text input without a label, which commits like the other fields and can reject the entered
 * text with a message below it. With suggestions, it suggests values for an open value, such as one of
 * several type references, and still accepts any text.
 *
 * @param value - Initial value
 * @param onCommit - Callback invoked with the committed value
 * @param options - Suggested values and a placeholder, both optional
 * @returns An element that holds the input, its suggestions and its message
 */
export function createTextInput(value: string, onCommit: CommitHandler, options: TextInputOptions = {}): HTMLElement {
  const wrapper = document.createElement("div");
  const { input, message } = createCommitInput(value, onCommit);
  if (options.placeholder !== undefined) {
    input.placeholder = options.placeholder;
  }
  wrapper.appendChild(input);
  appendSuggestions(wrapper, input, options.suggestions ?? []);
  wrapper.appendChild(message);
  return wrapper;
}

/**
 * Adds a list of suggestions to a text input, which the browser shows below it and filters as the user
 * types.
 *
 * @param field - The field that holds the input
 * @param input - The input
 * @param suggestions - The suggestions; empty and repeated entries are left out
 */
function appendSuggestions(field: HTMLElement, input: HTMLInputElement, suggestions: readonly string[]): void {
  const uniqueSuggestions = Array.from(new Set(suggestions.map((entry) => entry.trim()).filter(Boolean)));
  if (uniqueSuggestions.length === 0) {
    return;
  }
  const datalist = document.createElement("datalist");
  datalist.id = `property-input-suggestions-${nextDatalistId++}`;
  for (const suggestion of uniqueSuggestions) {
    const option = document.createElement("option");
    option.value = suggestion;
    datalist.appendChild(option);
  }
  input.setAttribute("list", datalist.id);
  field.appendChild(datalist);
}
