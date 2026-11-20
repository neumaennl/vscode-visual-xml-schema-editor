/**
 * DOM-construction helpers for the `PropertiesPanel` UI.
 * This module centralizes small, reusable DOM fragments so the panel controller
 * can focus on state and command dispatch instead of element boilerplate.
 */

import type { DiagramItem } from "../diagram";
import type { FacetIconStyle } from "../facetIcons";

let nextDatalistId = 0;

/**
 * Appends a read-only label/value pair to the properties panel.
 *
 * @param container - Parent element receiving the property row
 * @param label - Human-readable property label
 * @param value - Read-only text value to render
 */
export function addPropertyToContainer(container: HTMLElement, label: string, value: string): void {
  const propertyDiv = document.createElement("div");
  propertyDiv.className = "property";

  const labelEl = document.createElement("label");
  labelEl.textContent = `${label}:`;

  const valueEl = document.createElement("span");
  valueEl.textContent = value;

  propertyDiv.appendChild(labelEl);
  propertyDiv.appendChild(valueEl);
  container.appendChild(propertyDiv);
}

/**
 * Appends a labeled custom element to the properties panel.
 *
 * @param container - Parent element receiving the property row
 * @param label - Human-readable property label
 * @param element - Custom element to render as the property value
 */
export function addPropertyWithElementToContainer(container: HTMLElement, label: string, element: HTMLElement): void {
  const propertyDiv = document.createElement("div");
  propertyDiv.className = "property";

  const labelEl = document.createElement("label");
  labelEl.textContent = `${label}:`;

  propertyDiv.appendChild(labelEl);
  propertyDiv.appendChild(element);
  container.appendChild(propertyDiv);
}

/**
 * Creates a formatted list of attribute metadata for a diagram node.
 *
 * @param node - Diagram node whose attributes should be rendered
 * @returns A DOM list element containing the node attributes
 */
export function createAttributeList(node: DiagramItem): HTMLElement {
  const attrList = document.createElement("ul");
  attrList.className = "attribute-list";

  node.attributes.forEach((attr) => {
    const li = document.createElement("li");

    const nameStrong = document.createElement("strong");
    nameStrong.textContent = attr.name;
    li.appendChild(nameStrong);

    li.appendChild(document.createTextNode(`: ${attr.type} `));

    const use = document.createElement("span");
    use.className = "attr-use";
    use.textContent = `(${attr.use ?? "optional"})`;
    li.appendChild(use);

    if (attr.defaultValue) {
      const defaultSpan = document.createElement("span");
      defaultSpan.className = "attr-default";
      defaultSpan.textContent = `default: ${attr.defaultValue}`;
      li.appendChild(defaultSpan);
    }
    if (attr.fixedValue) {
      const fixedSpan = document.createElement("span");
      fixedSpan.className = "attr-fixed";
      fixedSpan.textContent = `fixed: ${attr.fixedValue}`;
      li.appendChild(fixedSpan);
    }

    attrList.appendChild(li);
  });
  return attrList;
}

/**
 * Creates a section header with an icon and uppercase label, matching the
 * style used in the CARDINALITY / CONSTRAINTS / DEFAULT & FIXED sections.
 *
 * @param icon - VS Code codicon name (without the `"codicon-"` prefix)
 * @param label - Uppercase section label text
 * @returns A DOM element containing the styled section header
 */
export function createSectionHeader(icon: string, label: string): HTMLElement {
  const header = document.createElement("div");
  header.className = "property-section-header";

  const iconEl = document.createElement("span");
  iconEl.className = `codicon codicon-${icon}`;
  iconEl.setAttribute("aria-hidden", "true");

  const labelEl = document.createElement("span");
  labelEl.className = "property-section-header-label";
  labelEl.textContent = label;

  header.appendChild(iconEl);
  header.appendChild(labelEl);
  return header;
}

/**
 * Creates a section of the General tab with its header.
 *
 * @param icon - VS Code codicon name (without the `"codicon-"` prefix)
 * @param label - Uppercase section label text
 * @returns The section, which already contains the header
 */
export function createSection(icon: string, label: string): HTMLElement {
  const section = document.createElement("div");
  section.className = "property-section";
  section.appendChild(createSectionHeader(icon, label));
  return section;
}

/**
 * Creates the properties-panel header shown above the tabs.
 *
 * @param nodeTypeLabel - User-facing label of the selected node type
 * @param nodeId - Stable identifier of the selected node
 * @param onDelete - Optional callback to invoke when the delete button is clicked
 * @returns A DOM element containing the node-type label and optional delete action
 */
