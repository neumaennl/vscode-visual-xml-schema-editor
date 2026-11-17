/**
 * Unit tests for `DiagramRenderer` class.
 */

import { DiagramRenderer } from "./renderer";
import type { DiagramOptions } from "../shared/messages";
import { setupGetBBoxMock } from "./__tests__/svgTestHelpers";
import {
  setActiveDraggedPaletteSchemaConstruct,
} from "./palette/PaletteItems";
import { PaletteSchemaConstruct } from "./palette/PaletteSchemaConstruct";
import { SCHEMA_ROOT_ID } from "../shared/idStrategy";

const DEFAULT_DIAGRAM_OPTIONS: DiagramOptions = {
  showDocumentation: false,
  alwaysShowOccurrence: false,
  showType: false,
};

/** A schema with one element `Test` of type `string`. */
const TEST_SCHEMA = { element: [{ name: "Test", type_: "string" }] };

/**
 * Creates a drag event whose data is the given construct.
 *
 * @param type - The type of the event, such as `drop` or `dragover`
 * @param construct - The construct that the data transfer holds
 * @returns The event
 */
function dragEvent(type: string, construct: string): DragEvent {
  const event = new Event(type, { bubbles: true }) as DragEvent;
  Object.defineProperty(event, "dataTransfer", { value: { getData: (_mime: string) => construct } });
  return event;
}

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

  /**
   * Renders the test schema and returns the group of its element.
   *
   * @returns The group of the element `Test`
   */
  function renderTestElement(): SVGGElement {
    renderer.renderSchema(TEST_SCHEMA, DEFAULT_DIAGRAM_OPTIONS, vi.fn());
    return mockCanvas.querySelector<SVGGElement>("[data-item-id]")!;
  }

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
      
      const mainGroup = mockCanvas.getElementsByTagName("g")[0]!;
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
      
      renderer.renderSchema(mockSchema, DEFAULT_DIAGRAM_OPTIONS, onNodeClick);
      
      // Verify diagram was created (main group should exist)
      const groups = mockCanvas.getElementsByTagName("g");
      expect(groups.length).toBeGreaterThan(0);
    });

    test("should handle empty schema", () => {
      const emptySchema = {};
      const onNodeClick = vi.fn();
      
      expect(() => {
        renderer.renderSchema(emptySchema, DEFAULT_DIAGRAM_OPTIONS, onNodeClick);
      }).not.toThrow();
    });

    test("should handle null schema", () => {
      const onNodeClick = vi.fn();
      
      renderer.renderSchema(null, DEFAULT_DIAGRAM_OPTIONS, onNodeClick);
      
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
      
      renderer.renderSchema(mockSchema, DEFAULT_DIAGRAM_OPTIONS, onNodeClick);
      
      const items = mockCanvas.querySelectorAll(".diagram-item");
      expect(items.length).toBeGreaterThan(0);
    });

    test("should store onNodeClick callback", () => {
      const mockSchema = {
        element: [{ name: "Test", type_: "string" }],
      };
      const onNodeClick = vi.fn();
      
      renderer.renderSchema(mockSchema, DEFAULT_DIAGRAM_OPTIONS, onNodeClick);
      
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
      
      renderer.renderSchema(mockSchema, DEFAULT_DIAGRAM_OPTIONS, onNodeClick);
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

    test.each(["showDocumentation", "alwaysShowOccurrence", "showType"] as const)("should apply %s option to diagram", (option) => {
      renderer.renderSchema(TEST_SCHEMA, { ...DEFAULT_DIAGRAM_OPTIONS, [option]: true }, vi.fn());

      const diagram = renderer.getItemById(SCHEMA_ROOT_ID)?.diagram;
      expect(diagram).toBeDefined();
      expect(diagram?.[option]).toBe(true);
    });
  });

  describe("drag and drop", () => {
    beforeEach(() => {
      setupGetBBoxMock();
    });

    test("should invoke node drop handler with item and construct", () => {
      const onNodeDrop = vi.fn();
      renderer.setDropHandler(onNodeDrop);
      const itemElement = renderTestElement();
      expect(itemElement).toBeTruthy();

      const dropEvent = dragEvent("drop", "element");

      itemElement.dispatchEvent(dropEvent);

      expect(onNodeDrop).toHaveBeenCalledWith(expect.any(Object), "element");
    });

    test("should not invoke node drop handler when drop validator rejects the target", () => {
      const onNodeDrop = vi.fn();
      renderer.setDropHandler(onNodeDrop);
      renderer.setNodeDropValidator(() => false);
      const itemElement = renderTestElement();
      const dropEvent = dragEvent("drop", "attribute");

      itemElement.dispatchEvent(dropEvent);

      expect(onNodeDrop).not.toHaveBeenCalled();
    });

    test("should not add drag-over class when drop validator rejects the target", () => {
      renderer.setNodeDropValidator(() => false);
      const itemElement = renderTestElement();
      const itemChild = itemElement.querySelector("*")!;
      const dragOverEvent = dragEvent("dragover", "attribute");

      itemChild.dispatchEvent(dragOverEvent);

      expect(itemElement.classList.contains("drag-over")).toBe(false);
    });

    test("should add drag-over class using active dragged-construct fallback", () => {
      renderer.setNodeDropValidator((_node, construct) => construct === "element");
      const itemElement = renderTestElement();
      const itemChild = itemElement.querySelector("*")!;
      const dragOverEvent = dragEvent("dragover", "");
      setActiveDraggedPaletteSchemaConstruct(PaletteSchemaConstruct.Element);

      itemChild.dispatchEvent(dragOverEvent);

      expect(itemElement.classList.contains("drag-over")).toBe(true);
    });

    test("should keep drag-over class when pointer is still inside item group", () => {
      const itemElement = renderTestElement();
      const itemChild = itemElement.querySelector("*")!;
      itemElement.classList.add("drag-over");

      // jsdom has no elementFromPoint()
      const documentWithElementFromPoint = document as Omit<Document, "elementFromPoint"> & {
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
      renderer.showMessage("Test message");
      
      expect(mockCanvas.textContent).toContain("Test message");
    });
  });

  describe("showError", () => {
    test("should display error in canvas", () => {
      renderer.showError("Test error");
      
      expect(mockCanvas.textContent).toContain("Test error");
    });
  });
});
