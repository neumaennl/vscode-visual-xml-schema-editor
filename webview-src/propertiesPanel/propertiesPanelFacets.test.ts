/**
 * Unit tests for the Facets tab of the properties panel.
 */

import type { Mock } from "vitest";
import type { SchemaCommand } from "../../shared/types";
import { PropertiesPanel } from "./propertiesPanel";
import { DiagramItem } from "../diagram/DiagramItem";
import { Diagram } from "../diagram/Diagram";
import { DiagramItemType } from "../diagram/DiagramTypes";
import { findButton, getChipValuesByLabel, getInputByLabel, hasLabel } from "../__tests__/propertiesPanelTestHelpers";

/** The restriction facets that the panel sends as `undefined` when they are not set. */
const NO_FACETS = {
  enumeration: undefined,
  pattern: undefined,
  length: undefined,
  minLength: undefined,
  maxLength: undefined,
  minInclusive: undefined,
  maxInclusive: undefined,
  minExclusive: undefined,
  maxExclusive: undefined,
  totalDigits: undefined,
  fractionDigits: undefined,
  whiteSpace: undefined,
};

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

describe("PropertiesPanel: the Facets tab", () => {
  let container: HTMLDivElement;
  let panel: PropertiesPanel;
  let diagram: Diagram;

  beforeEach(() => {
    container = document.createElement("div");
    panel = new PropertiesPanel(container);
    diagram = new Diagram();
  });

  test("shows facet fields when facet tab is selected", () => {
    const item = new DiagramItem("test-1", "TokenType", DiagramItemType.type, diagram);
    item.type = "xs:string";
    item.restrictions = {
      enumeration: ["A", "B"],
      pattern: ["[A-Z]"],
      minLength: 1,
      maxLength: 5,
    };

    panel.display(item);
    const facetsTab = findButton(container, "Facets");
    facetsTab?.click();

    expect(getChipValuesByLabel(container, "Enumeration")).toEqual(["A", "B"]);
    expect(getChipValuesByLabel(container, "Pattern")).toEqual(["[A-Z]"]);
    expect(getInputByLabel(container, "Min Length").value).toBe("1");
    expect(getInputByLabel(container, "Max Length").value).toBe("5");
  });

  test("reorders enumeration values via drag and drop", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
    const item = new DiagramItem(
      "/simpleType:TokenType",
      "TokenType",
      DiagramItemType.type,
      diagram
    );
    item.type = "simpleType (restricts xs:string)";
    item.restrictions = { enumeration: ["A", "B", "C"] };

    panel.display(item);
    const facetsTab = findButton(container, "Facets");
    facetsTab?.click();

    const chips = Array.from(container.querySelectorAll(".property-value-chip"));
    expect(chips.map((chip) => chip.textContent)).toEqual(["A", "B", "C"]);

    const dataTransfer = createDataTransfer();

    const dragStart = new Event("dragstart", { bubbles: true, cancelable: true });
    Object.defineProperty(dragStart, "dataTransfer", { value: dataTransfer });
    chips[0].querySelector(".property-value-chip-grip")?.dispatchEvent(dragStart);

    const drop = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(drop, "dataTransfer", { value: dataTransfer });
    chips[2].dispatchEvent(drop);

    const reorderedChips = Array.from(container.querySelectorAll(".property-value-chip"));
    expect(reorderedChips.map((chip) => chip.textContent)).toEqual(["B", "C", "A"]);

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifySimpleType",
      payload: {
        typeId: "/simpleType:TokenType",
        restrictions: {
          ...NO_FACETS,
          enumeration: ["B", "C", "A"],
        },
      },
    });
  });

  test("shows a grab handle on the chips only when there are several values", () => {
    const item = new DiagramItem("/simpleType:TokenType", "TokenType", DiagramItemType.type, diagram);
    item.type = "simpleType (restricts xs:string)";
    item.restrictions = { enumeration: ["A", "B"], pattern: ["[A-Z]"] };

    panel.display(item);
    findButton(container, "Facets")?.click();

    const chips = Array.from(container.querySelectorAll<HTMLElement>(".property-value-chip"));
    const grips = chips.map((chip) => chip.querySelector<HTMLElement>(".property-value-chip-grip"));
    expect(grips.map((grip) => grip?.draggable)).toEqual([true, true, undefined]);
    expect(chips.map((chip) => chip.draggable)).toEqual([false, false, false]);
  });

  test("ignores drops on a chip that do not come from its list", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
    const item = new DiagramItem("/simpleType:TokenType", "TokenType", DiagramItemType.type, diagram);
    item.type = "simpleType (restricts xs:string)";
    item.restrictions = { enumeration: ["A", "B"] };

    panel.display(item);
    findButton(container, "Facets")?.click();
    const drop = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(drop, "dataTransfer", { value: createDataTransfer() });
    container.querySelector(".property-value-chip")?.dispatchEvent(drop);

    expect(drop.defaultPrevented).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  test("dispatches modifySimpleType when facets are edited", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
    const item = new DiagramItem(
      "/simpleType:TokenType",
      "TokenType",
      DiagramItemType.type,
      diagram
    );
    item.type = "simpleType (restricts xs:string)";
    item.restrictions = {
      enumeration: ["A", "B"],
      pattern: ["[A-Z]"],
    };

    panel.display(item);
    const facetsTab = findButton(container, "Facets");
    facetsTab?.click();

    const addValueButton = findButton(container, "+ value");
    addValueButton?.click();
    const addInput = container.querySelector(".property-value-input") as HTMLInputElement;
    addInput.value = "C";
    addInput.dispatchEvent(new Event("blur"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifySimpleType",
      payload: {
        typeId: "/simpleType:TokenType",
        restrictions: {
          ...NO_FACETS,
          enumeration: ["A", "B", "C"],
          pattern: ["[A-Z]"],
        },
      },
    });
  });

  test("keeps all patterns when another facet is edited", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
    const item = new DiagramItem("/simpleType:CodeType", "CodeType", DiagramItemType.type, diagram);
    item.type = "simpleType (restricts xs:string)";
    item.restrictions = { pattern: ["[A-Z]{3}", "[0-9]{3}"], maxLength: 8 };

    panel.display(item);
    findButton(container, "Facets")?.click();
    const maxLength = getInputByLabel(container, "Max Length");
    maxLength.value = "3";
    maxLength.dispatchEvent(new Event("blur"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifySimpleType",
      payload: {
        typeId: "/simpleType:CodeType",
        restrictions: { ...NO_FACETS, pattern: ["[A-Z]{3}", "[0-9]{3}"], maxLength: 3 },
      },
    });
  });

  describe("the chips of patterns and enumeration values", () => {
    let dispatch: Mock<(command: SchemaCommand) => void>;

    // Enter commits by moving the focus away, which needs a container in the document
    beforeEach(() => {
      document.body.appendChild(container);
    });

    afterEach(() => {
      container.remove();
    });

    /**
     * Shows the Facets tab of a type `CodeType` with the given facets.
     *
     * @param restrictions - The facets of the type
     */
    function displayFacets(restrictions: DiagramItem["restrictions"]): void {
      dispatch = vi.fn<(command: SchemaCommand) => void>();
      panel = new PropertiesPanel(container, dispatch);
      const item = new DiagramItem("/simpleType:CodeType", "CodeType", DiagramItemType.type, diagram);
      item.type = "simpleType (restricts xs:string)";
      item.restrictions = restrictions;
      panel.display(item);
      findButton(container, "Facets")?.click();
    }

    function addPattern(value: string): void {
      findButton(container, "+ pattern")?.click();
      const input = container.querySelector(".property-value-input") as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event("blur"));
    }

    test("shows a chip for every pattern, next to the enumeration chips", () => {
      displayFacets({ enumeration: ["ABC"], pattern: ["[A-Z]{3}", "[0-9]{3}"] });

      expect(getChipValuesByLabel(container, "Pattern")).toEqual(["[A-Z]{3}", "[0-9]{3}"]);
      expect(getChipValuesByLabel(container, "Enumeration")).toEqual(["ABC"]);
    });

    test("removes one pattern and keeps the other facets", () => {
      displayFacets({ pattern: ["[A-Z]{3}", "[0-9]{3}"], maxLength: 3 });

      (container.querySelector("button[aria-label='Remove [A-Z]{3}']") as HTMLButtonElement).click();

      expect(dispatch).toHaveBeenCalledWith({
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:CodeType", restrictions: { ...NO_FACETS, pattern: ["[0-9]{3}"], maxLength: 3 } },
      });
      expect(getChipValuesByLabel(container, "Pattern")).toEqual(["[0-9]{3}"]);
    });

    test("adds a pattern", () => {
      displayFacets({ pattern: ["[A-Z]{3}"] });

      addPattern("[0-9]{3}");

      expect(dispatch).toHaveBeenCalledWith({
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:CodeType", restrictions: { ...NO_FACETS, pattern: ["[A-Z]{3}", "[0-9]{3}"] } },
      });
      expect(getChipValuesByLabel(container, "Pattern")).toEqual(["[A-Z]{3}", "[0-9]{3}"]);
    });

    test.each(["[A-Z]{3}", " "])("adds nothing for the pattern '%s'", (value) => {
      displayFacets({ pattern: ["[A-Z]{3}"] });

      addPattern(value);

      expect(dispatch).not.toHaveBeenCalled();
      expect(getChipValuesByLabel(container, "Pattern")).toEqual(["[A-Z]{3}"]);
    });

    test("cancels adding a pattern with Escape", () => {
      displayFacets({ pattern: ["[A-Z]{3}"] });

      findButton(container, "+ pattern")?.click();
      const input = container.querySelector(".property-value-input") as HTMLInputElement;
      input.value = "[0-9]{3}";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      input.dispatchEvent(new Event("blur"));

      expect(dispatch).not.toHaveBeenCalled();
      expect(findButton(container, "+ pattern")).toBeDefined();
    });

    /**
     * Clicks the value of a chip and enters a new value in the text field that replaces the chip.
     *
     * @param value - The value of the chip
     * @param next - The text to enter
     * @param key - The key that finishes the input; without one, the field loses the focus. After
     *   Escape, the field also loses the focus, which must not commit the value.
     */
    function editValue(value: string, next: string, key?: "Enter" | "Escape"): void {
      (container.querySelector(`button[aria-label='Edit ${value}']`) as HTMLButtonElement).click();
      const input = container.querySelector(`input[aria-label='Edit ${value}']`) as HTMLInputElement;
      expect(input.value).toBe(value);
      input.value = next;
      expect(document.activeElement).toBe(input);
      if (key) {
        input.dispatchEvent(new KeyboardEvent("keydown", { key }));
      }
      if (key !== "Enter") {
        input.dispatchEvent(new Event("blur"));
      }
    }

    test.each([
      { next: "[a-z]{3}", key: undefined, expected: ["[A-Z]{3}", "[a-z]{3}"] },
      { next: " [a-z]{3} ", key: "Enter" as const, expected: ["[A-Z]{3}", "[a-z]{3}"] },
      { next: "", key: undefined, expected: ["[A-Z]{3}"] },
    ])("changes the second pattern to '$next' (key: $key)", ({ next, key, expected }) => {
      displayFacets({ pattern: ["[A-Z]{3}", "[0-9]{3}"] });

      editValue("[0-9]{3}", next, key);

      expect(dispatch).toHaveBeenCalledWith({
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:CodeType", restrictions: { ...NO_FACETS, pattern: expected } },
      });
      expect(getChipValuesByLabel(container, "Pattern")).toEqual(expected);
    });

    test.each([
      { case: "an unchanged value", restrictions: { pattern: ["[A-Z]{3}", "[0-9]{3}"] }, next: "[0-9]{3}", key: undefined },
      { case: "a value that exists", restrictions: { pattern: ["[A-Z]{3}", "[0-9]{3}"] }, next: "[A-Z]{3}", key: undefined },
      { case: "a cancelled edit", restrictions: { pattern: ["[A-Z]{3}", "[0-9]{3}"] }, next: "[a-z]{3}", key: "Escape" as const },
      { case: "an empty only facet", restrictions: { pattern: ["[0-9]{3}"] }, next: "", key: undefined },
    ])("keeps the old pattern for $case", ({ restrictions, next, key }) => {
      displayFacets(restrictions);

      editValue("[0-9]{3}", next, key);

      expect(dispatch).not.toHaveBeenCalled();
      expect(getChipValuesByLabel(container, "Pattern")).toEqual(restrictions.pattern);
    });

    test("changes an enumeration value in place", () => {
      displayFacets({ enumeration: ["value", "B"] });

      editValue("value", "A", "Enter");

      expect(dispatch).toHaveBeenCalledWith({
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:CodeType", restrictions: { ...NO_FACETS, enumeration: ["A", "B"] } },
      });
    });

    test("disables removing the only pattern of a restriction without other facets", () => {
      displayFacets({ pattern: ["[A-Z]{3}"] });

      const removeButton = container.querySelector("button[aria-label='Remove [A-Z]{3}']") as HTMLButtonElement;

      expect(removeButton.disabled).toBe(true);
      expect(removeButton.title).toBe("A restriction requires at least one facet");
    });
  });

  test("edits the facets of a restriction with an inline base type", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
    const item = new DiagramItem("/simpleType:ShortCode", "ShortCode", DiagramItemType.type, diagram);
    item.type = "simpleType";
    item.simpleTypeDerivationKind = "restriction";
    item.restrictions = { maxLength: 8 };

    panel.display(item);
    findButton(container, "Facets")?.click();
    const maxLength = getInputByLabel(container, "Max Length");
    maxLength.value = "4";
    maxLength.dispatchEvent(new Event("blur"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifySimpleType",
      payload: { typeId: "/simpleType:ShortCode", restrictions: { ...NO_FACETS, maxLength: 4 } },
    });
  });

  test("removes a facet while retaining another restriction facet", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
    const item = new DiagramItem("/simpleType:TokenType", "TokenType", DiagramItemType.type, diagram);
    item.type = "simpleType (restricts xs:string)";
    item.restrictions = { enumeration: ["A"], pattern: ["[A-Z]"] };

    panel.display(item);
    Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Facets")?.click();
    const removePattern = container.querySelector("button[title='Remove Pattern facet']") as HTMLButtonElement;
    removePattern.click();

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifySimpleType",
      payload: {
        typeId: "/simpleType:TokenType",
        restrictions: {
          ...NO_FACETS,
          enumeration: ["A"],
        },
      },
    });
  });

  test("disables removal for the final restriction facet", () => {
    const item = new DiagramItem("/simpleType:TokenType", "TokenType", DiagramItemType.type, diagram);
    item.type = "simpleType (restricts xs:string)";
    item.restrictions = { pattern: ["[A-Z]"] };

    panel.display(item);
    Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Facets")?.click();

    const removePattern = container.querySelector("button[title='A restriction requires at least one facet']");
    expect(removePattern).toBeInstanceOf(HTMLButtonElement);
    expect((removePattern as HTMLButtonElement).disabled).toBe(true);
  });

  test("disables removal of the last enumeration value when it is the only facet", () => {
    const item = new DiagramItem("/simpleType:TokenType", "TokenType", DiagramItemType.type, diagram);
    item.type = "simpleType (restricts xs:string)";
    item.restrictions = { enumeration: ["A"] };

    panel.display(item);
    Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Facets")?.click();

    const removeValue = container.querySelector("button[aria-label='Remove A']") as HTMLButtonElement;
    expect(removeValue.disabled).toBe(true);
    expect(removeValue.title).toBe("A restriction requires at least one facet");
  });

  test("shows the Facets tab for simple type nodes and elements with inline simple types", () => {
    const element = new DiagramItem("/element:person", "person", DiagramItemType.element, diagram);
    element.type = "xs:string";

    panel.display(element);
    expect(container.textContent).not.toContain("Facets");

    const simpleType = new DiagramItem("/simpleType:TokenType", "TokenType", DiagramItemType.type, diagram);
    simpleType.type = "simpleType (restricts xs:string)";
    simpleType.restrictions = { minLength: 1 };

    panel.display(simpleType);
    expect(container.textContent).toContain("Facets");

    const inlineSimple = new DiagramItem("/element:code", "code", DiagramItemType.element, diagram);
    inlineSimple.type = "<anonymous simpleType> (restricts xs:string)";
    inlineSimple.isSimpleContent = true;
    inlineSimple.restrictions = { minLength: 1 };

    panel.display(inlineSimple);
    expect(container.textContent).toContain("Facets");
  });

  test("hides the Facets tab for list and union simple types", () => {
    const listType = new DiagramItem("/simpleType:TokenListType", "TokenListType", DiagramItemType.type, diagram);
    listType.type = "simpleType (list of xs:token)";
    listType.simpleTypeDerivationKind = "list";

    panel.display(listType);
    expect(container.textContent).not.toContain("Facets");

    const unionType = new DiagramItem("/simpleType:TextOrNumberType", "TextOrNumberType", DiagramItemType.type, diagram);
    unionType.type = "simpleType (union of xs:string, xs:integer)";
    unionType.simpleTypeDerivationKind = "union";

    panel.display(unionType);
    expect(container.textContent).not.toContain("Facets");
  });

  test("only renders editable controls for existing facets", () => {
    const item = new DiagramItem("/simpleType:TokenType", "TokenType", DiagramItemType.type, diagram);
    item.type = "simpleType (restricts xs:string)";
    item.restrictions = {
      minLength: 1,
      maxLength: 5,
    };

    panel.display(item);
    const facetsTab = findButton(container, "Facets");
    facetsTab?.click();

    expect(getInputByLabel(container, "Min Length").value).toBe("1");
    expect(getInputByLabel(container, "Max Length").value).toBe("5");
    expect(hasLabel(container, "Pattern")).toBe(false);
    expect(hasLabel(container, "Enumeration")).toBe(false);
  });

  test("shows a palette hint when no facets exist yet", () => {
    const item = new DiagramItem("/simpleType:TokenType", "TokenType", DiagramItemType.type, diagram);
    item.type = "simpleType (restricts xs:string)";
    item.restrictions = {};

    panel.display(item);
    const facetsTab = findButton(container, "Facets");
    facetsTab?.click();

    expect(container.textContent).toContain("This type has no facets yet");
  });
});
