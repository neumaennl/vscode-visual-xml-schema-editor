/**
 * Unit tests for Diagram class.
 */

import { Diagram } from "../Diagram";
import { DiagramItem } from "../DiagramItem";
import { DiagramItemType } from "../DiagramTypes";

describe("Diagram", () => {
  let diagram: Diagram;

  beforeEach(() => {
    diagram = new Diagram();
  });

  describe("constructor", () => {
    it("should initialize with empty root elements", () => {
      expect(diagram.rootElements).toEqual([]);
    });

    it("should initialize with default settings", () => {
      expect(diagram.scale).toBe(1.0);
      expect(diagram.showDocumentation).toBe(false);
      expect(diagram.showType).toBe(false);
    });
  });

  describe("addRootElement", () => {
    it("should add element to root elements", () => {
      const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);
      
      diagram.addRootElement(item);

      expect(diagram.rootElements).toHaveLength(1);
      expect(diagram.rootElements[0]).toBe(item);
    });

    it("should set diagram reference on the element", () => {
      const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);
      const newDiagram = new Diagram();
      
      newDiagram.addRootElement(item);

      expect(item.diagram).toBe(newDiagram);
    });
  });

  describe("calculateBoundingBox", () => {
    it("should return empty box for no root elements", () => {
      const box = diagram.calculateBoundingBox();

      expect(box).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });

    it("should calculate bounding box with padding", () => {
      const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);
      item.boundingBox = { x: 10, y: 20, width: 100, height: 50 };
      diagram.addRootElement(item);

      const box = diagram.calculateBoundingBox();

      expect(box.x).toBe(-10); // 10 - padding(20)
      expect(box.y).toBe(0); // 20 - padding(20)
      expect(box.width).toBe(140); // 100 + 2*padding(20)
      expect(box.height).toBe(90); // 50 + 2*padding(20)
    });
  });

  describe("scaleRectangle", () => {
    it("should scale rectangle dimensions", () => {
      diagram.scale = 2.0;
      const rect = { x: 10, y: 20, width: 100, height: 50 };

      const scaled = diagram.scaleRectangle(rect);

      expect(scaled).toEqual({ x: 20, y: 40, width: 200, height: 100 });
    });

    it("should round scaled values", () => {
      diagram.scale = 1.5;
      const rect = { x: 10, y: 10, width: 11, height: 11 };

      const scaled = diagram.scaleRectangle(rect);

      expect(scaled.x).toBe(15);
      expect(scaled.y).toBe(15);
      expect(scaled.width).toBe(17); // 16.5 rounded
      expect(scaled.height).toBe(17); // 16.5 rounded
    });
  });
});
