/**
 * Tests for DiagramItem class
 */

import { DiagramItem } from "./DiagramItem";
import { Diagram } from "./Diagram";
import { DiagramItemType } from "./DiagramTypes";

describe("DiagramItem", () => {
  describe("constructor", () => {
    test("should create a DiagramItem with required parameters", () => {
      const item = new DiagramItem("id1", "TestElement", DiagramItemType.element);
      expect(item.id).toBe("id1");
      expect(item.name).toBe("TestElement");
      expect(item.itemType).toBe(DiagramItemType.element);
      expect(item.diagram).toBeNull();
    });

    test("should accept diagram parameter", () => {
      const diagram = new Diagram();
      const item = new DiagramItem("id1", "TestElement", DiagramItemType.element, diagram);
      expect(item.diagram).toBe(diagram);
    });
  });

  describe("addChild", () => {
    test("should add child element and set parent reference", () => {
      const parent = new DiagramItem("parent", "Parent", DiagramItemType.element);
      const child = new DiagramItem("child", "Child", DiagramItemType.element);

      parent.addChild(child);

      expect(parent.childElements).toContain(child);
      expect(parent.hasChildElements).toBe(true);
      expect(child.parent).toBe(parent);
    });

    test("should add multiple children", () => {
      const parent = new DiagramItem("parent", "Parent", DiagramItemType.element);
      const child1 = new DiagramItem("child1", "Child1", DiagramItemType.element);
      const child2 = new DiagramItem("child2", "Child2", DiagramItemType.element);

      parent.addChild(child1);
      parent.addChild(child2);

      expect(parent.childElements.length).toBe(2);
      expect(parent.childElements).toContain(child1);
      expect(parent.childElements).toContain(child2);
    });
  });

  describe("getTextDocumentation", () => {
    test("should return documentation text", () => {
      const item = new DiagramItem("id1", "Test", DiagramItemType.element);
      item.documentation = "Test documentation";

      expect(item.getTextDocumentation()).toBe("Test documentation");
    });
  });

  describe("scaleInt", () => {
    test("should return unscaled value when no diagram", () => {
      const item = new DiagramItem("id1", "Test", DiagramItemType.element);
      expect(item.scaleInt(100)).toBe(100);
    });

    test("should scale value by diagram scale", () => {
      const diagram = new Diagram();
      diagram.scale = 2.0;
      const item = new DiagramItem("id1", "Test", DiagramItemType.element, diagram);

      expect(item.scaleInt(100)).toBe(200);
    });

    test("should round scaled value", () => {
      const diagram = new Diagram();
      diagram.scale = 1.5;
      const item = new DiagramItem("id1", "Test", DiagramItemType.element, diagram);

      expect(item.scaleInt(100)).toBe(150);
    });
  });

  describe("scaleRectangle", () => {
    test("should return unscaled rectangle when no diagram", () => {
      const item = new DiagramItem("id1", "Test", DiagramItemType.element);
      const rect = { x: 10, y: 20, width: 100, height: 50 };
      const result = item.scaleRectangle(rect);

      expect(result).toEqual(rect);
    });

    test("should scale rectangle by diagram scale", () => {
      const diagram = new Diagram();
      diagram.scale = 2.0;
      const item = new DiagramItem("id1", "Test", DiagramItemType.element, diagram);
      const rect = { x: 10, y: 20, width: 100, height: 50 };

      const result = item.scaleRectangle(rect);

      expect(result.x).toBe(20);
      expect(result.y).toBe(40);
      expect(result.width).toBe(200);
      expect(result.height).toBe(100);
    });
  });

  describe("calculateBoundingBox", () => {
    test("should return item bounds when no children", () => {
      const item = new DiagramItem("id1", "Test", DiagramItemType.element);
      item.location = { x: 10, y: 20 };
      item.size = { width: 100, height: 50 };

      const bounds = item.calculateBoundingBox();

      expect(bounds.x).toBe(10);
      expect(bounds.y).toBe(20);
      expect(bounds.width).toBe(100);
      expect(bounds.height).toBe(50);
    });

    test.each([
      ["include child bounds when showChildElements is true", true, { x: 0, y: 0, width: 150, height: 150 }], // 50 + 100
      ["not include child bounds when showChildElements is false", false, { x: 0, y: 0, width: 100, height: 100 }],
    ])("should %s", (_case, showChildElements, expected) => {
      const parent = new DiagramItem("parent", "Parent", DiagramItemType.element);
      parent.location = { x: 0, y: 0 };
      parent.size = { width: 100, height: 100 };
      parent.showChildElements = showChildElements;

      const child = new DiagramItem("child", "Child", DiagramItemType.element);
      child.location = { x: 50, y: 50 };
      child.size = { width: 100, height: 100 };
      parent.addChild(child);

      expect(parent.calculateBoundingBox()).toEqual(expected);
    });

    test("should handle nested children", () => {
      const grandparent = new DiagramItem("gp", "GrandParent", DiagramItemType.element);
      grandparent.location = { x: 0, y: 0 };
      grandparent.size = { width: 50, height: 50 };
      grandparent.showChildElements = true;

      const parent = new DiagramItem("parent", "Parent", DiagramItemType.element);
      parent.location = { x: 100, y: 100 };
      parent.size = { width: 50, height: 50 };
      parent.showChildElements = true;

      const child = new DiagramItem("child", "Child", DiagramItemType.element);
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
