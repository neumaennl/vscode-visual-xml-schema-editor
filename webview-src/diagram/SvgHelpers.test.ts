/**
 * Tests for SVG helper functions
 */

import {
  svgLine,
  svgRectangle,
  svgPolygon,
  svgCircle,
  svgText,
} from "./SvgHelpers";
import { Point, Rectangle } from "./DiagramTypes";

describe("SvgHelpers", () => {
  let mockGroup: SVGElement;

  beforeEach(() => {
    // Create a mock SVG group element
    mockGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  });

  describe("svgLine", () => {
    it("should create a line element with correct attributes", () => {
      const style = "stroke:black;stroke-width:2";
      const x1 = 10;
      const y1 = 20;
      const x2 = 30;
      const y2 = 40;

      svgLine(mockGroup, style, x1, y1, x2, y2);

      const line = mockGroup.querySelector("line");
      expect(line).toBeTruthy();
      expect(line?.getAttribute("x1")).toBe("10");
      expect(line?.getAttribute("y1")).toBe("20");
      expect(line?.getAttribute("x2")).toBe("30");
      expect(line?.getAttribute("y2")).toBe("40");
      expect(line?.getAttribute("style")).toBe(style);
    });

    it("should handle negative coordinates", () => {
      svgLine(mockGroup, "stroke:red", -10, -20, -30, -40);

      const line = mockGroup.querySelector("line");
      expect(line?.getAttribute("x1")).toBe("-10");
      expect(line?.getAttribute("y1")).toBe("-20");
      expect(line?.getAttribute("x2")).toBe("-30");
      expect(line?.getAttribute("y2")).toBe("-40");
    });

    it("should handle decimal coordinates", () => {
      svgLine(mockGroup, "stroke:blue", 10.5, 20.75, 30.25, 40.5);

      const line = mockGroup.querySelector("line");
      expect(line?.getAttribute("x1")).toBe("10.5");
      expect(line?.getAttribute("y1")).toBe("20.75");
      expect(line?.getAttribute("x2")).toBe("30.25");
      expect(line?.getAttribute("y2")).toBe("40.5");
    });
  });

  describe("svgRectangle", () => {
    it("should create a rectangle element with correct attributes", () => {
      const rect: Rectangle = { x: 10, y: 20, width: 100, height: 50 };
      const fill = "fill:lightblue";
      const stroke = "stroke:black;stroke-width:1";

      svgRectangle(mockGroup, rect, fill, stroke);

      const rectangle = mockGroup.querySelector("rect");
      expect(rectangle).toBeTruthy();
      expect(rectangle?.getAttribute("x")).toBe("10");
      expect(rectangle?.getAttribute("y")).toBe("20");
      expect(rectangle?.getAttribute("width")).toBe("100");
      expect(rectangle?.getAttribute("height")).toBe("50");
      expect(rectangle?.getAttribute("style")).toBe(`${fill};${stroke}`);
    });

    it("should handle zero dimensions", () => {
      const rect: Rectangle = { x: 0, y: 0, width: 0, height: 0 };
      svgRectangle(mockGroup, rect, "fill:none", "stroke:none");

      const rectangle = mockGroup.querySelector("rect");
      expect(rectangle?.getAttribute("width")).toBe("0");
      expect(rectangle?.getAttribute("height")).toBe("0");
    });

    it("should handle negative coordinates", () => {
      const rect: Rectangle = { x: -10, y: -20, width: 30, height: 40 };
      svgRectangle(mockGroup, rect, "fill:red", "stroke:blue");

      const rectangle = mockGroup.querySelector("rect");
      expect(rectangle?.getAttribute("x")).toBe("-10");
      expect(rectangle?.getAttribute("y")).toBe("-20");
    });
  });

  describe("svgPolygon", () => {
    it("should create a polygon element with correct points", () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 50 },
        { x: 0, y: 50 },
      ];
      const fill = "fill:green";
      const stroke = "stroke:black";

      svgPolygon(mockGroup, points, fill, stroke);

      const polygon = mockGroup.querySelector("polygon");
      expect(polygon).toBeTruthy();
      expect(polygon?.getAttribute("points")).toBe("0,0 50,0 50,50 0,50");
      expect(polygon?.getAttribute("style")).toBe(`${fill};${stroke}`);
    });

    it("should handle single point", () => {
      const points: Point[] = [{ x: 10, y: 20 }];
      svgPolygon(mockGroup, points, "fill:blue", "stroke:red");

      const polygon = mockGroup.querySelector("polygon");
      expect(polygon?.getAttribute("points")).toBe("10,20");
    });

    it("should handle triangle", () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 25, y: 43.3 },
      ];
      svgPolygon(mockGroup, points, "fill:yellow", "stroke:black");

      const polygon = mockGroup.querySelector("polygon");
      expect(polygon?.getAttribute("points")).toBe("0,0 50,0 25,43.3");
    });

    it("should handle empty points array", () => {
      const points: Point[] = [];
      svgPolygon(mockGroup, points, "fill:none", "stroke:none");

      const polygon = mockGroup.querySelector("polygon");
      expect(polygon?.getAttribute("points")).toBe("");
    });
  });

  describe("svgCircle", () => {
    it("should create a circle element with correct attributes", () => {
      const cx = 50;
      const cy = 50;
      const r = 25;
      const fill = "fill:red";

      svgCircle(mockGroup, cx, cy, r, fill);

      const circle = mockGroup.querySelector("circle");
      expect(circle).toBeTruthy();
      expect(circle?.getAttribute("cx")).toBe("50");
      expect(circle?.getAttribute("cy")).toBe("50");
      expect(circle?.getAttribute("r")).toBe("25");
      expect(circle?.getAttribute("style")).toBe(fill);
    });

    it("should handle zero radius", () => {
      svgCircle(mockGroup, 10, 10, 0, "fill:blue");

      const circle = mockGroup.querySelector("circle");
      expect(circle?.getAttribute("r")).toBe("0");
    });

    it("should handle negative coordinates", () => {
      svgCircle(mockGroup, -10, -20, 5, "fill:green");

      const circle = mockGroup.querySelector("circle");
      expect(circle?.getAttribute("cx")).toBe("-10");
      expect(circle?.getAttribute("cy")).toBe("-20");
    });

    it("should handle decimal values", () => {
      svgCircle(mockGroup, 10.5, 20.75, 5.25, "fill:purple");

      const circle = mockGroup.querySelector("circle");
      expect(circle?.getAttribute("cx")).toBe("10.5");
      expect(circle?.getAttribute("cy")).toBe("20.75");
      expect(circle?.getAttribute("r")).toBe("5.25");
    });
  });

  describe("svgText", () => {
    it("should create a text element with correct attributes", () => {
      const text = "Hello World";
      const x = 10;
      const y = 20;
      const style = "font-size:14px;fill:black";

      svgText(mockGroup, text, x, y, style);

      const textElement = mockGroup.querySelector("text");
      expect(textElement).toBeTruthy();
      expect(textElement?.textContent).toBe(text);
      expect(textElement?.getAttribute("x")).toBe("10");
      expect(textElement?.getAttribute("y")).toBe("20");
      expect(textElement?.getAttribute("style")).toBe(style);
    });

    it("should create a text element with title for tooltip", () => {
      const text = "Short";
      const title = "This is a longer tooltip text";

      svgText(mockGroup, text, 0, 0, "font-size:12px", title);

      const textElement = mockGroup.querySelector("text");
      const titleElement = textElement?.querySelector("title");
      expect(titleElement).toBeTruthy();
      expect(titleElement?.textContent).toBe(title);
    });

    it("should not create title element when title is not provided", () => {
      svgText(mockGroup, "Text", 0, 0, "font-size:12px");

      const textElement = mockGroup.querySelector("text");
      const titleElement = textElement?.querySelector("title");
      expect(titleElement).toBeFalsy();
    });

    it("should handle empty string text", () => {
      svgText(mockGroup, "", 10, 20, "font-size:12px");

      const textElement = mockGroup.querySelector("text");
      expect(textElement?.textContent).toBe("");
    });

    it("should handle special characters in text", () => {
      const specialText = "<>&\"'";
      svgText(mockGroup, specialText, 0, 0, "font-size:12px");

      const textElement = mockGroup.querySelector("text");
      expect(textElement?.textContent).toBe(specialText);
    });

    it("should handle negative coordinates", () => {
      svgText(mockGroup, "Text", -10, -20, "font-size:12px");

      const textElement = mockGroup.querySelector("text");
      expect(textElement?.getAttribute("x")).toBe("-10");
      expect(textElement?.getAttribute("y")).toBe("-20");
    });

    it("should create title element with empty title string", () => {
      svgText(mockGroup, "Text", 0, 0, "font-size:12px", "");

      const textElement = mockGroup.querySelector("text");
      const titleElement = textElement?.querySelector("title");
      expect(titleElement).toBeTruthy();
      expect(titleElement?.textContent).toBe("");
    });
  });

  describe("Integration tests", () => {
    it("should allow multiple elements to be added to the same group", () => {
      svgLine(mockGroup, "stroke:black", 0, 0, 10, 10);
      svgRectangle(
        mockGroup,
        { x: 0, y: 0, width: 10, height: 10 },
        "fill:red",
        "stroke:black"
      );
      svgCircle(mockGroup, 5, 5, 2, "fill:blue");
      svgText(mockGroup, "Label", 0, 0, "font-size:12px");

      expect(mockGroup.children.length).toBe(4);
      expect(mockGroup.querySelector("line")).toBeTruthy();
      expect(mockGroup.querySelector("rect")).toBeTruthy();
      expect(mockGroup.querySelector("circle")).toBeTruthy();
      expect(mockGroup.querySelector("text")).toBeTruthy();
    });
  });
});
