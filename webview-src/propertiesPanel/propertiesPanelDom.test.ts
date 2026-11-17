/**
 * Unit tests for the input and section helpers of `propertiesPanelDom`.
 */

import { createInputColumn, createSection } from "./propertiesPanelDom";

/**
 * Creates an input column and returns its input.
 *
 * @param value - Initial value
 * @param onCommit - Callback invoked with the committed value
 * @returns The input
 */
function columnInput(value: string, onCommit: (next: string) => void): HTMLInputElement {
  return createInputColumn("label", value, onCommit).querySelector("input")!;
}

describe("createInputColumn: the committing input", () => {
  test("should create a text input with the value", () => {
    const input = columnInput("value", vi.fn());
    expect(input.type).toBe("text");
    expect(input.className).toBe("property-input");
    expect(input.value).toBe("value");
  });

  test("should commit the value when the input loses the focus", () => {
    const onCommit = vi.fn();
    const input = columnInput("old", onCommit);
    input.value = "new";
    input.dispatchEvent(new FocusEvent("blur"));
    expect(onCommit).toHaveBeenCalledWith("new");
  });

  test("should leave the input with Enter, which commits the value", () => {
    const onCommit = vi.fn();
    const input = columnInput("old", onCommit);
    document.body.appendChild(input);
    input.focus();
    const enter = new KeyboardEvent("keydown", { key: "Enter", cancelable: true });
    input.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(true);
    expect(onCommit).toHaveBeenCalledWith("old");
    input.remove();
  });

  test("should ignore other keys", () => {
    const onCommit = vi.fn();
    const input = columnInput("old", onCommit);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe("createInputColumn", () => {
  test("should create a column with a label and a committing input", () => {
    const onCommit = vi.fn();
    const column = createInputColumn("default", "x", onCommit, "—");
    expect(column.className).toBe("property-col");
    expect(column.querySelector("label")?.textContent).toBe("default");
    const input = column.querySelector("input");
    expect(input?.placeholder).toBe("—");
    input?.dispatchEvent(new FocusEvent("blur"));
    expect(onCommit).toHaveBeenCalledWith("x");
  });

  test("should have no placeholder unless one is given", () => {
    expect(createInputColumn("min", "1", vi.fn()).querySelector("input")?.placeholder).toBe("");
  });
});

describe("createSection", () => {
  test("should create a section that starts with a header with the icon and the label", () => {
    const section = createSection("lock", "CONSTRAINTS");

    expect(section.className).toBe("property-section");
    expect(section.children).toHaveLength(1);
    expect(section.querySelector(".property-section-header .codicon-lock")).not.toBeNull();
    expect(section.querySelector(".property-section-header-label")?.textContent).toBe("CONSTRAINTS");
  });
});
