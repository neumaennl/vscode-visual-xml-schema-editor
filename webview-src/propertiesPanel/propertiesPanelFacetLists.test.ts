/**
 * Unit tests for the editor of enumeration values and patterns of the properties panel, which shows
 * them as chips, and for the remove buttons of facets.
 */

import type { Mock } from "vitest";
import { appendFacetRemoveButton, renderValueListFacet, type ValueListFacet } from "./propertiesPanelFacetLists";
import type { RestrictionSnapshot } from "./propertiesPanelDraft";

/** Title of the remove buttons that are disabled because the restriction needs a facet. */
const LAST_FACET_TITLE = "A restriction requires at least one facet";

/** An editor of a facet with several values, the draft it changes and the mocks it calls. */
interface ValueListEditor {
  root: HTMLElement;
  draft: RestrictionSnapshot;
  buildAndDispatch: Mock<(updater: (next: RestrictionSnapshot) => void) => void>;
  onRemove: Mock<() => void>;
}

/**
 * Renders the editor of a facet with several values in a container in the document, which moving the
 * focus needs. Each change is applied to a draft.
 *
 * @param facet - The facet
 * @param values - The values of the facet
 * @param canRemove - Whether the facet may be removed
 * @returns The editor
 */
function renderValueList(facet: ValueListFacet, values: string[], canRemove = true): ValueListEditor {
  const root = document.createElement("div");
  document.body.appendChild(root);
  const draft: RestrictionSnapshot = {};
  const buildAndDispatch = vi.fn((updater: (next: RestrictionSnapshot) => void) => {
    updater(draft);
  });
  const onRemove = vi.fn<() => void>();
  renderValueListFacet(root, facet, values, buildAndDispatch, canRemove, onRemove);
  return { root, draft, buildAndDispatch, onRemove };
}

/**
 * Returns the values of the chips of the editor.
 *
 * @param root - The container of the editor
 * @returns The values, in document order
 */
function chipValues(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll(".property-value-chip-text"), (chip) => chip.textContent);
}

/**
 * Returns the button with the given accessible name and fails the test if there is none.
 *
 * @param root - The container of the editor
 * @param label - The accessible name
 * @returns The button
 */
function buttonLabeled(root: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(root.querySelectorAll("button")).find(
    (candidate) => candidate.getAttribute("aria-label") === label
  );
  expect(button).toBeInstanceOf(HTMLButtonElement);
  return button!;
}

/**
 * Enters a value into the text field of the editor and finishes the input.
 *
 * @param root - The container of the editor
 * @param value - The text to enter
 * @param key - The key that finishes the input; without one, the field loses the focus. After Escape,
 *   the field also loses the focus, which must not commit the value.
 */
function enterValue(root: HTMLElement, value: string, key?: "Enter" | "Escape"): void {
  const input = root.querySelector<HTMLInputElement>(".property-value-input")!;
  expect(document.activeElement).toBe(input);
  input.value = value;
  if (key) {
    input.dispatchEvent(new KeyboardEvent("keydown", { key }));
  }
  if (key !== "Enter") {
    input.dispatchEvent(new FocusEvent("blur"));
  }
}

/**
 * Returns a stub of the `DataTransfer` of a drag event, which jsdom does not have.
 *
 * @returns An object that stores the data that `setData()` sets
 */
function createDataTransfer(): Pick<
  DataTransfer,
  "effectAllowed" | "dropEffect" | "setData" | "getData" | "setDragImage"
> {
  const data: Record<string, string> = {};
  return {
    effectAllowed: "none",
    dropEffect: "none",
    setDragImage: (): void => undefined,
    setData: (type: string, value: string): void => {
      data[type] = value;
    },
    getData: (type: string): string => data[type] ?? "",
  };
}

/**
 * Dispatches a drag event with a `DataTransfer` on an element.
 *
 * @param target - The element
 * @param type - The type of the event
 * @param dataTransfer - The data of the drag
 * @returns The event
 */
function dispatchDrag(target: Element, type: string, dataTransfer = createDataTransfer()): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  target.dispatchEvent(event);
  return event;
}

