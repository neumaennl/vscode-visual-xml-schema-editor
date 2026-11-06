/**
 * Unit tests for the Facets tab of the properties panel.
 */

import { PropertiesPanel } from "./propertiesPanel";
import { DiagramItem } from "../diagram/DiagramItem";
import { Diagram } from "../diagram/Diagram";
import { DiagramItemType } from "../diagram/DiagramTypes";
import { findButton, getInputByLabel, hasLabel } from "../__tests__/propertiesPanelTestHelpers";

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
function createDataTransfer(): Pick<DataTransfer, "effectAllowed" | "dropEffect" | "setData" | "getData"> {
  const data: Record<string, string> = {};
  return {
    effectAllowed: "none",
    dropEffect: "none",
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

    const enumChips = Array.from(container.querySelectorAll(".property-enum-chip")).map(
      (chip) => chip.textContent
    );
    expect(enumChips).toEqual(["A", "B"]);
    expect(getInputByLabel(container, "Pattern").value).toBe("[A-Z]");
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

    const chips = Array.from(container.querySelectorAll(".property-enum-chip"));
    expect(chips.map((chip) => chip.textContent)).toEqual(["A", "B", "C"]);

    const dataTransfer = createDataTransfer();

    const dragStart = new Event("dragstart", { bubbles: true, cancelable: true });
    Object.defineProperty(dragStart, "dataTransfer", { value: dataTransfer });
    chips[0].dispatchEvent(dragStart);

    const drop = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(drop, "dataTransfer", { value: dataTransfer });
    chips[2].dispatchEvent(drop);

    const reorderedChips = Array.from(container.querySelectorAll(".property-enum-chip"));
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
    const addInput = container.querySelector(".property-enum-add-input") as HTMLInputElement;
    addInput.value = "C";
    addInput.dispatchEvent(new Event("blur"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifySimpleType",
      payload: {
        typeId: "/simpleType:TokenType",
        restrictions: {
          ...NO_FACETS,
          enumeration: ["A", "B", "C"],
          pattern: "[A-Z]",
        },
      },
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
