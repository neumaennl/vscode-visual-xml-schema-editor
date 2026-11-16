/**
 * Unit tests for the DEFAULT & FIXED section of elements in the properties panel.
 */

import { renderElementDefaultFixedSection } from "./propertiesPanelElementDefaults";
import type { SchemaCommand } from "../../shared/types";
import { diagramItem, muteDiagramBuilderLog } from "../__tests__/diagramTestHelpers";
import { schemaWith } from "../../shared/__tests__/schemaTestHelpers";

/** An element with a default and a fixed value, and one without. */
const ELEMENTS = `<xs:element name="code" type="xs:string" default="A" fixed="B"/>
<xs:element name="plain" type="xs:string"/>`;

/**
 * Returns the input of the column with the given label and fails the test if there is none.
 *
 * @param section - The rendered section
 * @param label - The label of the column
 * @returns The input
 */
function inputOf(section: HTMLElement, label: string): HTMLInputElement {
  const column = Array.from(section.querySelectorAll(".property-col")).find(
    (candidate) => candidate.querySelector("label")?.textContent === label
  );
  const input = column?.querySelector("input");
  expect(input).toBeInstanceOf(HTMLInputElement);
  return input!;
}

describe("renderElementDefaultFixedSection", () => {
  muteDiagramBuilderLog();

  test("should show the default and the fixed value of the element under a section header", () => {
    const section = renderElementDefaultFixedSection(diagramItem(schemaWith(ELEMENTS), "/element:code"), vi.fn());

    expect(section.querySelector(".property-section-header-label")?.textContent).toBe("DEFAULT & FIXED");
    expect(inputOf(section, "default").value).toBe("A");
    expect(inputOf(section, "fixed").value).toBe("B");
  });

  test("should show empty fields with a placeholder for an element without default and fixed values", () => {
    const section = renderElementDefaultFixedSection(diagramItem(schemaWith(ELEMENTS), "/element:plain"), vi.fn());

    for (const label of ["default", "fixed"]) {
      expect(inputOf(section, label).value).toBe("");
      expect(inputOf(section, label).placeholder).toBe("—");
    }
  });

  test.each([
    { label: "default", value: "C", field: "elementDefault", expected: "C", payload: { default_: "C" } },
    { label: "fixed", value: "C", field: "elementFixed", expected: "C", payload: { fixed: "C" } },
    { label: "default", value: "", field: "elementDefault", expected: undefined, payload: { default_: "" } },
    { label: "fixed", value: "", field: "elementFixed", expected: undefined, payload: { fixed: "" } },
  ] as const)("should set the $label value of the draft to '$value' and send it", ({ label, value, field, expected, payload }) => {
    const node = diagramItem(schemaWith(ELEMENTS), "/element:code");
    const dispatch = vi.fn<(command: SchemaCommand) => void>();
    const input = inputOf(renderElementDefaultFixedSection(node, dispatch), label);

    input.value = value;
    input.dispatchEvent(new FocusEvent("blur"));

    expect(node[field]).toBe(expected);
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: "modifyElement", payload: { elementId: "/element:code", ...payload } });
  });
});
