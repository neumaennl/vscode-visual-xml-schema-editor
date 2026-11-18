/**
 * Unit tests for Diagram class.
 */

import { Diagram } from "./Diagram";
import { DiagramItem } from "./DiagramItem";
import { DiagramItemType } from "./DiagramTypes";

describe("Diagram", () => {
  let diagram: Diagram;

  beforeEach(() => {
    diagram = new Diagram();
  });

  describe("constructor", () => {
    test("should initialize with empty root elements", () => {
      expect(diagram.rootElements).toEqual([]);
    });

    test("should initialize with default settings", () => {
      expect(diagram.showDocumentation).toBe(false);
      expect(diagram.alwaysShowOccurrence).toBe(false);
      expect(diagram.showType).toBe(false);
    });
  });

  describe("addRootElement", () => {
    test("should add element to root elements", () => {
      const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);

      diagram.addRootElement(item);

      expect(diagram.rootElements).toHaveLength(1);
      expect(diagram.rootElements[0]).toBe(item);
    });

    test("should set diagram reference on the element", () => {
      const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);
      const newDiagram = new Diagram();

      newDiagram.addRootElement(item);

      expect(item.diagram).toBe(newDiagram);
    });
  });

  /**
   * Adds a root `schema` with the children `a` and `b`, and `c` below `a`, to the diagram.
   *
   * @returns The items, by name
   */
  function addTree(): Record<"schema" | "a" | "b" | "c", DiagramItem> {
    const items = {
      schema: new DiagramItem("schema", "schema", DiagramItemType.element),
      a: new DiagramItem("a", "a", DiagramItemType.element),
      b: new DiagramItem("b", "b", DiagramItemType.element),
      c: new DiagramItem("c", "c", DiagramItemType.element),
    };
    items.schema.addChild(items.a);
    items.schema.addChild(items.b);
    items.a.addChild(items.c);
    diagram.addRootElement(items.schema);
    return items;
  }

  describe("findItem", () => {
    test("should find the root and items at any depth", () => {
      const items = addTree();

      expect(diagram.findItem("schema")).toBe(items.schema);
      expect(diagram.findItem("b")).toBe(items.b);
      expect(diagram.findItem("c")).toBe(items.c);
    });

    test("should return null for an unknown ID", () => {
      addTree();

      expect(diagram.findItem("missing")).toBeNull();
    });

    test("should return the first item in document order if two have the same ID", () => {
      const items = addTree();
      items.b.addChild(new DiagramItem("c", "second c", DiagramItemType.element));

      expect(diagram.findItem("c")).toBe(items.c);
    });
  });

  describe("getExpandState and restoreExpandState", () => {
    test("should record whether each item shows its children", () => {
      const items = addTree();
      items.schema.showChildElements = true;
      items.a.showChildElements = true;

      expect(Object.fromEntries(diagram.getExpandState())).toEqual({ schema: true, a: true, b: false, c: false });
    });

    test("should restore the recorded state and keep items that it does not contain", () => {
      const items = addTree();
      items.b.showChildElements = true;

      diagram.restoreExpandState(
        new Map([
          ["schema", true],
          ["a", true],
        ])
      );

      expect([items.schema, items.a, items.b, items.c].map((item) => item.showChildElements)).toEqual([
        true,
        true,
        true,
        false,
      ]);
    });
  });

  describe("calculateBoundingBox", () => {
    test("should return empty box for no root elements", () => {
      const box = diagram.calculateBoundingBox();

      expect(box).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });

    test("should calculate bounding box with padding", () => {
      const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);
      item.location = { x: 10, y: 20 };
      item.size = { width: 100, height: 50 };
      diagram.addRootElement(item);

      const box = diagram.calculateBoundingBox();

      expect(box.x).toBe(-10); // 10 - padding(20)
      expect(box.y).toBe(0); // 20 - padding(20)
      expect(box.width).toBe(140); // 100 + 2*padding(20)
      expect(box.height).toBe(90); // 50 + 2*padding(20)
    });
  });
});
