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
import type { Diagram } from "./Diagram";
import type { Rectangle } from "./DiagramTypes";
import { DiagramItemType } from "./DiagramTypes";
import { setupGetBBoxMock } from "../__tests__/svgTestHelpers";

describe("TextRenderers", () => {
  let mockGroup: SVGElement;
  let mockSvg: SVGSVGElement;
  let mockDiagram: Diagram;

  beforeEach(() => {
    mockGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    mockSvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    document.body.appendChild(mockSvg);

    // Mock getBBox for SVG text elements (not supported in jsdom)
    setupGetBBoxMock();

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

  /**
   * Creates an element item in the mock diagram that is not scaled.
   *
   * @param properties - The properties of the item, such as its boxes
   * @param diagramOptions - The options of the diagram that differ from the mock diagram
   * @returns The item
   */
  function makeItem(properties: Partial<DiagramItem>, diagramOptions: Partial<Diagram> = {}): DiagramItem {
    const item = new DiagramItem("test-id", "Test", DiagramItemType.element);
    Object.assign(item, properties);
    item.diagram = { ...mockDiagram, ...diagramOptions } as Diagram;
    item.scaleRectangle = (rect: Rectangle): Rectangle => rect;
    return item;
  }

  describe("renderText", () => {
    /** The name of an element that does not fit into a box of width 50. */
    const LONG_NAME = "ThisIsAVeryLongElementNameThatShouldBeTruncated";

    test.each([
      ["the item name", { name: "TestElement", elementBox: { x: 0, y: 0, width: 100, height: 50 } }, {}, "TestElement"],
      [
        "the item name with type when showType is true",
        { name: "TestElement", type: "string", elementBox: { x: 0, y: 0, width: 200, height: 50 } },
        { showType: true },
        "TestElement: string",
      ],
      [
        "no type when showType is false",
        { name: "TestElement", type: "string", elementBox: { x: 0, y: 0, width: 200, height: 50 } },
        {},
        "TestElement",
      ],
    ])("should render %s", (_case, properties, diagramOptions, expected) => {
      renderText(makeItem(properties, diagramOptions), mockGroup, mockSvg);

      expect(mockGroup.querySelector("text")?.textContent).toBe(expected);
    });

    test("should truncate long text and add a tooltip with the full text", () => {
      renderText(makeItem({ name: LONG_NAME, elementBox: { x: 0, y: 0, width: 50, height: 30 } }), mockGroup, mockSvg);

      const text = mockGroup.querySelector("text");
      expect(text?.textContent).toContain("...");
      expect(text?.textContent).not.toBe(LONG_NAME);
      expect(text?.querySelector("title")?.textContent).toBe(LONG_NAME);
    });

    test("should not add tooltip when text is not truncated", () => {
      renderText(makeItem({ name: "Short", elementBox: { x: 0, y: 0, width: 200, height: 50 } }), mockGroup, mockSvg);

      expect(mockGroup.querySelector("text")?.querySelector("title")).toBeFalsy();
    });

    test("should center text in element box", () => {
      renderText(makeItem({ name: "Test", elementBox: { x: 10, y: 20, width: 100, height: 50 } }), mockGroup, mockSvg);

      const text = mockGroup.querySelector("text");
      expect(text?.getAttribute("x")).toBe("60"); // 10 + 100/2
      expect(text?.getAttribute("y")).toBe("45"); // 20 + 50/2
    });
  });

  describe("truncateText", () => {
    test("should return text as-is when it fits", () => {
      const text = "Short";
      const result = truncateText(text, 1000, 10, mockSvg);
      expect(result).toBe("Short");
    });

    test("should truncate text with ellipsis when too long", () => {
      const text = "This is a very long text that will not fit";
      const result = truncateText(text, 50, 10, mockSvg);
      expect(result).toContain("...");
      expect(result.length).toBeLessThan(text.length);
    });

    test("should handle empty text", () => {
      const result = truncateText("", 100, 10, mockSvg);
      expect(result).toBe("");
    });

    test("should handle very small maxWidth", () => {
      const text = "Long text";
      const result = truncateText(text, 30, 10, mockSvg);
      expect(result).toContain("...");
      expect(result.length).toBeLessThan(text.length);
    });

    test("should use binary search to find optimal truncation point", () => {
      const text = "0123456789ABCDEFGHIJKLMNOP";
      const result = truncateText(text, 100, 10, mockSvg);
      // Result should be truncated but as long as possible
      expect(result.endsWith("...")).toBe(true);
    });
  });

  describe("renderDocumentation", () => {
    test.each([
      ["one line", "This is documentation", 50, ["This is documentation"]],
      ["multiple lines", "Line 1\nLine 2\nLine 3", 100, ["Line 1", "Line 2", "Line 3"]],
      ["at most 3 lines", "Line 1\nLine 2\nLine 3\nLine 4\nLine 5", 150, ["Line 1", "Line 2", "Line 3"]],
    ])("should render %s of documentation", (_case, documentation, height, expected) => {
      renderDocumentation(makeItem({ documentation, documentationBox: { x: 10, y: 100, width: 200, height } }), mockGroup);

      expect(Array.from(mockGroup.querySelectorAll("text"), (text) => text.textContent)).toEqual(expected);
    });

    test("should truncate long documentation lines", () => {
      renderDocumentation(makeItem({ documentation: "A".repeat(100), documentationBox: { x: 10, y: 100, width: 200, height: 50 } }), mockGroup);

      const text = mockGroup.querySelector("text");
      expect(text?.textContent.length).toBeLessThanOrEqual(50);
    });

    test.each([
      ["zero width", { x: 0, y: 0, width: 0, height: 50 }],
      ["zero height", { x: 0, y: 0, width: 100, height: 0 }],
    ])("should not render when documentation box has %s", (_case, documentationBox) => {
      renderDocumentation(makeItem({ documentation: "Some documentation", documentationBox }), mockGroup);

      expect(mockGroup.querySelectorAll("text")).toHaveLength(0);
    });
  });

  describe("renderOccurrence", () => {
    test.each([
      ["0..∞ for unbounded max", 0, -1, {}, "0..∞"],
      ["a specific range", 1, 5, {}, "1..5"],
      ["no occurrence for default 1..1 when alwaysShowOccurrence is false", 1, 1, {}, undefined],
      ["the default 1..1 when alwaysShowOccurrence is true", 1, 1, { alwaysShowOccurrence: true }, "1..1"],
      ["0..1", 0, 1, {}, "0..1"],
    ])("should render %s", (_case, minOccurrence, maxOccurrence, diagramOptions, expected) => {
      const item = makeItem({ minOccurrence, maxOccurrence, elementBox: { x: 10, y: 10, width: 100, height: 50 } }, diagramOptions);

      renderOccurrence(item, mockGroup);

      expect(mockGroup.querySelector("text")?.textContent).toBe(expected);
    });

    test("should position text relative to element box", () => {
      renderOccurrence(makeItem({ minOccurrence: 0, maxOccurrence: -1, elementBox: { x: 20, y: 30, width: 80, height: 40 } }), mockGroup);

      const text = mockGroup.querySelector("text");
      expect(text?.getAttribute("x")).toBe("105"); // 20 + 80 + 5
      expect(text?.getAttribute("y")).toBe("65"); // 30 + 40 - 5
    });
  });
});