export function createPropertiesPanelHeader(nodeTypeLabel: string, nodeId: string, onDelete?: () => void): HTMLElement {
  const header = document.createElement("div");
  header.className = "properties-panel-header";

  const typeBadge = document.createElement("span");
  typeBadge.className = "properties-panel-header-badge";
  typeBadge.setAttribute("aria-hidden", "true");
  typeBadge.textContent = nodeTypeLabel.charAt(0);
  header.appendChild(typeBadge);

  const heading = document.createElement("div");
  heading.className = "properties-panel-header-heading";
  const title = document.createElement("span");
  title.className = "properties-panel-header-title";
  title.textContent = "Properties";

  const type = document.createElement("span");
  type.className = "properties-panel-header-type";
  type.textContent = nodeTypeLabel;

  const nodeIdLabel = document.createElement("span");
  nodeIdLabel.className = "properties-panel-header-id";
  nodeIdLabel.textContent = nodeId;

  const metadata = document.createElement("div");
  metadata.className = "properties-panel-header-metadata";
  metadata.append(type, nodeIdLabel);
  heading.append(title, metadata);
  header.appendChild(heading);

  if (onDelete) {
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "property-docs-action property-docs-action-destructive property-docs-action-icon-only";
    deleteButton.setAttribute("aria-label", "Delete node");
    deleteButton.title = "Delete node";

    const iconSpan = document.createElement("span");
    iconSpan.className = "codicon codicon-trash";
    iconSpan.setAttribute("aria-hidden", "true");
    deleteButton.appendChild(iconSpan);

    deleteButton.addEventListener("click", onDelete);
    header.appendChild(deleteButton);
  }

  return header;
}

/**
 * Creates a labeled toggle switch row.
 *
 * @param label - Human-readable label shown beside the toggle
 * @param checked - Initial on/off state
 * @param onChange - Callback invoked with the new boolean value when toggled
 * @returns A DOM element containing the toggle row
 */
export function createToggleRow(label: string, checked: boolean, onChange: (next: boolean) => void): HTMLElement {
  const row = document.createElement("div");
  row.className = "property-toggle-row";

  const labelEl = document.createElement("span");
  labelEl.className = "property-toggle-label";
  labelEl.textContent = label;

  const toggleLabel = document.createElement("label");
  toggleLabel.className = "property-toggle";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = checked;
  checkbox.addEventListener("change", () => {
    onChange(checkbox.checked);
  });

  const slider = document.createElement("span");
  slider.className = "property-toggle-slider";

  toggleLabel.appendChild(checkbox);
  toggleLabel.appendChild(slider);

  row.appendChild(labelEl);
  row.appendChild(toggleLabel);
  return row;
}

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
 * Creates a text input that commits its value when it loses the focus; Enter commits it as well. If the
 * callback rejects the text, the message element shows why, and the input shows the last accepted value
 * again; the message disappears with the next accepted value.
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
  const message = document.createElement("div");
  message.className = "property-message";
  message.setAttribute("role", "alert");
  message.hidden = true;
  let accepted = value;
  input.addEventListener("blur", () => {
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

/**
 * Creates a text input with suggestions without a label, for a value that is open, such as one of several
 * type references: it suggests values and accepts any text, and commits it like the other fields.
 *
 * @param value - Initial value
 * @param suggestions - The suggested values
 * @param onCommit - Callback invoked with the committed value
 * @param placeholder - Optional placeholder of the input
 * @returns An element that holds the input and its suggestions
 */
export function createSuggestionInput(
  value: string,
  suggestions: readonly string[],
  onCommit: CommitHandler,
  placeholder?: string
): HTMLElement {
  const wrapper = document.createElement("div");
  const { input, message } = createCommitInput(value, onCommit);
  if (placeholder !== undefined) {
    input.placeholder = placeholder;
  }
  wrapper.appendChild(input);
  appendSuggestions(wrapper, input, suggestions);
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

/**
 * Creates a textarea used for multi-line documentation editing.
 *
 * @param value - Initial textarea content
 * @param onCommit - Callback invoked when the textarea loses focus
 * @returns The created textarea element
 */
export function createEditableTextArea(value: string, onCommit: (next: string) => void): HTMLElement {
  const textArea = document.createElement("textarea");
  textArea.className = "property-docs-input";
  textArea.value = value;
  textArea.addEventListener("blur", () => {
    onCommit(textArea.value);
  });
  return textArea;
}
