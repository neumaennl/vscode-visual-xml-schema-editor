/**
 * Default/fixed section rendering helpers for element nodes in the PropertiesPanel.
 */

import { SchemaCommand } from "../../shared/types";
import { DiagramItem } from "../diagram";
import { createInputColumn, createSectionHeader } from "./propertiesPanelDom";

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
  section.appendChild(createSectionHeader("wand", "DEFAULT & FIXED"));

  const row = document.createElement("div");
  row.className = "property-row-2col";

  // An empty value removes the default or fixed value
  const defaultCol = createInputColumn("default", node.elementDefault ?? "", (val) => {
    node.elementDefault = val || undefined;
    dispatchCommand({ type: "modifyElement", payload: { elementId: node.id, default_: val } });
  }, "—");
  const fixedCol = createInputColumn("fixed", node.elementFixed ?? "", (val) => {
    node.elementFixed = val || undefined;
    dispatchCommand({ type: "modifyElement", payload: { elementId: node.id, fixed: val } });
  }, "—");

  row.appendChild(defaultCol);
  row.appendChild(fixedCol);
  section.appendChild(row);
  return section;
}
