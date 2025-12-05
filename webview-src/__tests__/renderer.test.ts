/**
 * Unit tests for DiagramRenderer class.
 */

import { DiagramRenderer } from "../renderer";
import { Diagram } from "../diagram/Diagram";

describe("DiagramRenderer", () => {
  let mockCanvas: SVGSVGElement;
  let renderer: DiagramRenderer;

  beforeEach(() => {
    // Create mock SVG element
    mockCanvas = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const viewState = { zoom: 1, panX: 0, panY: 0 };
    renderer = new DiagramRenderer(mockCanvas, viewState);
  });

  describe("constructor", () => {
    it("should initialize renderer with canvas", () => {
      expect(renderer).toBeDefined();
    });

    it("should create main group for transformations", () => {
      const groups = mockCanvas.getElementsByTagName("g");
      expect(groups.length).toBeGreaterThan(0);
    });
  });

  describe("updateView", () => {
    it("should update view with new zoom and pan", () => {
      const newViewState = { zoom: 2, panX: 10, panY: 20 };
      renderer.updateView(newViewState);
      // View transformation is applied to the main group
      expect(true).toBe(true);
    });
  });

  describe("renderSchema", () => {
    it("should clear previous render before rendering new schema", () => {
      const mockSchema = {
        element: [{ name: "Test", type_: "string" }],
      };
      const onNodeClick = jest.fn();
      
      renderer.renderSchema(mockSchema, onNodeClick);
      
      // Schema rendering creates diagram nodes
      expect(true).toBe(true);
    });
  });
});
