/**
 * Unit tests for PropertyPanel class.
 */

import { PropertyPanel } from "../propertyPanel";
import { DiagramItem } from "../diagram/DiagramItem";
import { Diagram } from "../diagram/Diagram";
import { DiagramItemType } from "../diagram/DiagramTypes";

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

      expect(container.textContent).toContain("Name:");
      expect(container.textContent).toContain("TestItem");
    });

    it("should display type if present", () => {
      const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);
      item.type = "string";

      panel.display(item);

      expect(container.textContent).toContain("Type:");
      expect(container.textContent).toContain("string");
    });

    it("should display cardinality", () => {
      const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);
      item.minOccurrence = 0;
      item.maxOccurrence = -1;

      panel.display(item);

      expect(container.textContent).toContain("Cardinality:");
      expect(container.textContent).toContain("0..∞");
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
