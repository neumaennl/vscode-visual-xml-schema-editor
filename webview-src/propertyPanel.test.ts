/**
 * Unit tests for PropertyPanel class.
 */

import { PropertyPanel } from "./propertyPanel";
import { DiagramItem } from "./diagram/DiagramItem";
import { Diagram } from "./diagram/Diagram";
import { DiagramItemType } from "./diagram/DiagramTypes";

/**
 * Helper function to check if two strings appear adjacent in HTML content.
 * Ensures they are close together with only whitespace/formatting between them.
 */
function expectAdjacentText(container: HTMLElement, first: string, second: string): void {
  const html = container.innerHTML;
  const firstIndex = html.indexOf(first);
  const secondIndex = html.indexOf(second);
  
  expect(firstIndex).toBeGreaterThan(-1);
  expect(secondIndex).toBeGreaterThan(-1);
  expect(secondIndex).toBeGreaterThan(firstIndex);
  
  // Check that there's minimal content between them (only tags and whitespace)
  const between = html.substring(firstIndex + first.length, secondIndex);
  const hasOnlyFormatting = /^[<>/\s\w="'-]*$/.test(between);
  expect(hasOnlyFormatting).toBe(true);
}

describe("PropertyPanel", () => {
  let container: HTMLDivElement;
  let panel: PropertyPanel;
  let diagram: Diagram;

  beforeEach(() => {
    container = document.createElement("div");
    panel = new PropertyPanel(container);
    diagram = new Diagram();
  });

  describe("display", () => {
    it("should clear container before displaying", () => {
      container.innerHTML = "<p>Old content</p>";
      const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);

      panel.display(item);

      expect(container.querySelector("p")).toBeNull();
    });

    it("should display item name", () => {
      const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);

      panel.display(item);

      expectAdjacentText(container, "Name:", "TestItem");
    });

    it("should display type if present", () => {
      const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);
      item.type = "string";

      panel.display(item);

      expectAdjacentText(container, "Type:", "string");
    });

    it("should display cardinality", () => {
      const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);
      item.minOccurrence = 0;
      item.maxOccurrence = -1;

      panel.display(item);

      expectAdjacentText(container, "Cardinality:", "0..∞");
    });
  });

  describe("clear", () => {
    it("should clear container content", () => {
      container.innerHTML = "<p>Test content</p>";

      panel.clear();

      expect(container.innerHTML).toBe("");
    });
  });
});