describe("renderValueListFacet", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  test.each([
    { facet: "enumeration", label: "Enumeration:", addText: "+ value" },
    { facet: "pattern", label: "Pattern:", addText: "+ pattern" },
  ] as const)("should show the $facet values as chips with a button that adds one", ({ facet, label, addText }) => {
    const { root } = renderValueList(facet, ["A", "B"]);

    expect(root.querySelector("label")?.textContent).toBe(label);
    expect(root.querySelector("label .property-facet-icon")).not.toBeNull();
    expect(chipValues(root)).toEqual(["A", "B"]);
    expect(root.querySelector(".property-value-add-button")?.textContent).toBe(addText);
  });

  describe("adding a value", () => {
    test("should add the entered value", () => {
      const { root, draft } = renderValueList("pattern", ["[A-Z]{3}"]);

      root.querySelector<HTMLButtonElement>(".property-value-add-button")!.click();
      enterValue(root, "[0-9]{3}");

      expect(draft.pattern).toEqual(["[A-Z]{3}", "[0-9]{3}"]);
      expect(chipValues(root)).toEqual(["[A-Z]{3}", "[0-9]{3}"]);
    });

    test.each([
      { case: "a value that exists", value: "[A-Z]{3}", key: undefined },
      { case: "an empty value", value: " ", key: undefined },
      { case: "a cancelled input", value: "[0-9]{3}", key: "Escape" as const },
    ])("should add nothing for $case", ({ value, key }) => {
      const { root, buildAndDispatch } = renderValueList("pattern", ["[A-Z]{3}"]);

      root.querySelector<HTMLButtonElement>(".property-value-add-button")!.click();
      enterValue(root, value, key);

      expect(buildAndDispatch).not.toHaveBeenCalled();
      expect(chipValues(root)).toEqual(["[A-Z]{3}"]);
      expect(root.querySelector(".property-value-add-button")).not.toBeNull();
    });
  });

  describe("editing a value", () => {
    test.each([
      { next: "[a-z]{3}", key: undefined, expected: ["[A-Z]{3}", "[a-z]{3}"] },
      { next: " [a-z]{3} ", key: "Enter" as const, expected: ["[A-Z]{3}", "[a-z]{3}"] },
      { next: "", key: undefined, expected: ["[A-Z]{3}"] },
    ])("should change the second value to '$next' (key: $key)", ({ next, key, expected }) => {
      const { root, draft } = renderValueList("pattern", ["[A-Z]{3}", "[0-9]{3}"]);

      buttonLabeled(root, "Edit [0-9]{3}").click();
      expect(root.querySelector<HTMLInputElement>(".property-value-input")!.value).toBe("[0-9]{3}");
      enterValue(root, next, key);

      expect(draft.pattern).toEqual(expected);
      expect(chipValues(root)).toEqual(expected);
    });

    test.each([
      { case: "an unchanged value", values: ["[A-Z]{3}", "[0-9]{3}"], next: "[0-9]{3}", key: undefined },
      { case: "a value that exists", values: ["[A-Z]{3}", "[0-9]{3}"], next: "[A-Z]{3}", key: undefined },
      { case: "a cancelled edit", values: ["[A-Z]{3}", "[0-9]{3}"], next: "[a-z]{3}", key: "Escape" as const },
      { case: "the emptied only value of the last facet", values: ["[0-9]{3}"], next: "", key: undefined },
    ])("should keep the old value for $case", ({ values, next, key }) => {
      const { root, buildAndDispatch } = renderValueList("pattern", values, false);

      buttonLabeled(root, "Edit [0-9]{3}").click();
      enterValue(root, next, key);

      expect(buildAndDispatch).not.toHaveBeenCalled();
      expect(chipValues(root)).toEqual(values);
    });
  });

  describe("removing values and the facet", () => {
    test("should remove a value", () => {
      const { root, draft } = renderValueList("enumeration", ["A", "B"]);

      buttonLabeled(root, "Remove A").click();

      expect(draft.enumeration).toEqual(["B"]);
      expect(chipValues(root)).toEqual(["B"]);
    });

    test("should remove the facet with its only value when another facet remains", () => {
      const { root, draft, buildAndDispatch } = renderValueList("enumeration", ["A"]);

      buttonLabeled(root, "Remove A").click();

      expect(buildAndDispatch).toHaveBeenCalledOnce();
      expect(draft.enumeration).toBeUndefined();
    });

    test("should remove the whole facet", () => {
      const { root, onRemove } = renderValueList("pattern", ["[A-Z]{3}", "[0-9]{3}"]);

      buttonLabeled(root, "Remove Pattern facet").click();

      expect(onRemove).toHaveBeenCalledOnce();
    });

    test("should not let the only value or the facet of the last facet be removed", () => {
      const { root } = renderValueList("enumeration", ["A"], false);

      for (const label of ["Remove A", "Remove Enumeration facet"]) {
        expect(buttonLabeled(root, label).disabled).toBe(true);
        expect(buttonLabeled(root, label).title).toBe(LAST_FACET_TITLE);
      }
    });

    test("should let a value of the last facet be removed while it has others", () => {
      const { root } = renderValueList("enumeration", ["A", "B"], false);

      expect(buttonLabeled(root, "Remove A").disabled).toBe(false);
      expect(buttonLabeled(root, "Remove Enumeration facet").disabled).toBe(true);
    });
  });

  describe("reordering values", () => {
    test("should show a grab handle on the chips only when there are several values", () => {
      const several = renderValueList("enumeration", ["A", "B"]).root;
      const single = renderValueList("pattern", ["[A-Z]"]).root;

      const grips = Array.from(several.querySelectorAll<HTMLElement>(".property-value-chip-grip"));
      expect(grips.map((grip) => grip.draggable)).toEqual([true, true]);
      expect(single.querySelector(".property-value-chip-grip")).toBeNull();
    });

    test("should move a value onto the chip it is dropped on", () => {
      const { root, draft } = renderValueList("enumeration", ["A", "B", "C"]);
      const chips = Array.from(root.querySelectorAll(".property-value-chip"));
      const dataTransfer = createDataTransfer();

      dispatchDrag(chips[0]!.querySelector(".property-value-chip-grip")!, "dragstart", dataTransfer);
      const dragOver = dispatchDrag(chips[2]!, "dragover", dataTransfer);
      expect(dragOver.defaultPrevented).toBe(true);
      expect(chips[2]!.classList).toContain("property-value-chip-drag-over");
      dispatchDrag(chips[2]!, "drop", dataTransfer);

      expect(draft.enumeration).toEqual(["B", "C", "A"]);
      expect(chipValues(root)).toEqual(["B", "C", "A"]);
    });

    test("should mark the dragged chip until the drag ends", () => {
      const { root } = renderValueList("enumeration", ["A", "B"]);
      const [first, second] = Array.from(root.querySelectorAll(".property-value-chip"));
      const grip = first!.querySelector(".property-value-chip-grip")!;

      dispatchDrag(grip, "dragstart");
      dispatchDrag(second!, "dragover");
      expect(first!.classList).toContain("property-value-chip-dragging");
      dispatchDrag(grip, "dragend");

      expect(first!.classList).not.toContain("property-value-chip-dragging");
      expect(second!.classList).not.toContain("property-value-chip-drag-over");
    });

    test("should ignore a drop that does not come from a chip of the list", () => {
      const { root, buildAndDispatch } = renderValueList("enumeration", ["A", "B"]);
      const chip = root.querySelector(".property-value-chip")!;

      expect(dispatchDrag(chip, "dragover").defaultPrevented).toBe(false);
      expect(dispatchDrag(chip, "drop").defaultPrevented).toBe(false);

      expect(buildAndDispatch).not.toHaveBeenCalled();
    });

    test("should change nothing when a chip is dropped on itself", () => {
      const { root, buildAndDispatch } = renderValueList("enumeration", ["A", "B"]);
      const chip = root.querySelector(".property-value-chip")!;

      dispatchDrag(chip.querySelector(".property-value-chip-grip")!, "dragstart");
      dispatchDrag(chip, "drop");

      expect(buildAndDispatch).not.toHaveBeenCalled();
    });
  });
});

describe("appendFacetRemoveButton", () => {
  test("should add a button that removes the facet", () => {
    const onRemove = vi.fn<() => void>();
    const field = appendFacetRemoveButton(document.createElement("div"), "Max Length", true, onRemove);
    const button = field.querySelector("button")!;

    button.click();

    expect(field.classList).toContain("property-facet");
    expect(button.getAttribute("aria-label")).toBe("Remove Max Length facet");
    expect(button.title).toBe("Remove Max Length facet");
    expect(onRemove).toHaveBeenCalledOnce();
  });

  test("should disable the button of the last facet and say why", () => {
    const field = appendFacetRemoveButton(document.createElement("div"), "Max Length", false, vi.fn());
    const button = field.querySelector("button")!;

    expect(button.disabled).toBe(true);
    expect(button.title).toBe(LAST_FACET_TITLE);
  });
});
