/**
 * Unit tests of `propertiesPanelFields`.
 */

import { createChoiceField, createEditableField, createInputColumn, createTextInput } from "./propertiesPanelFields";

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
    expect(onCommit).toHaveBeenCalledWith("new", expect.any(Function));
  });

  test.each([
    ["the input loses the focus", "old"],
    ["the value was changed back", "new"],
  ])("should not commit an unchanged value when %s", (_case, accepted) => {
    const onCommit = vi.fn();
    const input = columnInput("old", onCommit);
    input.value = accepted;
    input.dispatchEvent(new FocusEvent("blur"));
    onCommit.mockClear();

    input.value = accepted;
    input.dispatchEvent(new FocusEvent("blur"));

    expect(onCommit).not.toHaveBeenCalled();
  });

  test("should not commit when a new rendering removes the focused input, which Chromium then blurs", () => {
    const onCommit = vi.fn();
    const input = columnInput("old", onCommit);
    document.body.appendChild(input);
    input.focus();

    input.remove();
    input.dispatchEvent(new FocusEvent("blur"));

    expect(onCommit).not.toHaveBeenCalled();
  });

  test("should leave the input with Enter, which commits the value", () => {
    const onCommit = vi.fn();
    const input = columnInput("old", onCommit);
    document.body.appendChild(input);
    input.focus();
    input.value = "new";
    const enter = new KeyboardEvent("keydown", { key: "Enter", cancelable: true });
    input.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(true);
    expect(onCommit).toHaveBeenCalledWith("new", expect.any(Function));
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
    input!.value = "y";
    input?.dispatchEvent(new FocusEvent("blur"));
    expect(onCommit).toHaveBeenCalledWith("y", expect.any(Function));
  });

  test("should have no placeholder unless one is given", () => {
    expect(createInputColumn("min", "1", vi.fn()).querySelector("input")?.placeholder).toBe("");
  });
});

describe("createChoiceField", () => {
  /** The options of the tests. */
  const OPTIONS = [
    { value: "a", label: "Option A" },
    { value: "b", label: "Option B" },
  ] as const;

  /**
   * Enters a text in the field and leaves it, which commits the text.
   *
   * @param field - The field
   * @param text - The text
   * @returns The input of the field
   */
  function enter(field: HTMLElement, text: string): HTMLInputElement {
    const input = field.querySelector("input")!;
    input.value = text;
    input.dispatchEvent(new Event("blur"));
    return input;
  }

  /**
   * Returns the message below a field, or null if none is shown.
   *
   * @param field - The field
   * @returns The text of the message
   */
  function messageOf(field: HTMLElement): string | null {
    const message = field.querySelector<HTMLElement>(".property-message")!;
    return message.hidden ? null : message.textContent;
  }

  test("should show the label and the label of the current value, and suggest the labels of all values", () => {
    const field = createChoiceField("Kind", "b", OPTIONS, () => true);
    const input = field.querySelector("input")!;
    const datalist = field.querySelector("datalist")!;

    expect(field.querySelector("label")?.textContent).toBe("Kind:");
    expect(input.value).toBe("Option B");
    expect(input.getAttribute("list")).toBe(datalist.id);
    expect(Array.from(datalist.options, (option) => option.value)).toEqual(["Option A", "Option B"]);
    expect(messageOf(field)).toBeNull();
  });

  test.each(["Option B", "option b", " b ", "B"])("should accept %j as the value b", (text) => {
    const onChange = vi.fn(() => true);
    const field = createChoiceField("Kind", "a", OPTIONS, onChange);

    const input = enter(field, text);

    expect(onChange).toHaveBeenCalledExactlyOnceWith("b");
    expect(input.value).toBe("Option B");
    expect(messageOf(field)).toBeNull();
  });

  test("should reject a text that names no value with a message, and show the current value again", () => {
    const onChange = vi.fn(() => true);
    const field = createChoiceField("Kind", "a", OPTIONS, onChange);

    const input = enter(field, "c");

    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe("Option A");
    expect(messageOf(field)).toBe("'c' is not a value of Kind. Choose one of: Option A, Option B");
  });

  test("should remove the message with the next valid entry", () => {
    const field = createChoiceField("Kind", "a", OPTIONS, () => true);
    enter(field, "c");

    enter(field, "b");

    expect(messageOf(field)).toBeNull();
  });

  test("should not report the current value again", () => {
    const onChange = vi.fn(() => true);
    const field = createChoiceField("Kind", "a", OPTIONS, onChange);

    enter(field, "Option A");

    expect(onChange).not.toHaveBeenCalled();
  });

  test("should show the current value again when the change is not applied", () => {
    const field = createChoiceField("Kind", "a", OPTIONS, () => false);

    const input = enter(field, "b");

    expect(input.value).toBe("Option A");
  });

  test("should show the icon of a facet before the label", () => {
    const field = createChoiceField("White Space", "a", OPTIONS, () => true, { icon: "whitespace", color: "#808080" });

    expect(field.querySelector("label .codicon-whitespace")).not.toBeNull();
  });
});

describe("createTextInput", () => {
  test("should suggest the values and commit any entered text", () => {
    const onCommit = vi.fn();
    const element = createTextInput("a", onCommit, { suggestions: ["x", "y"], placeholder: "type" });
    const input = element.querySelector("input")!;
    const datalist = element.querySelector("datalist")!;

    expect(input.value).toBe("a");
    expect(input.placeholder).toBe("type");
    expect(input.getAttribute("list")).toBe(datalist.id);
    expect(Array.from(datalist.options, (option) => option.value)).toEqual(["x", "y"]);

    input.value = "not suggested";
    input.dispatchEvent(new Event("blur"));

    expect(onCommit).toHaveBeenCalledExactlyOnceWith("not suggested", expect.any(Function));
  });
});

describe("createEditableField: rejecting a value", () => {
  /**
   * Enters a text in a field and leaves it, which commits the text.
   *
   * @param field - The field
   * @param text - The text
   * @returns The input and the message element of the field
   */
  function commit(field: HTMLElement, text: string): { input: HTMLInputElement; message: HTMLElement } {
    const input = field.querySelector("input")!;
    input.value = text;
    input.dispatchEvent(new Event("blur"));
    return { input, message: field.querySelector<HTMLElement>(".property-message")! };
  }

  /**
   * Rejects the text "bad" and accepts every other text.
   *
   * @param next - The committed text
   * @param reject - Rejects the text with a message
   */
  function rejectBad(next: string, reject: (message: string) => void): void {
    if (next === "bad") reject("Not allowed");
  }

  test("should show the message and the last accepted value when the callback rejects the text", () => {
    const field = createEditableField("Name", "good", rejectBad);

    const { input, message } = commit(field, "bad");

    expect(input.value).toBe("good");
    expect(message.hidden).toBe(false);
    expect(message.textContent).toBe("Not allowed");
  });

  test("should hide the message and keep the text when the next text is accepted", () => {
    const field = createEditableField("Name", "good", rejectBad);
    commit(field, "bad");

    const { input, message } = commit(field, "better");

    expect(input.value).toBe("better");
    expect(message.hidden).toBe(true);
  });

  test("should put back the last accepted value, not the initial one", () => {
    const field = createEditableField("Name", "good", rejectBad);
    commit(field, "better");

    const { input } = commit(field, "bad");

    expect(input.value).toBe("better");
  });
});
