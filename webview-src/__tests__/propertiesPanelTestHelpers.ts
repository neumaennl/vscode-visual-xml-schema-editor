/**
 * Helpers that create the properties panel and find its fields by their labels.
 */

import { PropertiesPanel } from "../propertiesPanel/propertiesPanel";
import { Diagram } from "../diagram/Diagram";
import { DiagramItem } from "../diagram/DiagramItem";
import { DiagramItemType } from "../diagram/DiagramTypes";
import type { SchemaCommand } from "../../shared/types";
import type { Mock } from "vitest";
import { schema } from "../../shared/types";
import { NOT_READ_SCHEMA_OBJECT } from "./diagramTestHelpers";

/**
 * Returns the first label of the container whose text is the given label with a colon.
 *
 * @param container - The element that holds the panel
 * @param label - The label without the colon
 * @returns The label, or `undefined` if there is none
 */
function findLabel(container: HTMLElement, label: string): HTMLLabelElement | undefined {
  return Array.from(container.querySelectorAll("label")).find((candidate) => candidate.textContent === `${label}:`);
}

/**
 * Returns the input of the field with the given label and fails the test if there is none.
 *
 * @param container - The element that holds the panel
 * @param label - The label without the colon
 * @returns The input
 * @throws An {@link Error} if the field has no input
 */
export function getInputByLabel(container: HTMLElement, label: string): HTMLInputElement {
  const match = findLabel(container, label);
  expect(match).toBeDefined();
  const input = match?.parentElement?.querySelector("input");
  if (!input) {
    throw new Error(`The field ${label} has no input`);
  }
  return input;
}

/**
 * Returns all inputs of the field with the given label, such as the member types of a union, and fails the
 * test if there is none.
 *
 * @param container - The element that holds the panel
 * @param label - The label without the colon
 * @returns The inputs, in document order
 */
export function getInputsByLabel(container: HTMLElement, label: string): HTMLInputElement[] {
  const match = findLabel(container, label);
  expect(match).toBeDefined();
  const inputs = Array.from(match?.parentElement?.querySelectorAll("input") ?? []);
  expect(inputs.length).toBeGreaterThan(0);
  return inputs;
}

/**
 * Returns the values of the chips of the field with the given label, such as the values of an
 * enumeration, and fails the test if there is no such field.
 *
 * @param container - The element that holds the panel
 * @param label - The label without the colon
 * @returns The values, in document order
 */
export function getChipValuesByLabel(container: HTMLElement, label: string): string[] {
  const match = findLabel(container, label);
  expect(match).toBeDefined();
  const chips = Array.from(match?.parentElement?.querySelectorAll(".property-value-chip") ?? []);
  return chips.map((chip) => chip.textContent);
}

/**
 * Returns the text of the read-only field with the given label and fails the test if there is none.
 *
 * @param container - The element that holds the panel
 * @param label - The label without the colon
 * @returns The text of the field
 */
export function getTextByLabel(container: HTMLElement, label: string): string {
  const match = findLabel(container, label);
  expect(match).toBeDefined();
  const text = match?.parentElement?.querySelector(":scope > span");
  expect(text).toBeInstanceOf(HTMLSpanElement);
  return text?.textContent ?? "";
}

/**
 * Returns the labels of the fields of the container, without the colons.
 *
 * @param container - The element that holds the panel
 * @returns The labels, in document order
 */
export function getLabels(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("label"), (label) => label.textContent.replace(/:$/, ""));
}

/**
 * Tells whether the container has a field with the given label.
 *
 * @param container - The element that holds the panel
 * @param label - The label without the colon
 * @returns `true` if the label exists
 */
export function hasLabel(container: HTMLElement, label: string): boolean {
  return findLabel(container, label) !== undefined;
}

/**
 * Returns the first button of the container with the given text, such as the button of a tab.
 *
 * @param container - The element that holds the panel
 * @param text - The text of the button
 * @returns The button, or `undefined` if there is none
 */
export function findButton(container: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll("button")).find((btn) => btn.textContent === text);
}

/**
 * Enters a value into the field with the given label and leaves the field, which commits the value.
 *
 * @param container - The element that holds the panel
 * @param label - The label without the colon
 * @param value - The new value
 */
export function editInput(container: HTMLElement, label: string, value: string): void {
  const input = getInputByLabel(container, label);
  input.value = value;
  input.dispatchEvent(new Event("blur"));
}

/** A properties panel in its container, and a diagram for the items it displays. */
export interface PanelSetup {
  container: HTMLDivElement;
  panel: PropertiesPanel;
  diagram: Diagram;
}

/**
 * Creates a properties panel in a new container, and a new diagram.
 *
 * @param dispatchCommand - The function that receives the commands of the panel
 * @returns The container, the panel and the diagram
 */
export function createPanel(dispatchCommand?: ConstructorParameters<typeof PropertiesPanel>[1]): PanelSetup {
  const container = document.createElement("div");
  return { container, panel: new PropertiesPanel(container, dispatchCommand), diagram: new Diagram(new schema()) };
}

/** A panel that displays an item, and the mock that receives its commands. */
export interface DisplayedItem {
  panel: PropertiesPanel;
  dispatch: Mock<(command: SchemaCommand) => void>;
}

/**
 * Displays the item in a new panel in the container, whose commands go to a mock, and opens a tab.
 *
 * @param container - The element that holds the panel
 * @param item - The item to display
 * @param tab - The text of the tab to open, or `undefined` to stay on the General tab
 * @returns The panel and the mock
 */
export function displayItem(container: HTMLDivElement, item: DiagramItem, tab?: string): DisplayedItem {
  const dispatch = vi.fn<(command: SchemaCommand) => void>();
  const panel = new PropertiesPanel(container, dispatch);
  panel.display(item);
  if (tab !== undefined) {
    findButton(container, tab)?.click();
  }
  return { panel, dispatch };
}

/**
 * Creates a diagram item in a diagram whose schema has the target namespace prefix `tns`. The diagram
 * defines no types, so normalizing a type only trims it.
 *
 * @param id - The ID of the item
 * @param itemType - The type of the item
 * @returns The item
 */
export function itemWithPrefix(id: string, itemType = DiagramItemType.element): DiagramItem {
  const schemaObj = Object.assign(new schema(), {
    targetNamespace: "urn:test",
    _namespacePrefixes: { tns: "urn:test" },
  });
  return new DiagramItem(id, "name", itemType, NOT_READ_SCHEMA_OBJECT, new Diagram(schemaObj));
}
