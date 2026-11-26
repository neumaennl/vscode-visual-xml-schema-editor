/**
 * Tests for shape rendering functions
 */

import type { Compositor } from "../../shared/types";
import {
  REFERENCE_ARROW_WIDTH,
  renderElementShape,
  renderGroupShape,
  renderCompositorShape,
  renderReferenceArrow,
  renderTypeShape,
} from "./ShapeRenderers";
import { DiagramItem } from "./DiagramItem";
import type { Rectangle } from "./DiagramTypes";
import { DiagramItemType } from "./DiagramTypes";
import type { Diagram } from "./Diagram";
import { diagramItem, muteDiagramBuilderLog, emptyDiagram } from "../__tests__/diagramTestHelpers";
import { webviewSchemaWith } from "../../shared/__tests__/schemaTestHelpers";

/** The rectangle that the tests draw in. */
const RECT: Rectangle = { x: 10, y: 10, width: 100, height: 50 };

/** A complex type with elements and a choice whose occurrences decide whether they are drawn as repeated, a simple type and a complex type with simple content. */
const PARTICLES = `<xs:complexType name="T"><xs:sequence>
  <xs:element name="single"/>
  <xs:element name="unbounded" maxOccurs="unbounded"/>
  <xs:element name="five" maxOccurs="5"/>
  <xs:element name="removed" minOccurs="0" maxOccurs="0"/>
  <xs:choice maxOccurs="unbounded"/>
</xs:sequence></xs:complexType>
<xs:simpleType name="S"><xs:restriction base="xs:string"/></xs:simpleType>
<xs:complexType name="Price"><xs:simpleContent><xs:extension base="xs:decimal"/></xs:simpleContent></xs:complexType>`;

/**
 * Returns the item of a particle of {@link PARTICLES}.
 *
 * @param path - The path of the particle below the sequence of the type, empty for the sequence itself
 * @returns The item
 */
function particle(path: string): DiagramItem {
  return diagramItem(webviewSchemaWith(PARTICLES), `/complexType:T/sequence[0]${path}`);
}

/**
 * Returns the item of a named type of {@link PARTICLES}.
 *
 * @param id - The ID of the type
 * @returns The item
 */
function namedType(id = "/complexType:T"): DiagramItem {
  return diagramItem(webviewSchemaWith(PARTICLES), id);
}

