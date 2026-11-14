/**
 * Unit tests for the input helpers of propertiesPanelDom.
 */

import { createCommitInput, createInputColumn } from "./propertiesPanelDom";

describe("createCommitInput", () => {
  test("creates a text input with the value", () => {
    const input = createCommitInput("value", vi.fn());
    expect(input.type).toBe("text");
    expect(input.className).toBe("property-input");
    expect(input.value).toBe("value");
  });

  test("commits the value when the input loses the focus", () => {
    const onCommit = vi.fn();
    const input = createCommitInput("old", onCommit);
    input.value = "new";
    input.dispatchEvent(new FocusEvent("blur"));
    expect(onCommit).toHaveBeenCalledWith("new");
  });

  test("leaves the input with Enter, which commits the value", () => {
    const onCommit = vi.fn();
    const input = createCommitInput("old", onCommit);
    document.body.appendChild(input);
    input.focus();
    const enter = new KeyboardEvent("keydown", { key: "Enter", cancelable: true });
    input.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(true);
    expect(onCommit).toHaveBeenCalledWith("old");
    input.remove();
  });

  test("ignores other keys", () => {
    const onCommit = vi.fn();
    const input = createCommitInput("old", onCommit);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe("createInputColumn", () => {
  test("creates a column with a label and a committing input", () => {
    const onCommit = vi.fn();
    const column = createInputColumn("default", "x", onCommit, "—");
    expect(column.className).toBe("property-col");
    expect(column.querySelector("label")?.textContent).toBe("default");
    const input = column.querySelector("input");
    expect(input?.placeholder).toBe("—");
    input?.dispatchEvent(new FocusEvent("blur"));
    expect(onCommit).toHaveBeenCalledWith("x");
  });

  test("has no placeholder unless one is given", () => {
    expect(createInputColumn("min", "1", vi.fn()).querySelector("input")?.placeholder).toBe("");
  });
});
