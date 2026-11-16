/**
 * Unit tests for the CONSTRAINTS section of the properties panel.
 */

import { canShowConstraintsSection, renderConstraintsSection } from "./propertiesPanelConstraints";
import { DiagramItem } from "../diagram/DiagramItem";
import { DiagramItemType } from "../diagram/DiagramTypes";

/**
 * Returns the labels of the toggles in the section.
 *
 * @param section - The rendered section
 * @returns The labels, in order
 */
function toggleLabels(section: HTMLElement): string[] {
  return Array.from(section.querySelectorAll(".property-toggle-label"), (label) => label.textContent);
}

/**
 * Switches the toggle with the given label on.
 *
 * @param section - The rendered section
 * @param label - The label of the toggle
 */
function switchOn(section: HTMLElement, label: string): void {
  const row = Array.from(section.querySelectorAll(".property-toggle-row")).find(
    (candidate) => candidate.querySelector(".property-toggle-label")?.textContent === label
  );
  const input = row!.querySelector("input")!;
  input.checked = true;
  input.dispatchEvent(new Event("change"));
}

describe("canShowConstraintsSection", () => {
  test.each([
    [true, "an element", "/element:person", DiagramItemType.element],
    [true, "a complex type", "/complexType:PersonType", DiagramItemType.type],
    [false, "a simple type", "/simpleType:Code", DiagramItemType.type],
    [false, "a named group", "/group:G", DiagramItemType.group],
  ])("should return %s for %s", (expected, _, id, itemType) => {
    expect(canShowConstraintsSection(new DiagramItem(id, "x", itemType))).toBe(expected);
  });
});

describe("renderConstraintsSection", () => {
  test("should offer only nillable for a local element", () => {
    const section = renderConstraintsSection(new DiagramItem("/element:root/element:item[0]", "item", DiagramItemType.element), vi.fn());

    expect(section.querySelector(".property-section-header-label")?.textContent).toBe("CONSTRAINTS");
    expect(toggleLabels(section)).toEqual(["Nillable"]);
  });

  test("should send nillable, abstract and mixed content of a top-level element with an anonymous complex type", () => {
    const item = new DiagramItem("/element:person", "person", DiagramItemType.element);
    item.hasAnonymousComplexType = true;
    const dispatch = vi.fn();
    const section = renderConstraintsSection(item, dispatch);

    switchOn(section, "Nillable");
    switchOn(section, "Abstract");
    switchOn(section, "Mixed content");

    expect(toggleLabels(section)).toEqual(["Nillable", "Abstract", "Mixed content"]);
    expect(dispatch.mock.calls).toEqual([
      [{ type: "modifyElement", payload: { elementId: "/element:person", nillable: true } }],
      [{ type: "modifyElement", payload: { elementId: "/element:person", abstract: true } }],
      [{ type: "modifyComplexType", payload: { typeId: "/element:person/anonymousComplexType[0]", mixed: true } }],
    ]);
    expect([item.isNillable, item.isAbstract, item.isMixed]).toEqual([true, true, true]);
  });

  test("should send abstract and mixed content of a complex type", () => {
    const item = new DiagramItem("/complexType:PersonType", "PersonType", DiagramItemType.type);
    const dispatch = vi.fn();
    const section = renderConstraintsSection(item, dispatch);

    switchOn(section, "Abstract");
    switchOn(section, "Mixed content");

    expect(dispatch.mock.calls).toEqual([
      [{ type: "modifyComplexType", payload: { typeId: "/complexType:PersonType", abstract: true } }],
      [{ type: "modifyComplexType", payload: { typeId: "/complexType:PersonType", mixed: true } }],
    ]);
  });
});
