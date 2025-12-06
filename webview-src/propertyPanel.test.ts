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
      expect.hasAssertions();
      container.innerHTML = "<p>Old content</p>";
      const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);

      panel.display(item);

      expect(container.querySelector("p")).toBeNull();
    });

    it("should display item name", () => {
      expect.hasAssertions();
      const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);

      panel.display(item);

      expectAdjacentText(container, "Name:", "TestItem");
    });

    it("should display type if present", () => {
      expect.hasAssertions();
      const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);
      item.type = "string";

      panel.display(item);

      expectAdjacentText(container, "Type:", "string");
    });

    it("should display cardinality", () => {
      expect.hasAssertions();
      const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);
      item.minOccurrence = 0;
      item.maxOccurrence = -1;

      panel.display(item);

      expectAdjacentText(container, "Cardinality:", "0..∞");
    });

    it("should display documentation if present", () => {
      expect.hasAssertions();
      const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);
      item.documentation = "This is test documentation";

      panel.display(item);

      expectAdjacentText(container, "Documentation:", "This is test documentation");
    });

    it("should display attributes if present", () => {
      expect.hasAssertions();
      const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);
      item.attributes = [
        { name: "id", type: "string", use: "required" },
        { name: "value", type: "number" },
      ];

      panel.display(item);

      expect(container.textContent).toContain("Attributes:");
      expect(container.textContent).toContain("id");
      expect(container.textContent).toContain("string");
    });

    it("should display namespace if present", () => {
      expect.hasAssertions();
      const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);
      item.namespace = "http://example.com/ns";

      panel.display(item);

      expectAdjacentText(container, "Namespace:", "http://example.com/ns");
    });

    it("should handle item without optional properties", () => {
      expect.hasAssertions();
      const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);

      expect(() => {
        panel.display(item);
      }).not.toThrow();

      expect(container.textContent).toContain("TestItem");
    });

    it("should display group type items", () => {
      expect.hasAssertions();
      const item = new DiagramItem("test-1", "TestGroup", DiagramItemType.group, diagram);

      panel.display(item);

      expect(container.textContent).toContain("TestGroup");
    });

    it("should display type items with type information", () => {
      expect.hasAssertions();
      const item = new DiagramItem("test-1", "TestType", DiagramItemType.type, diagram);
      item.type = "complexType";

      panel.display(item);

      expect(container.textContent).toContain("TestType");
      expect(container.textContent).toContain("complexType");
    });
  });

  describe("clear", () => {
    it("should clear container content", () => {
      expect.hasAssertions();
      container.innerHTML = "<p>Test content</p>";

      panel.clear();

      expect(container.innerHTML).toBe("");
    });

    it("should clear after displaying item", () => {
      expect.hasAssertions();
      const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);
      panel.display(item);

      expect(container.innerHTML).not.toBe("");

      panel.clear();

      expect(container.innerHTML).toBe("");
    });
  });
});
