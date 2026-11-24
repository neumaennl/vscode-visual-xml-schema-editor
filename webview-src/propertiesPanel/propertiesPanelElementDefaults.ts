/**
 * Default/fixed section rendering helpers for element nodes in the `PropertiesPanel`.
 */

import type { ModifyElementPayload, SchemaCommand } from "../../shared/types";
import { getDefaultValue, getFixedValue, type DiagramItem } from "../diagram";
import { createSection } from "./propertiesPanelDom";
import { createInputColumn } from "./propertiesPanelFields";

/** The part of a `modifyElement` payload that sets the default or the fixed value. */
type ValuePayload = Pick<ModifyElementPayload, "default_" | "fixed">;

/** The fields of the section: how each reads its value and how it sends it. */
const VALUE_FIELDS = [
  {
    label: "default",
    read: getDefaultValue,
    payload: (value: string): ValuePayload => ({ default_: value }),
  },
  {
    label: "fixed",
    read: getFixedValue,
    payload: (value: string): ValuePayload => ({ fixed: value }),
  },
];

/**
 * Renders the DEFAULT & FIXED section for element nodes.
 *
 * @param node - The selected element node
 * @param dispatchCommand - Callback used to emit schema commands
 * @returns The rendered default/fixed section
 */
export function renderElementDefaultFixedSection(
  node: DiagramItem,
  dispatchCommand: (command: SchemaCommand) => void
): HTMLElement {
  const section = createSection("wand", "DEFAULT & FIXED");

  const row = document.createElement("div");
  row.className = "property-row-2col";

  // An empty value removes the default or fixed value
  for (const field of VALUE_FIELDS) {
    const column = createInputColumn(
      field.label,
      field.read(node) ?? "",
      (val) => {
        dispatchCommand({ type: "modifyElement", payload: { elementId: node.id, ...field.payload(val) } });
      },
      "—"
    );
    row.appendChild(column);
  }
  section.appendChild(row);
  return section;
}
