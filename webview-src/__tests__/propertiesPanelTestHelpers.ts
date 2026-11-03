/**
 * Helpers that find the fields of the properties panel by their labels.
 */

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
 */
export function getInputByLabel(container: HTMLElement, label: string): HTMLInputElement {
  const match = findLabel(container, label);
  expect(match).toBeDefined();
  const input = match?.parentElement?.querySelector("input");
  expect(input).toBeInstanceOf(HTMLInputElement);
  return input as HTMLInputElement;
}

/**
 * Returns the select of the field with the given label and fails the test if there is none.
 *
 * @param container - The element that holds the panel
 * @param label - The label without the colon
 * @returns The select
 */
export function getSelectByLabel(container: HTMLElement, label: string): HTMLSelectElement {
  const match = findLabel(container, label);
  expect(match).toBeDefined();
  const select = match?.parentElement?.querySelector("select");
  expect(select).toBeInstanceOf(HTMLSelectElement);
  return select as HTMLSelectElement;
}

/**
 * Returns all selects of the field with the given label and fails the test if there is none.
 *
 * @param container - The element that holds the panel
 * @param label - The label without the colon
 * @returns The selects, in document order
 */
export function getSelectsByLabel(container: HTMLElement, label: string): HTMLSelectElement[] {
  const match = findLabel(container, label);
  expect(match).toBeDefined();
  const selects = Array.from(match?.parentElement?.querySelectorAll("select") ?? []);
  expect(selects.length).toBeGreaterThan(0);
  return selects;
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
