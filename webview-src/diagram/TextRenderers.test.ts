/**
 * Tests for text rendering functions
 */

import {
  renderText,
  truncateText,
  renderDocumentation,
  renderOccurrence,
} from "./TextRenderers";
import { DiagramItem } from "./DiagramItem";
import { Diagram } from "./Diagram";
import { Rectangle } from "./DiagramTypes";

describe("TextRenderers", () => {
  let mockGroup: SVGElement;
  let mockSvg: SVGSVGElement;
  let mockDiagram: Diagram;

  beforeEach(() => {
    mockGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    mockSvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    ) as SVGSVGElement;
    document.body.appendChild(mockSvg);

    mockDiagram = {
      style: {
        fontFamily: "Arial",
        fontSize: 10,
        smallFontSize: 8,
        documentationFontSize: 9,
        foregroundColor: "#000000",
        lineColor: "#000000",
        backgroundColor: "#ffffff",
      },
      showType: false,
      alwaysShowOccurrence: false,
    } as Diagram;
  });

  afterEach(() => {
    document.body.removeChild(mockSvg);
  });

  describe("renderText", () => {
    it("should render item name", () => {
      const item = new DiagramItem("test-id", "Test", "element" as any);
      item.name = "TestElement";
      item.diagram = mockDiagram;
      item.elementBox = { x: 0, y: 0, width: 100, height: 50 };
      item.scaleRectangle = (rect: Rectangle) => rect;

      renderText(item, mockGroup, mockSvg);

      const text = mockGroup.querySelector("text");
      expect(text).toBeTruthy();
      expect(text?.textContent).toBe("TestElement");
    });

    it("should render item name with type when showType is true", () => {
      const item = new DiagramItem("test-id", "Test", "element" as any);
      item.name = "TestElement";
      item.type = "string";
      item.diagram = {...mockDiagram, showType: true} as any;
      item.elementBox = { x: 0, y: 0, width: 200, height: 50 };
      item.scaleRectangle = (rect: Rectangle) => rect;

      renderText(item, mockGroup, mockSvg);

      const text = mockGroup.querySelector("text");
      expect(text?.textContent).toBe("TestElement: string");
    });

    it("should not show type when showType is false", () => {
      const item = new DiagramItem("test-id", "Test", "element" as any);
      item.name = "TestElement";
      item.type = "string";
      item.diagram = mockDiagram;
      item.elementBox = { x: 0, y: 0, width: 200, height: 50 };
      item.scaleRectangle = (rect: Rectangle) => rect;

      renderText(item, mockGroup, mockSvg);

      const text = mockGroup.querySelector("text");
      expect(text?.textContent).toBe("TestElement");
    });

    it("should truncate long text", () => {
      const item = new DiagramItem("test-id", "Test", "element" as any);
      item.name = "ThisIsAVeryLongElementNameThatShouldBeTruncated";
      item.diagram = mockDiagram;
      item.elementBox = { x: 0, y: 0, width: 50, height: 30 };
      item.scaleRectangle = (rect: Rectangle) => rect;

      renderText(item, mockGroup, mockSvg);

      const text = mockGroup.querySelector("text");
      expect(text?.textContent).toContain("...");
      expect(text?.textContent?.length).toBeLessThan(item.name.length);
    });

    it("should add tooltip with full text when truncated", () => {
      const item = new DiagramItem("test-id", "Test", "element" as any);
      item.name = "ThisIsAVeryLongElementNameThatShouldBeTruncated";
      item.diagram = mockDiagram;
      item.elementBox = { x: 0, y: 0, width: 50, height: 30 };
      item.scaleRectangle = (rect: Rectangle) => rect;

      renderText(item, mockGroup, mockSvg);

      const text = mockGroup.querySelector("text");
      const title = text?.querySelector("title");
      expect(title).toBeTruthy();
      expect(title?.textContent).toBe(item.name);
    });

    it("should not add tooltip when text is not truncated", () => {
      const item = new DiagramItem("test-id", "Test", "element" as any);
      item.name = "Short";
      item.diagram = mockDiagram;
      item.elementBox = { x: 0, y: 0, width: 200, height: 50 };
      item.scaleRectangle = (rect: Rectangle) => rect;

      renderText(item, mockGroup, mockSvg);

      const text = mockGroup.querySelector("text");
      const title = text?.querySelector("title");
      expect(title).toBeFalsy();
    });

    it("should center text in element box", () => {
      const item = new DiagramItem("test-id", "Test", "element" as any);
      item.name = "Test";
      item.diagram = mockDiagram;
      item.elementBox = { x: 10, y: 20, width: 100, height: 50 };
      item.scaleRectangle = (rect: Rectangle) => rect;

      renderText(item, mockGroup, mockSvg);

      const text = mockGroup.querySelector("text");
      expect(text?.getAttribute("x")).toBe("60"); // 10 + 100/2
      expect(text?.getAttribute("y")).toBe("45"); // 20 + 50/2
    });
  });

  describe("truncateText", () => {
    it("should return text as-is when it fits", () => {
      const text = "Short";
      const result = truncateText(text, 1000, 10, mockSvg);
      expect(result).toBe("Short");
    });

    it("should truncate text with ellipsis when too long", () => {
      const text = "This is a very long text that will not fit";
      const result = truncateText(text, 50, 10, mockSvg);
      expect(result).toContain("...");
      expect(result.length).toBeLessThan(text.length);
    });

    it("should handle empty text", () => {
      const result = truncateText("", 100, 10, mockSvg);
      expect(result).toBe("");
    });

    it("should handle very small maxWidth", () => {
      const text = "Long text";
      const result = truncateText(text, 5, 10, mockSvg);
      expect(result).toContain("...");
    });

    it("should use binary search to find optimal truncation point", () => {
      const text = "0123456789ABCDEFGHIJKLMNOP";
      const result = truncateText(text, 100, 10, mockSvg);
      // Result should be truncated but as long as possible
      expect(result.endsWith("...")).toBe(true);
    });
  });

  describe("renderDocumentation", () => {
    it("should render documentation text", () => {
      const item = new DiagramItem("test-id", "Test", "element" as any);
      item.documentation = "This is documentation";
      item.diagram = mockDiagram;
      item.documentationBox = { x: 10, y: 100, width: 200, height: 50 };
      item.scaleRectangle = (rect: Rectangle) => rect;

      renderDocumentation(item, mockGroup);

      const text = mockGroup.querySelectorAll("text");
      expect(text.length).toBe(1);
      expect(text[0].textContent).toBe("This is documentation");
    });

    it("should render multiple lines of documentation", () => {
      const item = new DiagramItem("test-id", "Test", "element" as any);
      item.documentation = "Line 1\nLine 2\nLine 3";
      item.diagram = mockDiagram;
      item.documentationBox = { x: 10, y: 100, width: 200, height: 100 };
      item.scaleRectangle = (rect: Rectangle) => rect;

      renderDocumentation(item, mockGroup);

      const texts = mockGroup.querySelectorAll("text");
      expect(texts.length).toBe(3);
      expect(texts[0].textContent).toBe("Line 1");
      expect(texts[1].textContent).toBe("Line 2");
      expect(texts[2].textContent).toBe("Line 3");
    });

    it("should limit to 3 lines of documentation", () => {
      const item = new DiagramItem("test-id", "Test", "element" as any);
      item.documentation = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5";
      item.diagram = mockDiagram;
      item.documentationBox = { x: 10, y: 100, width: 200, height: 150 };
      item.scaleRectangle = (rect: Rectangle) => rect;

      renderDocumentation(item, mockGroup);

      const texts = mockGroup.querySelectorAll("text");
      expect(texts.length).toBe(3);
    });

    it("should truncate long documentation lines", () => {
      const item = new DiagramItem("test-id", "Test", "element" as any);
      const longLine = "A".repeat(100);
      item.documentation = longLine;
      item.diagram = mockDiagram;
      item.documentationBox = { x: 10, y: 100, width: 200, height: 50 };
      item.scaleRectangle = (rect: Rectangle) => rect;

      renderDocumentation(item, mockGroup);

      const text = mockGroup.querySelector("text");
      expect(text?.textContent?.length).toBeLessThanOrEqual(50);
    });

    it("should not render when documentation box has zero width", () => {
      const item = new DiagramItem("test-id", "Test", "element" as any);
      item.documentation = "Some documentation";
      item.diagram = mockDiagram;
      item.documentationBox = { x: 0, y: 0, width: 0, height: 50 };
      item.scaleRectangle = (rect: Rectangle) => rect;

      renderDocumentation(item, mockGroup);

      const texts = mockGroup.querySelectorAll("text");
      expect(texts.length).toBe(0);
    });

    it("should not render when documentation box has zero height", () => {
      const item = new DiagramItem("test-id", "Test", "element" as any);
      item.documentation = "Some documentation";
      item.diagram = mockDiagram;
      item.documentationBox = { x: 0, y: 0, width: 100, height: 0 };
      item.scaleRectangle = (rect: Rectangle) => rect;

      renderDocumentation(item, mockGroup);

      const texts = mockGroup.querySelectorAll("text");
      expect(texts.length).toBe(0);
    });
  });

  describe("renderOccurrence", () => {
    it("should render occurrence for unbounded max", () => {
      const item = new DiagramItem("test-id", "Test", "element" as any);
      item.minOccurrence = 0;
      item.maxOccurrence = -1; // Unbounded
      item.diagram = mockDiagram;
      item.elementBox = { x: 10, y: 10, width: 100, height: 50 };
      item.scaleRectangle = (rect: Rectangle) => rect;

      renderOccurrence(item, mockGroup);

      const text = mockGroup.querySelector("text");
      expect(text).toBeTruthy();
      expect(text?.textContent).toBe("0..∞");
    });

    it("should render occurrence for specific range", () => {
      const item = new DiagramItem("test-id", "Test", "element" as any);
      item.minOccurrence = 1;
      item.maxOccurrence = 5;
      item.diagram = mockDiagram;
      item.elementBox = { x: 10, y: 10, width: 100, height: 50 };
      item.scaleRectangle = (rect: Rectangle) => rect;

      renderOccurrence(item, mockGroup);

      const text = mockGroup.querySelector("text");
      expect(text?.textContent).toBe("1..5");
    });

    it("should not render occurrence for default 1..1 when alwaysShowOccurrence is false", () => {
      const item = new DiagramItem("test-id", "Test", "element" as any);
      item.minOccurrence = 1;
      item.maxOccurrence = 1;
      item.diagram = mockDiagram;
      item.elementBox = { x: 10, y: 10, width: 100, height: 50 };
      item.scaleRectangle = (rect: Rectangle) => rect;

      renderOccurrence(item, mockGroup);

      const text = mockGroup.querySelector("text");
      expect(text).toBeFalsy();
    });

    it("should render occurrence for default 1..1 when alwaysShowOccurrence is true", () => {
      const item = new DiagramItem("test-id", "Test", "element" as any);
      item.minOccurrence = 1;
      item.maxOccurrence = 1;
      item.diagram = {...mockDiagram, alwaysShowOccurrence: true} as any;
      item.elementBox = { x: 10, y: 10, width: 100, height: 50 };
      item.scaleRectangle = (rect: Rectangle) => rect;

      renderOccurrence(item, mockGroup);

      const text = mockGroup.querySelector("text");
      expect(text).toBeTruthy();
      expect(text?.textContent).toBe("1..1");
    });

    it("should render occurrence for 0..1", () => {
      const item = new DiagramItem("test-id", "Test", "element" as any);
      item.minOccurrence = 0;
      item.maxOccurrence = 1;
      item.diagram = mockDiagram;
      item.elementBox = { x: 10, y: 10, width: 100, height: 50 };
      item.scaleRectangle = (rect: Rectangle) => rect;

      renderOccurrence(item, mockGroup);

      const text = mockGroup.querySelector("text");
      expect(text?.textContent).toBe("0..1");
    });

    it("should position text relative to element box", () => {
      const item = new DiagramItem("test-id", "Test", "element" as any);
      item.minOccurrence = 0;
      item.maxOccurrence = -1;
      item.diagram = mockDiagram;
      item.elementBox = { x: 20, y: 30, width: 80, height: 40 };
      item.scaleRectangle = (rect: Rectangle) => rect;

      renderOccurrence(item, mockGroup);

      const text = mockGroup.querySelector("text");
      expect(text?.getAttribute("x")).toBe("105"); // 20 + 80 + 5
      expect(text?.getAttribute("y")).toBe("65"); // 30 + 40 - 5
    });
  });
});
