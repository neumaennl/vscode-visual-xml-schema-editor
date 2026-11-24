/**
 * Tests for text rendering functions
 */

import { renderText, renderDocumentation, renderOccurrence } from "./TextRenderers";
import { DiagramItem } from "./DiagramItem";
import { SchemaNodeType } from "../../shared/idStrategy";
import type { Diagram } from "./Diagram";
import { DiagramItemType } from "./DiagramTypes";
import { setupGetBBoxMock } from "../__tests__/svgTestHelpers";
import { component, documented, localElementWith, muteDiagramBuilderLog } from "../__tests__/diagramTestHelpers";

describe("TextRenderers", () => {
  let mockGroup: SVGElement;
  let mockSvg: SVGSVGElement;
  let mockDiagram: Diagram;

  beforeEach(() => {
    mockGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    mockSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
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
   * Creates an element item in the mock diagram.
   *
   * @param properties - The properties of the item, such as its boxes
   * @param diagramOptions - The options of the diagram that differ from the mock diagram
   * @returns The item
   */
  function makeItem(properties: Partial<DiagramItem>, diagramOptions: Partial<Diagram> = {}): DiagramItem {
    const diagram = Object.assign({}, mockDiagram, diagramOptions);
    const item = new DiagramItem(
      "test-id",
      "Test",
      DiagramItemType.element,
      component(`<xs:element name="Test"/>`),
      diagram
    );
    item.nodeType = SchemaNodeType.Element;
    Object.assign(item, properties);
    return item;
  }

  describe("renderText", () => {
    /** The name of an element that does not fit into a box of width 50. */
    const LONG_NAME = "ThisIsAVeryLongElementNameThatShouldBeTruncated";

    test.each([
      [
        "the item name",
        { label: "TestElement", elementBox: { x: 0, y: 0, width: 100, height: 50 } },
        {},
        "TestElement",
      ],
      [
        "the item name with type when showType is true",
        { label: "TestElement", schemaObject: { type_: "string" }, elementBox: { x: 0, y: 0, width: 200, height: 50 } },
        { showType: true },
        "TestElement: string",
      ],
      [
        "no type when showType is false",
        { label: "TestElement", schemaObject: { type_: "string" }, elementBox: { x: 0, y: 0, width: 200, height: 50 } },
        {},
        "TestElement",
      ],
    ])("should render %s", (_case, properties, diagramOptions, expected) => {
      renderText(makeItem(properties, diagramOptions), mockGroup, mockSvg);

      expect(mockGroup.querySelector("text")?.textContent).toBe(expected);
    });

    test.each([
      // Centered in the box of 100 × 50, where the label of 14 characters (84 in the test SVG) fits
      ["in the middle of the box", 0, 50, "x".repeat(14)],
      // Centered in the part right of the space for the reference arrow, which leaves less room
      ["right of the space that it leaves free", 21.5, 60.75, "xxxxxxxx..."],
    ])("should center the label %s", (_case, leftWidth, x, shown) => {
      const elementBox = { x: 0, y: 0, width: 100, height: 50 };
      renderText(makeItem({ label: "x".repeat(14), elementBox }), mockGroup, mockSvg, leftWidth);

      const text = mockGroup.querySelector("text")!;
      expect(Number(text.getAttribute("x"))).toBe(x);
      expect(text.firstChild?.textContent).toBe(shown);
    });

    test("should truncate long text and add a tooltip with the full text", () => {
      renderText(makeItem({ label: LONG_NAME, elementBox: { x: 0, y: 0, width: 50, height: 30 } }), mockGroup, mockSvg);

      const text = mockGroup.querySelector("text");
      expect(text?.textContent).toContain("...");
      expect(text?.textContent).not.toBe(LONG_NAME);
      expect(text?.querySelector("title")?.textContent).toBe(LONG_NAME);
    });

    // The text may be 10 pixels narrower than the box
    test.each([
      ["a short text into a small box", "Long text", 40],
      ["a text with ellipsis that is as long as fits", "0123456789ABCDEFGHIJKLMNOP", 110],
    ])("should truncate %s", (_case, label, width) => {
      renderText(makeItem({ label, elementBox: { x: 0, y: 0, width, height: 30 } }), mockGroup, mockSvg);

      const text = mockGroup.querySelector("text")?.firstChild?.textContent ?? "";
      expect(text.endsWith("...")).toBe(true);
      expect(text.length).toBeLessThan(label.length + 3);
    });

    test("should render an empty name", () => {
      renderText(makeItem({ label: "", elementBox: { x: 0, y: 0, width: 110, height: 30 } }), mockGroup, mockSvg);

      expect(mockGroup.querySelector("text")?.textContent).toBe("");
    });

    test("should not add tooltip when text is not truncated", () => {
      renderText(makeItem({ label: "Short", elementBox: { x: 0, y: 0, width: 200, height: 50 } }), mockGroup, mockSvg);

      expect(mockGroup.querySelector("text")?.querySelector("title")).toBeFalsy();
    });

    test("should center text in element box", () => {
      renderText(makeItem({ label: "Test", elementBox: { x: 10, y: 20, width: 100, height: 50 } }), mockGroup, mockSvg);

      const text = mockGroup.querySelector("text");
      expect(text?.getAttribute("x")).toBe("60"); // 10 + 100/2
      expect(text?.getAttribute("y")).toBe("45"); // 20 + 50/2
    });
  });

  describe("renderDocumentation", () => {
    test.each([
      ["one line", "This is documentation", 50, ["This is documentation"]],
      ["multiple lines", "Line 1\nLine 2\nLine 3", 100, ["Line 1", "Line 2", "Line 3"]],
      ["at most 3 lines", "Line 1\nLine 2\nLine 3\nLine 4\nLine 5", 150, ["Line 1", "Line 2", "Line 3"]],
    ])("should render %s of documentation", (_case, documentation, height, expected) => {
      renderDocumentation(
        makeItem({ schemaObject: documented(documentation), documentationBox: { x: 10, y: 100, width: 200, height } }),
        mockGroup
      );

      expect(Array.from(mockGroup.querySelectorAll("text"), (text) => text.textContent)).toEqual(expected);
    });

    test("should truncate long documentation lines", () => {
      renderDocumentation(
        makeItem({
          schemaObject: documented("A".repeat(100)),
          documentationBox: { x: 10, y: 100, width: 200, height: 50 },
        }),
        mockGroup
      );

      const text = mockGroup.querySelector("text");
      expect(text?.textContent.length).toBeLessThanOrEqual(50);
    });

    test.each([
      ["zero width", { x: 0, y: 0, width: 0, height: 50 }],
      ["zero height", { x: 0, y: 0, width: 100, height: 0 }],
    ])("should not render when documentation box has %s", (_case, documentationBox) => {
      renderDocumentation(makeItem({ schemaObject: documented("Some documentation"), documentationBox }), mockGroup);

      expect(mockGroup.querySelectorAll("text")).toHaveLength(0);
    });
  });

  describe("renderOccurrence", () => {
    muteDiagramBuilderLog();

    /**
     * Returns a local element with the given occurrences, drawn in a box of 100 × 50 at (10, 10).
     *
     * @param occurrences - The occurrence attributes of the element
     * @returns The item
     */
    function elementWith(occurrences: string): DiagramItem {
      const item = localElementWith(occurrences);
      item.elementBox = { x: 10, y: 10, width: 100, height: 50 };
      return item;
    }

    test.each([
      ["0..∞ for unbounded max", 'minOccurs="0" maxOccurs="unbounded"', false, "0..∞"],
      ["1..∞ for unbounded max", 'maxOccurs="unbounded"', false, "1..∞"],
      ["a specific range", 'maxOccurs="5"', false, "1..5"],
      ["no occurrence for default 1..1 when alwaysShowOccurrence is false", "", false, undefined],
      ["the default 1..1 when alwaysShowOccurrence is true", "", true, "1..1"],
      ["0..1", 'minOccurs="0"', false, "0..1"],
      ["0..0 for maxOccurs 0", 'minOccurs="0" maxOccurs="0"', false, "0..0"],
    ])("should render %s", (_case, occurrences, alwaysShowOccurrence, expected) => {
      const item = elementWith(occurrences);
      item.diagram.alwaysShowOccurrence = alwaysShowOccurrence;

      renderOccurrence(item, mockGroup);

      expect(mockGroup.querySelector("text")?.textContent).toBe(expected);
    });

    test("should position text relative to element box", () => {
      const item = elementWith('minOccurs="0" maxOccurs="unbounded"');
      item.elementBox = { x: 20, y: 30, width: 80, height: 40 };

      renderOccurrence(item, mockGroup);

      const text = mockGroup.querySelector("text");
      expect(text?.getAttribute("x")).toBe("105"); // 20 + 80 + 5
      expect(text?.getAttribute("y")).toBe("65"); // 30 + 40 - 5
    });
  });
});
