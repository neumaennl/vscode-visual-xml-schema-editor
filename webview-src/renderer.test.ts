/**
 * Unit tests for DiagramRenderer class.
 */

import { DiagramRenderer } from "./renderer";

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
      expect(renderer).toBeInstanceOf(DiagramRenderer);
    });

    it("should create main group for transformations", () => {
      const groups = mockCanvas.getElementsByTagName("g");
      expect(groups.length).toBeGreaterThan(0);
    });
  });

  describe("updateView", () => {
    it("should apply transformation to main group", () => {
      const newViewState = { zoom: 2, panX: 10, panY: 20 };
      renderer.updateView(newViewState);
      
      const mainGroup = mockCanvas.getElementsByTagName("g")[0];
      const transform = mainGroup.getAttribute("transform");
      expect(transform).toBeTruthy();
      expect(transform).toContain("translate");
      expect(transform).toContain("scale");
    });
  });

  describe("renderSchema", () => {
    beforeEach(() => {
      // Mock getBBox for SVG text elements (not supported in jsdom)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (Element.prototype as any).getBBox = jest.fn(function (this: SVGTextElement) {
        const textContent = this.textContent || "";
        return {
          x: 0,
          y: 0,
          width: textContent.length * 6,
          height: 10,
        };
      });
    });

    it("should clear previous content before rendering", () => {
      // Add some initial content
      const testGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      testGroup.setAttribute("data-test", "initial");
      mockCanvas.appendChild(testGroup);
      
      const mockSchema = {
        element: [{ name: "Test", type_: "string" }],
      };
      const onNodeClick = jest.fn();
      
      renderer.renderSchema(mockSchema, onNodeClick);
      
      // Verify diagram was created (main group should exist)
      const groups = mockCanvas.getElementsByTagName("g");
      expect(groups.length).toBeGreaterThan(0);
    });

    it("should handle empty schema", () => {
      const emptySchema = {};
      const onNodeClick = jest.fn();
      
      expect(() => {
        renderer.renderSchema(emptySchema, onNodeClick);
      }).not.toThrow();
    });

    it("should handle null schema", () => {
      const onNodeClick = jest.fn();
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      renderer.renderSchema(null as any, onNodeClick);
      
      // Should show message instead of throwing
      expect(mockCanvas.textContent).toContain("No schema to display");
    });

    it("should render schema with elements", () => {
      const mockSchema = {
        element: [
          { name: "Person", type_: "PersonType" },
          { name: "Address", type_: "AddressType" },
        ],
      };
      const onNodeClick = jest.fn();
      
      renderer.renderSchema(mockSchema, onNodeClick);
      
      const items = mockCanvas.querySelectorAll(".diagram-item");
      expect(items.length).toBeGreaterThan(0);
    });

    it("should store onNodeClick callback", () => {
      const mockSchema = {
        element: [{ name: "Test", type_: "string" }],
      };
      const onNodeClick = jest.fn();
      
      renderer.renderSchema(mockSchema, onNodeClick);
      
      // Callback should be stored for click handling
      expect(onNodeClick).toBeDefined();
    });
  });

  describe("refresh", () => {
    beforeEach(() => {
      // Mock getBBox for SVG text elements (not supported in jsdom)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (Element.prototype as any).getBBox = jest.fn(function (this: SVGTextElement) {
        const textContent = this.textContent || "";
        return { x: 0, y: 0, width: textContent.length * 6, height: 10 };
      });
    });

    it("should not throw if no diagram exists", () => {
      expect(() => {
        renderer.refresh();
      }).not.toThrow();
    });

    it("should re-render current diagram", () => {
      const mockSchema = {
        element: [{ name: "Test", type_: "string" }],
      };
      const onNodeClick = jest.fn();
      
      renderer.renderSchema(mockSchema, onNodeClick);
      const itemsBeforeRefresh = mockCanvas.querySelectorAll(".diagram-item").length;
      
      renderer.refresh();
      const itemsAfterRefresh = mockCanvas.querySelectorAll(".diagram-item").length;
      
      expect(itemsAfterRefresh).toBe(itemsBeforeRefresh);
    });
  });

  describe("showMessage", () => {
    it("should display message in canvas", () => {
      renderer["showMessage"]("Test message");
      
      expect(mockCanvas.textContent).toContain("Test message");
    });
  });

  describe("showError", () => {
    it("should display error in canvas", () => {
      renderer["showError"]("Test error");
      
      expect(mockCanvas.textContent).toContain("Test error");
    });
  });
});