describe("ShapeRenderers", () => {
  muteDiagramBuilderLog();
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
    test.each([
      ["without maxOccurs", "/element:single[0]", 1],
      ["with maxOccurs unbounded", "/element:unbounded[1]", 2],
      ["with maxOccurs 5", "/element:five[2]", 2],
      ["with maxOccurs 0, which removes it from the content model,", "/element:removed[3]", 1],
    ])("should render an element %s with %i rectangles", (_case, element, rectangleCount) => {
      renderElementShape(RECT, "fill:blue", "stroke:black", particle(element), mockGroup);

      expect(mockGroup.querySelectorAll("rect")).toHaveLength(rectangleCount);
    });

    test("should render the shadow of a repeated element offset behind the rectangle", () => {
      renderElementShape(RECT, "fill:blue", "stroke:black", particle("/element:unbounded[1]"), mockGroup);

      const rectangles = mockGroup.querySelectorAll("rect");
      expect([rectangles[0]!.getAttribute("x"), rectangles[0]!.getAttribute("y")]).toEqual(["13", "13"]);
      expect([rectangles[1]!.getAttribute("x"), rectangles[1]!.getAttribute("y")]).toEqual(["10", "10"]);
      expect(rectangles[1]!.getAttribute("width")).toBe("100");
      expect(rectangles[1]!.getAttribute("height")).toBe("50");
    });
  });

  describe("renderGroupShape", () => {
    test.each([
      ["an octagon for a compositor without maxOccurs", "", 1],
      ["a shadow for a compositor with maxOccurs unbounded", "/choice[0]", 2],
    ])("should render %s", (_case, path, polygonCount) => {
      renderGroupShape(RECT, "fill:green", "stroke:black", particle(path), mockGroup);

      const polygons = mockGroup.querySelectorAll("polygon");
      expect(polygons).toHaveLength(polygonCount);
      // The octagon has 8 points
      expect(polygons[polygons.length - 1]!.getAttribute("points")?.split(" ")).toHaveLength(8);
    });
  });

  describe("renderTypeShape", () => {
    test("should render a beveled rectangle for a named type", () => {
      renderTypeShape(RECT, "fill:yellow", "stroke:black", namedType(), mockGroup);

      const polygons = mockGroup.querySelectorAll("polygon");
      expect(polygons.length).toBe(1);

      // Check that beveled rectangle has 6 points
      const points = polygons[0]!.getAttribute("points")?.split(" ");
      expect(points?.length).toBe(6);
    });

    test.each([
      ["a simple type", "/simpleType:S"],
      ["a complex type with simple content", "/complexType:Price"],
    ])("should render filled bevel area for %s", (_case, id) => {
      renderTypeShape(RECT, "fill:yellow", "stroke:#ff0000", namedType(id), mockGroup);

      const polygons = mockGroup.querySelectorAll("polygon");
      expect(polygons.length).toBe(2); // Main shape + bevel fill

      // Check that bevel fill uses stroke color
      const bevelFill = polygons[1]!;
      expect(bevelFill.getAttribute("style")).toContain("fill:#ff0000");
    });

    test("should handle stroke color with semicolon", () => {
      renderTypeShape(RECT, "fill:yellow", "stroke:#0000ff;stroke-width:2", namedType("/simpleType:S"), mockGroup);

      const polygons = mockGroup.querySelectorAll("polygon");
      const bevelFill = polygons[1]!;
      expect(bevelFill.getAttribute("style")).toContain("fill:#0000ff");
    });
  });

  describe("renderReferenceArrow", () => {
    test.each([
      ["an element", DiagramItemType.element],
      // At the same place in the octagon of a group, across its cut corner
      ["a group", DiagramItemType.group],
    ])(
      "should draw the arrow of %s in the lower left corner, within the width that the label leaves free",
      (_case, itemType) => {
        const item = new DiagramItem("reference", "reference", itemType, { ref: "R" }, emptyDiagram());
        item.diagram = mockDiagram;

        renderReferenceArrow({ x: 10, y: 10, width: 100, height: 40 }, item, mockGroup);

        // 3 inside the corner (10, 50), 14 long in both directions
        const line = mockGroup.querySelector(".reference-arrow line")!;
        const tip = mockGroup.querySelector(".reference-arrow polygon")!.getAttribute("points")!.split(" ")[0]!;
        expect([line.getAttribute("x1"), line.getAttribute("y1"), tip]).toEqual(["13", "47", "27,33"]);
        expect(REFERENCE_ARROW_WIDTH).toBe(27 + 1 - 10);
      }
    );
  });

  describe("renderCompositorShape", () => {
    /**
     * Returns the diagram item of a compositor in a named complex type.
     *
     * @param name - The compositor
     * @returns The item
     */
    function compositor(name: Compositor): DiagramItem {
      return diagramItem(
        webviewSchemaWith(`<xs:complexType name="T"><xs:${name}/></xs:complexType>`),
        `/complexType:T/${name}[0]`
      );
    }

    test.each<[Compositor, number]>([
      ["sequence", 1], // One horizontal line
      ["choice", 6], // The line and the trident
      ["all", 8], // The lines and the tridents
    ])("should render %s indicator with three dots and its lines", (name, lineCount) => {
      renderCompositorShape(
        { x: 10, y: 10, width: 100, height: 50 },
        "fill:green",
        "stroke:black",
        name,
        compositor(name),
        mockGroup
      );

      expect(mockGroup.querySelectorAll("circle")).toHaveLength(3);
      expect(mockGroup.querySelectorAll("line")).toHaveLength(lineCount);
    });

    test("should render no indicator with the shape of a group", () => {
      const item = diagramItem(webviewSchemaWith(`<xs:group name="G"><xs:sequence/></xs:group>`), "/group:G");

      renderGroupShape({ x: 10, y: 10, width: 100, height: 50 }, "fill:green", "stroke:black", item, mockGroup);

      expect(mockGroup.querySelectorAll("circle")).toHaveLength(0);
    });

    test("should render centered on rectangle", () => {
      const rect: Rectangle = { x: 50, y: 50, width: 100, height: 60 };

      renderCompositorShape(rect, "fill:green", "stroke:black", "sequence", compositor("sequence"), mockGroup);

      // Check that elements are centered (centerX=100, centerY=80)
      const line = mockGroup.querySelector("line");
      expect(line).toBeTruthy();
      // The line should be centered vertically at y=80
      expect(line?.getAttribute("y1")).toBe("80");
      expect(line?.getAttribute("y2")).toBe("80");
    });
  });
});
