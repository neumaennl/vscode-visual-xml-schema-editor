/**
 * DOM-construction helpers for the PropertyPanel UI.
 * This module centralizes small, reusable DOM fragments so the panel controller
 * can focus on state and command dispatch instead of element boilerplate.
 */

import { DiagramItem } from "../diagram";

let nextDatalistId = 0;

/**
 * Appends a read-only label/value pair to the property panel.
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
 * Appends a labeled custom element to the property panel.
 *
 * @param container - Parent element receiving the property row
 * @param label - Human-readable property label
 * @param element - Custom element to render as the property value
 */
export function addPropertyWithElementToContainer(
  container: HTMLElement,
  label: string,
  element: HTMLElement
): void {
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
    use.textContent = `(${attr.use || "optional"})`;
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
 * @param icon - VS Code codicon name (without the "codicon-" prefix)
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
 * Creates a labeled toggle switch row.
 *
 * @param label - Human-readable label shown beside the toggle
 * @param checked - Initial on/off state
 * @param onChange - Callback invoked with the new boolean value when toggled
 * @returns A DOM element containing the toggle row
 */
export function createToggleRow(
  label: string,
  checked: boolean,
  onChange: (next: boolean) => void
): HTMLElement {
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
  checkbox.addEventListener("change", () => onChange(checkbox.checked));

  const slider = document.createElement("span");
  slider.className = "property-toggle-slider";

  toggleLabel.appendChild(checkbox);
  toggleLabel.appendChild(slider);

  row.appendChild(labelEl);
  row.appendChild(toggleLabel);
  return row;
}

/**
 * Creates a labeled text input row for editable property values.
 *
 * @param label - Field label to show in the property row
 * @param value - Initial field value
 * @param onCommit - Callback invoked with the committed value
 * @param suggestions - Optional suggestion values rendered through a datalist
 * @returns A DOM element containing the labeled input
 */
export function createEditableField(
  label: string,
  value: string,
  onCommit: (next: string) => void,
  suggestions?: string[]
): HTMLElement {
  const propertyDiv = document.createElement("div");
  propertyDiv.className = "property";

  const labelEl = document.createElement("label");
  labelEl.textContent = `${label}:`;

  const input = document.createElement("input");
  input.type = "text";
  input.className = "property-input";
  input.value = value;
  input.addEventListener("blur", () => onCommit(input.value));
  input.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      input.blur();
    }
  });

  propertyDiv.appendChild(labelEl);
  propertyDiv.appendChild(input);

  const uniqueSuggestions = suggestions
    ? Array.from(new Set(suggestions.map((entry) => entry.trim()).filter(Boolean)))
    : [];
  if (uniqueSuggestions.length > 0) {
    const datalist = document.createElement("datalist");
    datalist.id = `property-input-suggestions-${nextDatalistId++}`;
    for (const suggestion of uniqueSuggestions) {
      const option = document.createElement("option");
      option.value = suggestion;
      datalist.appendChild(option);
    }
    input.setAttribute("list", datalist.id);
    propertyDiv.appendChild(datalist);
  }

  return propertyDiv;
}

/**
 * Creates a textarea used for multi-line documentation editing.
 *
 * @param value - Initial textarea content
 * @param onCommit - Callback invoked when the textarea loses focus
 * @returns The created textarea element
 */
export function createEditableTextArea(
  value: string,
  onCommit: (next: string) => void
): HTMLElement {
  const textArea = document.createElement("textarea");
  textArea.className = "property-docs-input";
  textArea.value = value;
  textArea.addEventListener("blur", () => onCommit(textArea.value));
  return textArea;
}
