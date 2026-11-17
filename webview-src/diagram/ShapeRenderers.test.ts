/**
 * Tests for shape rendering functions
 */

import { renderElementShape, renderGroupShape, renderTypeShape } from "./ShapeRenderers";
import { DiagramItem } from "./DiagramItem";
import type { Rectangle } from "./DiagramTypes";
import { DiagramItemGroupType, DiagramItemType } from "./DiagramTypes";
import type { Diagram } from "./Diagram";

describe("ShapeRenderers", () => {
  let mockGroup: SVGElement;
  let mockDiagram: Diagram;

  beforeEach(() => {
    mockGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");

    // Create a minimal mock diagram with style
    // eslint-disable-next-line no-restricted-syntax -- partial stub; unused Diagram fields omitted
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
    test("should render a single rectangle for single occurrence", () => {
      const rect: Rectangle = { x: 10, y: 10, width: 100, height: 50 };
      const item = new DiagramItem("id1", "Test", DiagramItemType.element);
      item.maxOccurrence = 1;

      renderElementShape(rect, "fill:blue", "stroke:black", item, mockGroup);

      const rectangles = mockGroup.querySelectorAll("rect");
      expect(rectangles.length).toBe(1);
      expect(rectangles[0]!.getAttribute("x")).toBe("10");
      expect(rectangles[0]!.getAttribute("y")).toBe("10");
      expect(rectangles[0]!.getAttribute("width")).toBe("100");
      expect(rectangles[0]!.getAttribute("height")).toBe("50");
    });

    test("should render shadow for multiple occurrences", () => {
      const rect: Rectangle = { x: 10, y: 10, width: 100, height: 50 };
      const item = new DiagramItem("id2", "Test", DiagramItemType.element);
      item.maxOccurrence = -1; // Unbounded

      renderElementShape(rect, "fill:blue", "stroke:black", item, mockGroup);

      const rectangles = mockGroup.querySelectorAll("rect");
      expect(rectangles.length).toBe(2); // Shadow + main rectangle

      // Check shadow rectangle (offset by 3)
      expect(rectangles[0]!.getAttribute("x")).toBe("13");
      expect(rectangles[0]!.getAttribute("y")).toBe("13");

      // Check main rectangle
      expect(rectangles[1]!.getAttribute("x")).toBe("10");
      expect(rectangles[1]!.getAttribute("y")).toBe("10");
    });

    test("should render shadow for maxOccurrence > 1", () => {
      const rect: Rectangle = { x: 0, y: 0, width: 50, height: 30 };
      const item = new DiagramItem("id3", "Test", DiagramItemType.element);
      item.maxOccurrence = 5;

      renderElementShape(rect, "fill:red", "stroke:blue", item, mockGroup);

      const rectangles = mockGroup.querySelectorAll("rect");
      expect(rectangles.length).toBe(2);
    });
  });

  describe("renderGroupShape", () => {
    test.each([
      ["an octagon for single occurrence", 1, DiagramItemGroupType.Sequence, 1],
      ["a shadow for multiple occurrences", -1, DiagramItemGroupType.Choice, 2], // Shadow + main
    ])("should render %s", (_case, maxOccurrence, groupType, minPolygons) => {
      const item = new DiagramItem("id4", "Test", DiagramItemType.group);
      item.maxOccurrence = maxOccurrence;
      item.diagram = mockDiagram;
      item.groupType = groupType;

      renderGroupShape({ x: 10, y: 10, width: 100, height: 50 }, "fill:green", "stroke:black", item, mockGroup);

      const polygons = mockGroup.querySelectorAll("polygon");
      expect(polygons.length).toBeGreaterThanOrEqual(minPolygons);
      // The octagon has 8 points
      expect(polygons[polygons.length - 1]!.getAttribute("points")?.split(" ")).toHaveLength(8);
    });
  });

  describe("renderTypeShape", () => {
    test("should render a beveled rectangle for single occurrence", () => {
      const rect: Rectangle = { x: 10, y: 10, width: 100, height: 50 };
      const item = new DiagramItem("id9", "Test", DiagramItemType.type);
      item.maxOccurrence = 1;
      item.isSimpleContent = false;

      renderTypeShape(rect, "fill:yellow", "stroke:black", item, mockGroup);

      const polygons = mockGroup.querySelectorAll("polygon");
      expect(polygons.length).toBe(1);

      // Check that beveled rectangle has 6 points
      const points = polygons[0]!.getAttribute("points")?.split(" ");
      expect(points?.length).toBe(6);
    });

    test("should render shadow for multiple occurrences", () => {
      const rect: Rectangle = { x: 10, y: 10, width: 100, height: 50 };
      const item = new DiagramItem("id10", "Test", DiagramItemType.type);
      item.maxOccurrence = 2;
      item.isSimpleContent = false;

      renderTypeShape(rect, "fill:yellow", "stroke:black", item, mockGroup);

      const polygons = mockGroup.querySelectorAll("polygon");
      expect(polygons.length).toBe(2); // Shadow + main
    });

    test("should render filled bevel area for simple content", () => {
      const rect: Rectangle = { x: 10, y: 10, width: 100, height: 50 };
      const item = new DiagramItem("id11", "Test", DiagramItemType.type);
      item.maxOccurrence = 1;
      item.isSimpleContent = true;

      renderTypeShape(rect, "fill:yellow", "stroke:#ff0000", item, mockGroup);

      const polygons = mockGroup.querySelectorAll("polygon");
      expect(polygons.length).toBe(2); // Main shape + bevel fill

      // Check that bevel fill uses stroke color
      const bevelFill = polygons[1]!;
      expect(bevelFill.getAttribute("style")).toContain("fill:#ff0000");
    });

    test("should handle stroke color with semicolon", () => {
      const rect: Rectangle = { x: 10, y: 10, width: 100, height: 50 };
      const item = new DiagramItem("id12", "Test", DiagramItemType.type);
      item.maxOccurrence = 1;
      item.isSimpleContent = true;

      renderTypeShape(rect, "fill:yellow", "stroke:#0000ff;stroke-width:2", item, mockGroup);

      const polygons = mockGroup.querySelectorAll("polygon");
      const bevelFill = polygons[1]!;
      expect(bevelFill.getAttribute("style")).toContain("fill:#0000ff");
    });
  });

  describe("renderGroupShape of a compositor: group type indicator", () => {
    /**
     * Creates the diagram item of a compositor in a named complex type.
     *
     * @param name - The compositor, as named in its ID
     * @param groupType - Its group type
     * @returns The item
     */
    function compositor(name: string, groupType: DiagramItemGroupType): DiagramItem {
      const item = new DiagramItem(`/complexType:T/group:${name}[0]`, name, DiagramItemType.group);
      item.diagram = mockDiagram;
      item.groupType = groupType;
      return item;
    }

    test.each([
      ["sequence", DiagramItemGroupType.Sequence, 1], // One horizontal line
      ["choice", DiagramItemGroupType.Choice, 6], // The line and the trident
      ["all", DiagramItemGroupType.All, 8], // The lines and the tridents
    ])("should render %s indicator with three dots and its lines", (name, groupType, lineCount) => {
      renderGroupShape(
        { x: 10, y: 10, width: 100, height: 50 },
        "fill:green",
        "stroke:black",
        compositor(name, groupType),
        mockGroup
      );

      expect(mockGroup.querySelectorAll("circle")).toHaveLength(3);
      expect(mockGroup.querySelectorAll("line")).toHaveLength(lineCount);
    });

    test("should render no indicator for a group that is not a compositor", () => {
      const item = new DiagramItem("/group:G", "G", DiagramItemType.group);
      item.diagram = mockDiagram;

      renderGroupShape({ x: 10, y: 10, width: 100, height: 50 }, "fill:green", "stroke:black", item, mockGroup);

      expect(mockGroup.querySelectorAll("circle")).toHaveLength(0);
    });

    test("should render centered on rectangle", () => {
      const rect: Rectangle = { x: 50, y: 50, width: 100, height: 60 };

      renderGroupShape(
        rect,
        "fill:green",
        "stroke:black",
        compositor("sequence", DiagramItemGroupType.Sequence),
        mockGroup
      );

      // Check that elements are centered (centerX=100, centerY=80)
      const line = mockGroup.querySelector("line");
      expect(line).toBeTruthy();
      // The line should be centered vertically at y=80
      expect(line?.getAttribute("y1")).toBe("80");
      expect(line?.getAttribute("y2")).toBe("80");
    });
  });
});
