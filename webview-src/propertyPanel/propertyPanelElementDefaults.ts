/**
 * Default/fixed section rendering helpers for element nodes in the PropertyPanel.
 */

import { SchemaCommand } from "../../shared/types";
import { DiagramItem } from "../diagram";
import { createSectionHeader } from "./propertyPanelDom";

/**
 * Renders the DEFAULT & FIXED section for element nodes.
 *
 * @param node - Draft element node being edited
 * @param dispatchCommand - Callback used to emit schema commands
 * @returns The rendered default/fixed section
 */
export function renderElementDefaultFixedSection(
  node: DiagramItem,
  dispatchCommand: (command: SchemaCommand) => void
): HTMLElement {
  const section = document.createElement("div");
  section.className = "property-section";
  section.appendChild(createSectionHeader("edit", "DEFAULT & FIXED"));

  const row = document.createElement("div");
  row.className = "property-row-2col";

  const defaultCol = document.createElement("div");
  defaultCol.className = "property-col";
  const defaultLabel = document.createElement("label");
  defaultLabel.textContent = "default";
  const defaultInput = document.createElement("input");
  defaultInput.type = "text";
  defaultInput.className = "property-input";
  defaultInput.value = node.elementDefault ?? "";
  defaultInput.placeholder = "—";
  defaultInput.addEventListener("blur", () => {
    const val = defaultInput.value;
    node.elementDefault = val || undefined;
    dispatchCommand({
      type: "modifyElement",
      payload: { elementId: node.id, default_: val },
    });
  });
  defaultInput.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); defaultInput.blur(); }
  });
  defaultCol.appendChild(defaultLabel);
  defaultCol.appendChild(defaultInput);

  const fixedCol = document.createElement("div");
  fixedCol.className = "property-col";
  const fixedLabel = document.createElement("label");
  fixedLabel.textContent = "fixed";
  const fixedInput = document.createElement("input");
  fixedInput.type = "text";
  fixedInput.className = "property-input";
  fixedInput.value = node.elementFixed ?? "";
  fixedInput.placeholder = "—";
  fixedInput.addEventListener("blur", () => {
    const val = fixedInput.value;
    node.elementFixed = val || undefined;
    dispatchCommand({
      type: "modifyElement",
      payload: { elementId: node.id, fixed: val },
    });
  });
  fixedInput.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); fixedInput.blur(); }
  });
  fixedCol.appendChild(fixedLabel);
  fixedCol.appendChild(fixedInput);

  row.appendChild(defaultCol);
  row.appendChild(fixedCol);
  section.appendChild(row);
  return section;
}
