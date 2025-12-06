/**
 * Tests for shape rendering functions
 */

import {
  renderElementShape,
  renderGroupShape,
  renderTypeShape,
  renderGroupTypeIndicator,
} from "./ShapeRenderers";
import { DiagramItem } from "./DiagramItem";
import { DiagramItemGroupType, Rectangle } from "./DiagramTypes";
import { Diagram } from "./Diagram";

describe("ShapeRenderers", () => {
  let mockGroup: SVGElement;
  let mockDiagram: Diagram;

  beforeEach(() => {
    mockGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    
    // Create a minimal mock diagram with style
    mockDiagram = {
      style: {
        lineColor: "#000000",
        foregroundColor: "#333333",
        backgroundColor: "#ffffff",
        elementFillColor: "#e6f2ff",
        typeFillColor: "#fff2e6",
        groupFillColor: "#f2ffe6",
      },
    } as unknown as Diagram;
  });

  describe("renderElementShape", () => {
    it("should render a single rectangle for single occurrence", () => {
      const rect: Rectangle = { x: 10, y: 10, width: 100, height: 50 };
      const item = new DiagramItem("id1", "Test", "element" as any);
      item.maxOccurrence = 1;

      renderElementShape(rect, "fill:blue", "stroke:black", item, mockGroup);

      const rectangles = mockGroup.querySelectorAll("rect");
      expect(rectangles.length).toBe(1);
      expect(rectangles[0].getAttribute("x")).toBe("10");
      expect(rectangles[0].getAttribute("y")).toBe("10");
      expect(rectangles[0].getAttribute("width")).toBe("100");
      expect(rectangles[0].getAttribute("height")).toBe("50");
    });

    it("should render shadow for multiple occurrences", () => {
      const rect: Rectangle = { x: 10, y: 10, width: 100, height: 50 };
      const item = new DiagramItem("id2", "Test", "element" as any);
      item.maxOccurrence = -1; // Unbounded

      renderElementShape(rect, "fill:blue", "stroke:black", item, mockGroup);

      const rectangles = mockGroup.querySelectorAll("rect");
      expect(rectangles.length).toBe(2); // Shadow + main rectangle

      // Check shadow rectangle (offset by 3)
      expect(rectangles[0].getAttribute("x")).toBe("13");
      expect(rectangles[0].getAttribute("y")).toBe("13");

      // Check main rectangle
      expect(rectangles[1].getAttribute("x")).toBe("10");
      expect(rectangles[1].getAttribute("y")).toBe("10");
    });

    it("should render shadow for maxOccurrence > 1", () => {
      const rect: Rectangle = { x: 0, y: 0, width: 50, height: 30 };
      const item = new DiagramItem("id3", "Test", "element" as any);
      item.maxOccurrence = 5;

      renderElementShape(rect, "fill:red", "stroke:blue", item, mockGroup);

      const rectangles = mockGroup.querySelectorAll("rect");
      expect(rectangles.length).toBe(2);
    });
  });

  describe("renderGroupShape", () => {
    it("should render an octagon for single occurrence", () => {
      const rect: Rectangle = { x: 10, y: 10, width: 100, height: 50 };
      const item = new DiagramItem("id4", "Test", "group" as any);
      item.maxOccurrence = 1;
      item.diagram = mockDiagram;
      item.groupType = DiagramItemGroupType.Sequence;

      renderGroupShape(rect, "fill:green", "stroke:black", item, mockGroup);

      const polygons = mockGroup.querySelectorAll("polygon");
      expect(polygons.length).toBeGreaterThanOrEqual(1);

      // Check that octagon has 8 points
      const points = polygons[0].getAttribute("points")?.split(" ");
      expect(points?.length).toBe(8);
    });

    it("should render shadow for multiple occurrences", () => {
      const rect: Rectangle = { x: 10, y: 10, width: 100, height: 50 };
      const item = new DiagramItem("id5", "Test", "group" as any);
      item.maxOccurrence = -1;
      item.diagram = mockDiagram;
      item.groupType = DiagramItemGroupType.Choice;

      renderGroupShape(rect, "fill:green", "stroke:black", item, mockGroup);

      const polygons = mockGroup.querySelectorAll("polygon");
      expect(polygons.length).toBeGreaterThanOrEqual(2); // Shadow + main
    });

    it("should render group type indicator for sequence", () => {
      const rect: Rectangle = { x: 10, y: 10, width: 100, height: 50 };
      const item = new DiagramItem("id6", "Test", "group" as any);
      item.maxOccurrence = 1;
      item.diagram = mockDiagram;
      item.groupType = DiagramItemGroupType.Sequence;

      renderGroupShape(rect, "fill:green", "stroke:black", item, mockGroup);

      // Should have circles for dots and lines
      const circles = mockGroup.querySelectorAll("circle");
      const lines = mockGroup.querySelectorAll("line");
      expect(circles.length).toBe(3); // Three dots for sequence
      expect(lines.length).toBe(1); // One horizontal line
    });

    it("should render group type indicator for choice", () => {
      const rect: Rectangle = { x: 10, y: 10, width: 100, height: 50 };
      const item = new DiagramItem("id7", "Test", "group" as any);
      item.maxOccurrence = 1;
      item.diagram = mockDiagram;
      item.groupType = DiagramItemGroupType.Choice;

      renderGroupShape(rect, "fill:green", "stroke:black", item, mockGroup);

      // Should have circles for dots and lines
      const circles = mockGroup.querySelectorAll("circle");
      const lines = mockGroup.querySelectorAll("line");
      expect(circles.length).toBe(3); // Three dots
      expect(lines.length).toBeGreaterThan(0); // Multiple lines for choice
    });

    it("should render group type indicator for all", () => {
      const rect: Rectangle = { x: 10, y: 10, width: 100, height: 50 };
      const item = new DiagramItem("id8", "Test", "group" as any);
      item.maxOccurrence = 1;
      item.diagram = mockDiagram;
      item.groupType = DiagramItemGroupType.All;

      renderGroupShape(rect, "fill:green", "stroke:black", item, mockGroup);

      // Should have circles for dots and lines
      const circles = mockGroup.querySelectorAll("circle");
      const lines = mockGroup.querySelectorAll("line");
      expect(circles.length).toBe(3); // Three dots
      expect(lines.length).toBeGreaterThan(0); // Multiple lines for all
    });
  });

  describe("renderTypeShape", () => {
    it("should render a beveled rectangle for single occurrence", () => {
      const rect: Rectangle = { x: 10, y: 10, width: 100, height: 50 };
      const item = new DiagramItem("id9", "Test", "type" as any);
      item.maxOccurrence = 1;
      item.isSimpleContent = false;

      renderTypeShape(rect, "fill:yellow", "stroke:black", item, mockGroup);

      const polygons = mockGroup.querySelectorAll("polygon");
      expect(polygons.length).toBe(1);

      // Check that beveled rectangle has 6 points
      const points = polygons[0].getAttribute("points")?.split(" ");
      expect(points?.length).toBe(6);
    });

    it("should render shadow for multiple occurrences", () => {
      const rect: Rectangle = { x: 10, y: 10, width: 100, height: 50 };
      const item = new DiagramItem("id10", "Test", "type" as any);
      item.maxOccurrence = 2;
      item.isSimpleContent = false;

      renderTypeShape(rect, "fill:yellow", "stroke:black", item, mockGroup);

      const polygons = mockGroup.querySelectorAll("polygon");
      expect(polygons.length).toBe(2); // Shadow + main
    });

    it("should render filled bevel area for simple content", () => {
      const rect: Rectangle = { x: 10, y: 10, width: 100, height: 50 };
      const item = new DiagramItem("id11", "Test", "type" as any);
      item.maxOccurrence = 1;
      item.isSimpleContent = true;

      renderTypeShape(rect, "fill:yellow", "stroke:#ff0000", item, mockGroup);

      const polygons = mockGroup.querySelectorAll("polygon");
      expect(polygons.length).toBe(2); // Main shape + bevel fill

      // Check that bevel fill uses stroke color
      const bevelFill = polygons[1];
      expect(bevelFill.getAttribute("style")).toContain("fill:#ff0000");
    });

    it("should handle stroke color with semicolon", () => {
      const rect: Rectangle = { x: 10, y: 10, width: 100, height: 50 };
      const item = new DiagramItem("id12", "Test", "type" as any);
      item.maxOccurrence = 1;
      item.isSimpleContent = true;

      renderTypeShape(
        rect,
        "fill:yellow",
        "stroke:#0000ff;stroke-width:2",
        item,
        mockGroup
      );

      const polygons = mockGroup.querySelectorAll("polygon");
      const bevelFill = polygons[1];
      expect(bevelFill.getAttribute("style")).toContain("fill:#0000ff");
    });
  });

  describe("renderGroupTypeIndicator", () => {
    it("should render sequence indicator with dots and line", () => {
      const rect: Rectangle = { x: 10, y: 10, width: 100, height: 50 };
      const item = new DiagramItem("id13", "Test", "group" as any);
      item.diagram = mockDiagram;
      item.groupType = DiagramItemGroupType.Sequence;

      renderGroupTypeIndicator(item, rect, mockGroup);

      const circles = mockGroup.querySelectorAll("circle");
      const lines = mockGroup.querySelectorAll("line");
      expect(circles.length).toBe(3); // Three dots
      expect(lines.length).toBe(1); // One horizontal line
    });

    it("should render choice indicator with dots and lines", () => {
      const rect: Rectangle = { x: 10, y: 10, width: 100, height: 50 };
      const item = new DiagramItem("id14", "Test", "group" as any);
      item.diagram = mockDiagram;
      item.groupType = DiagramItemGroupType.Choice;

      renderGroupTypeIndicator(item, rect, mockGroup);

      const circles = mockGroup.querySelectorAll("circle");
      const lines = mockGroup.querySelectorAll("line");
      expect(circles.length).toBe(3); // Three dots
      expect(lines.length).toBe(6); // Multiple lines for choice pattern
    });

    it("should render all indicator with dots and lines", () => {
      const rect: Rectangle = { x: 10, y: 10, width: 100, height: 50 };
      const item = new DiagramItem("id15", "Test", "group" as any);
      item.diagram = mockDiagram;
      item.groupType = DiagramItemGroupType.All;

      renderGroupTypeIndicator(item, rect, mockGroup);

      const circles = mockGroup.querySelectorAll("circle");
      const lines = mockGroup.querySelectorAll("line");
      expect(circles.length).toBe(3); // Three dots
      expect(lines.length).toBe(8); // Multiple lines for all pattern
    });

    it("should render centered on rectangle", () => {
      const rect: Rectangle = { x: 50, y: 50, width: 100, height: 60 };
      const item = new DiagramItem("id17", "Test", "group" as any);
      item.diagram = mockDiagram;
      item.groupType = DiagramItemGroupType.Sequence;

      renderGroupTypeIndicator(item, rect, mockGroup);

      // Check that elements are centered (centerX=100, centerY=80)
      const line = mockGroup.querySelector("line");
      expect(line).toBeTruthy();
      // The line should be centered vertically at y=80
      expect(line?.getAttribute("y1")).toBe("80");
      expect(line?.getAttribute("y2")).toBe("80");
    });
  });
});
