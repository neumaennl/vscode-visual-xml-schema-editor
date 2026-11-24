/**
 * DOM-construction helpers for the `PropertiesPanel` UI.
 * This module centralizes small, reusable DOM fragments so the panel controller
 * can focus on state and command dispatch instead of element boilerplate.
 */

import type { DiagramAttribute } from "../diagram";

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
 * Creates a formatted list of the attributes of a node. An attribute without a type has an inline simple
 * type.
 *
 * @param attributes - The attributes of the node
 * @returns A DOM list element containing the node attributes
 */
export function createAttributeList(attributes: readonly DiagramAttribute[]): HTMLElement {
  const attrList = document.createElement("ul");
  attrList.className = "attribute-list";

  attributes.forEach((attr) => {
    const li = document.createElement("li");

    const nameStrong = document.createElement("strong");
    nameStrong.textContent = attr.name;
    li.appendChild(nameStrong);

    li.appendChild(document.createTextNode(`: ${attr.type ?? "inline simpleType"} `));

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
