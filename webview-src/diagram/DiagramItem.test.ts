/**
 * Tests for `DiagramItem` class
 */

import { DiagramItem } from "./DiagramItem";
import { DiagramItemType } from "./DiagramTypes";
import { emptyDiagram, NOT_READ_SCHEMA_OBJECT } from "../__tests__/diagramTestHelpers";

/**
 * Creates an element item whose label is its ID, in the diagram of an empty schema.
 *
 * @param id - The ID of the item
 * @param diagram - The diagram of the item
 * @returns The item
 */
function item(id: string, diagram = emptyDiagram()): DiagramItem {
  return new DiagramItem(id, id, DiagramItemType.element, NOT_READ_SCHEMA_OBJECT, diagram);
}

describe("DiagramItem", () => {
  describe("constructor", () => {
    test("should create a DiagramItem with its diagram", () => {
      const diagram = emptyDiagram();
      const created = new DiagramItem("id1", "TestElement", DiagramItemType.element, NOT_READ_SCHEMA_OBJECT, diagram);

      expect(created.id).toBe("id1");
      expect(created.label).toBe("TestElement");
      expect(created.itemType).toBe(DiagramItemType.element);
      expect(created.diagram).toBe(diagram);
    });
  });

  describe("addChild", () => {
    test("should add child element and set parent reference", () => {
      const parent = item("parent");
      const child = item("child");

      parent.addChild(child);

      expect(parent.childElements).toContain(child);
      expect(parent.hasChildElements).toBe(true);
      expect(child.parent).toBe(parent);
    });

    test("should add multiple children", () => {
      const parent = item("parent");
      const child1 = item("child1");
      const child2 = item("child2");

      parent.addChild(child1);
      parent.addChild(child2);

      expect(parent.childElements.length).toBe(2);
      expect(parent.childElements).toContain(child1);
      expect(parent.childElements).toContain(child2);
    });
  });

  describe("getStyle", () => {
    test("should return the style of the diagram", () => {
      const diagram = emptyDiagram();
      diagram.style = { ...diagram.style, fontSize: 14 };

      expect(item("id", diagram).getStyle()).toBe(diagram.style);
    });
  });

  describe("calculateBoundingBox", () => {
    test("should return item bounds when no children", () => {
      const single = item("id1");
      single.location = { x: 10, y: 20 };
      single.size = { width: 100, height: 50 };

      const bounds = single.calculateBoundingBox();

      expect(bounds.x).toBe(10);
      expect(bounds.y).toBe(20);
      expect(bounds.width).toBe(100);
      expect(bounds.height).toBe(50);
    });

    test.each([
      ["include child bounds when showChildElements is true", true, { x: 0, y: 0, width: 150, height: 150 }], // 50 + 100
      ["not include child bounds when showChildElements is false", false, { x: 0, y: 0, width: 100, height: 100 }],
    ])("should %s", (_case, showChildElements, expected) => {
      const parent = item("parent");
      parent.location = { x: 0, y: 0 };
      parent.size = { width: 100, height: 100 };
      parent.showChildElements = showChildElements;

      const child = item("child");
      child.location = { x: 50, y: 50 };
      child.size = { width: 100, height: 100 };
      parent.addChild(child);

      expect(parent.calculateBoundingBox()).toEqual(expected);
    });

    test("should handle nested children", () => {
      const grandparent = item("gp");
      grandparent.location = { x: 0, y: 0 };
      grandparent.size = { width: 50, height: 50 };
      grandparent.showChildElements = true;

      const parent = item("parent");
      parent.location = { x: 100, y: 100 };
      parent.size = { width: 50, height: 50 };
      parent.showChildElements = true;

      const child = item("child");
      child.location = { x: 200, y: 200 };
      child.size = { width: 50, height: 50 };

      grandparent.addChild(parent);
      parent.addChild(child);

      const bounds = grandparent.calculateBoundingBox();

      // Should expand to include all descendants
      expect(bounds.x).toBe(0);
      expect(bounds.y).toBe(0);
      expect(bounds.width).toBe(250); // 200 + 50
      expect(bounds.height).toBe(250); // 200 + 50
    });
  });
});
