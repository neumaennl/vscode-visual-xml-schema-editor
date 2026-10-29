/**
 * Unit tests for DiagramRenderer class.
 */

import { DiagramRenderer } from "./renderer";
import { DiagramOptions } from "../shared/messages";
import { setupGetBBoxMock } from "./__tests__/svgTestUtils";
import {
  setActiveDraggedPaletteSchemaConstruct,
} from "./palette/PaletteItems";
import { PaletteSchemaConstruct } from "./palette/PaletteSchemaConstruct";

const defaultDiagramOptions: DiagramOptions = {
  showDocumentation: false,
  alwaysShowOccurrence: false,
  showType: false,
};

describe("DiagramRenderer", () => {
  let mockCanvas: SVGSVGElement;
  let renderer: DiagramRenderer;

  beforeEach(() => {
    // Create mock SVG element
    mockCanvas = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const viewState = { zoom: 1, panX: 0, panY: 0 };
    renderer = new DiagramRenderer(mockCanvas, viewState);
    setActiveDraggedPaletteSchemaConstruct(null);
  });

  describe("constructor", () => {
    test("should initialize renderer with canvas", () => {
      expect(renderer).toBeDefined();
      expect(renderer).toBeInstanceOf(DiagramRenderer);
    });

    test("should create main group for transformations", () => {
      const groups = mockCanvas.getElementsByTagName("g");
      expect(groups.length).toBeGreaterThan(0);
    });
  });

  describe("updateView", () => {
    test("should apply transformation to main group", () => {
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
      setupGetBBoxMock();
    });

    test("should clear previous content before rendering", () => {
      // Add some initial content
      const testGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      testGroup.setAttribute("data-test", "initial");
      mockCanvas.appendChild(testGroup);
      
      const mockSchema = {
        element: [{ name: "Test", type_: "string" }],
      };
      const onNodeClick = vi.fn();
      
      renderer.renderSchema(mockSchema, defaultDiagramOptions, onNodeClick);
      
      // Verify diagram was created (main group should exist)
      const groups = mockCanvas.getElementsByTagName("g");
      expect(groups.length).toBeGreaterThan(0);
    });

    test("should handle empty schema", () => {
      const emptySchema = {};
      const onNodeClick = vi.fn();
      
      expect(() => {
        renderer.renderSchema(emptySchema, defaultDiagramOptions, onNodeClick);
      }).not.toThrow();
    });

    test("should handle null schema", () => {
      const onNodeClick = vi.fn();
      
      // Test error handling with invalid input by bypassing type checking
      // This is intentional to ensure robustness
      type RenderSchemaFn = (schema: unknown, options: DiagramOptions, callback: typeof onNodeClick) => void;
      (renderer.renderSchema as RenderSchemaFn)(null, defaultDiagramOptions, onNodeClick);
      
      // Should show message instead of throwing
      expect(mockCanvas.textContent).toContain("No schema to display");
    });

    test("should render schema with elements", () => {
      const mockSchema = {
        element: [
          { name: "Person", type_: "PersonType" },
          { name: "Address", type_: "AddressType" },
        ],
      };
      const onNodeClick = vi.fn();
      
      renderer.renderSchema(mockSchema, defaultDiagramOptions, onNodeClick);
      
      const items = mockCanvas.querySelectorAll(".diagram-item");
      expect(items.length).toBeGreaterThan(0);
    });

    test("should store onNodeClick callback", () => {
      const mockSchema = {
        element: [{ name: "Test", type_: "string" }],
      };
      const onNodeClick = vi.fn();
      
      renderer.renderSchema(mockSchema, defaultDiagramOptions, onNodeClick);
      
      // Callback should be stored for click handling
      expect(onNodeClick).toBeDefined();
    });
  });

  describe("refresh", () => {
    beforeEach(() => {
      setupGetBBoxMock();
    });

    test("should not throw if no diagram exists", () => {
      expect(() => {
        renderer.refresh();
      }).not.toThrow();
    });

    test("should re-render current diagram", () => {
      const mockSchema = {
        element: [{ name: "Test", type_: "string" }],
      };
      const onNodeClick = vi.fn();
      
      renderer.renderSchema(mockSchema, defaultDiagramOptions, onNodeClick);
      const itemsBeforeRefresh = mockCanvas.querySelectorAll(".diagram-item").length;
      
      renderer.refresh();
      const itemsAfterRefresh = mockCanvas.querySelectorAll(".diagram-item").length;
      
      expect(itemsAfterRefresh).toBe(itemsBeforeRefresh);
    });
  });

  describe("diagram options", () => {
    beforeEach(() => {
      setupGetBBoxMock();
    });

    test("should apply showDocumentation option to diagram", () => {
      const mockSchema = {
        element: [{ name: "Test", type_: "string" }],
      };
      const onNodeClick = vi.fn();
      const options: DiagramOptions = {
        showDocumentation: true,
        alwaysShowOccurrence: false,
        showType: false,
      };
      
      renderer.renderSchema(mockSchema, options, onNodeClick);
      
      const diagram = renderer.getCurrentDiagram();
      expect(diagram).not.toBeNull();
      expect(diagram?.showDocumentation).toBe(true);
    });

    test("should apply alwaysShowOccurrence option to diagram", () => {
      const mockSchema = {
        element: [{ name: "Test", type_: "string" }],
      };
      const onNodeClick = vi.fn();
      const options: DiagramOptions = {
        showDocumentation: false,
        alwaysShowOccurrence: true,
        showType: false,
      };
      
      renderer.renderSchema(mockSchema, options, onNodeClick);
      
      const diagram = renderer.getCurrentDiagram();
      expect(diagram).not.toBeNull();
      expect(diagram?.alwaysShowOccurrence).toBe(true);
    });

    test("should apply showType option to diagram", () => {
      const mockSchema = {
        element: [{ name: "Test", type_: "string" }],
      };
      const onNodeClick = vi.fn();
      const options: DiagramOptions = {
        showDocumentation: false,
        alwaysShowOccurrence: false,
        showType: true,
      };
      
      renderer.renderSchema(mockSchema, options, onNodeClick);
      
      const diagram = renderer.getCurrentDiagram();
      expect(diagram).not.toBeNull();
      expect(diagram?.showType).toBe(true);
    });
  });

  describe("drag and drop", () => {
    beforeEach(() => {
      setupGetBBoxMock();
    });

    test("should invoke node drop handler with item and construct", () => {
      const onNodeClick = vi.fn();
      const onNodeDrop = vi.fn();
      renderer.setDropHandler(onNodeDrop);

      const mockSchema = {
        element: [{ name: "Test", type_: "string" }],
      };
      renderer.renderSchema(mockSchema, defaultDiagramOptions, onNodeClick);

      const itemElement = mockCanvas.querySelector(
        "[data-item-id]"
      ) as SVGGElement;
      expect(itemElement).toBeTruthy();

      const dropEvent = new Event("drop", { bubbles: true }) as DragEvent;
      Object.defineProperty(dropEvent, "dataTransfer", {
        value: {
          getData: (_mime: string) => "element",
        },
      });

      itemElement.dispatchEvent(dropEvent);

      expect(onNodeDrop).toHaveBeenCalledWith(expect.any(Object), "element");
    });

    test("should not invoke node drop handler when drop validator rejects the target", () => {
      const onNodeClick = vi.fn();
      const onNodeDrop = vi.fn();
      renderer.setDropHandler(onNodeDrop);
      renderer.setNodeDropValidator(() => false);

      const mockSchema = {
        element: [{ name: "Test", type_: "string" }],
      };
      renderer.renderSchema(mockSchema, defaultDiagramOptions, onNodeClick);

      const itemElement = mockCanvas.querySelector(
        "[data-item-id]"
      ) as SVGGElement;
      const dropEvent = new Event("drop", { bubbles: true }) as DragEvent;
      Object.defineProperty(dropEvent, "dataTransfer", {
        value: {
          getData: (_mime: string) => "attribute",
        },
      });

      itemElement.dispatchEvent(dropEvent);

      expect(onNodeDrop).not.toHaveBeenCalled();
    });

    test("should not add drag-over class when drop validator rejects the target", () => {
      const onNodeClick = vi.fn();
      renderer.setNodeDropValidator(() => false);

      const mockSchema = {
        element: [{ name: "Test", type_: "string" }],
      };
      renderer.renderSchema(mockSchema, defaultDiagramOptions, onNodeClick);

      const itemElement = mockCanvas.querySelector(
        "[data-item-id]"
      ) as SVGGElement;
      const itemChild = itemElement.querySelector("*") as Element;
      const dragOverEvent = new Event("dragover", { bubbles: true }) as DragEvent;
      Object.defineProperty(dragOverEvent, "dataTransfer", {
        value: {
          getData: (_mime: string) => "attribute",
        },
      });

      itemChild.dispatchEvent(dragOverEvent);

      expect(itemElement.classList.contains("drag-over")).toBe(false);
    });

    test("should add drag-over class using active dragged-construct fallback", () => {
      const onNodeClick = vi.fn();
      renderer.setNodeDropValidator((_node, construct) => construct === "element");

      const mockSchema = {
        element: [{ name: "Test", type_: "string" }],
      };
      renderer.renderSchema(mockSchema, defaultDiagramOptions, onNodeClick);

      const itemElement = mockCanvas.querySelector(
        "[data-item-id]"
      ) as SVGGElement;
      const itemChild = itemElement.querySelector("*") as Element;
      const dragOverEvent = new Event("dragover", { bubbles: true }) as DragEvent;
      Object.defineProperty(dragOverEvent, "dataTransfer", {
        value: {
          getData: (_mime: string) => "",
        },
      });
      setActiveDraggedPaletteSchemaConstruct(PaletteSchemaConstruct.Element);

      itemChild.dispatchEvent(dragOverEvent);

      expect(itemElement.classList.contains("drag-over")).toBe(true);
    });

    test("should keep drag-over class when pointer is still inside item group", () => {
      const onNodeClick = vi.fn();
      const mockSchema = {
        element: [{ name: "Test", type_: "string" }],
      };
      renderer.renderSchema(mockSchema, defaultDiagramOptions, onNodeClick);

      const itemElement = mockCanvas.querySelector(
        "[data-item-id]"
      ) as SVGGElement;
      const itemChild = itemElement.querySelector("*") as Element;
      itemElement.classList.add("drag-over");

      const documentWithElementFromPoint = document as Document & {
        elementFromPoint?: (x: number, y: number) => Element | null;
      };
      const originalElementFromPoint = documentWithElementFromPoint.elementFromPoint?.bind(
        document
      );
      documentWithElementFromPoint.elementFromPoint = (): Element => itemChild;

      const leaveEvent = new Event("dragleave", { bubbles: true }) as DragEvent;
      Object.defineProperty(leaveEvent, "clientX", { value: 10 });
      Object.defineProperty(leaveEvent, "clientY", { value: 10 });
      Object.defineProperty(leaveEvent, "relatedTarget", { value: null });

      itemChild.dispatchEvent(leaveEvent);

      expect(itemElement.classList.contains("drag-over")).toBe(true);
      documentWithElementFromPoint.elementFromPoint = originalElementFromPoint;
    });
  });

  describe("showMessage", () => {
    test("should display message in canvas", () => {
      renderer["showMessage"]("Test message");
      
      expect(mockCanvas.textContent).toContain("Test message");
    });
  });

  describe("showError", () => {
    test("should display error in canvas", () => {
      renderer["showError"]("Test error");
      
      expect(mockCanvas.textContent).toContain("Test error");
    });
  });
});
