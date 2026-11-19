/**
 * Unit tests of `DiagramCanvas`: drawing the diagram, messages, the selection, expanding nodes and the
 * view. The view and the drop handling have tests of their own.
 */

import { DiagramCanvas, type CanvasHandlers } from "./DiagramCanvas";
import type { DiagramOptions } from "../../shared/messages";
import { setupGetBBoxMock } from "../__tests__/svgTestHelpers";
import { SCHEMA_ROOT_ID } from "../../shared/idStrategy";
import { webviewSchemaWith } from "../../shared/__tests__/schemaTestHelpers";
import { DiagramLayout } from "../diagram";
import { setDraggedSchemaConstruct } from "../dragAndDrop/draggedSchemaConstruct";
import { DraggableSchemaConstruct } from "../dragAndDrop/DraggableSchemaConstruct";

const DEFAULT_DIAGRAM_OPTIONS: DiagramOptions = {
  showDocumentation: false,
  alwaysShowOccurrence: false,
  showType: false,
};

/** The ID of the element `person`, which has the children `name` and `age`. */
const PERSON_ID = "/element:person";

/** A schema with the element `person`, whose anonymous complex type holds `name` and `age`. */
const PERSON_SCHEMA = webviewSchemaWith(`<xs:element name="person"><xs:complexType><xs:sequence>
  <xs:element name="name" type="xs:string"/>
  <xs:element name="age" type="xs:int"/>
</xs:sequence></xs:complexType></xs:element>`);

/** Mocks of the handlers of the canvas. */
type HandlerMocks = { [K in keyof CanvasHandlers]: ReturnType<typeof vi.fn<CanvasHandlers[K]>> };

/**
 * Returns the IDs of the drawn nodes.
 *
 * @param svg - The canvas
 * @returns The IDs, in document order
 */
function drawnIds(svg: SVGSVGElement): string[] {
  return [...svg.querySelectorAll("[data-item-id]")].map((group) => group.getAttribute("data-item-id") ?? "");
}

/**
 * Returns the IDs of the selected nodes.
 *
 * @param svg - The canvas
 * @returns The IDs
 */
function selectedIds(svg: SVGSVGElement): string[] {
  return [...svg.querySelectorAll(".selected")].map((group) => group.getAttribute("data-item-id") ?? "");
}

/**
 * Clicks a node, or its expand button.
 *
 * @param svg - The canvas
 * @param itemId - The ID of the node
 * @param expandButton - Whether to click the expand button of the node
 */
function click(svg: SVGSVGElement, itemId: string, expandButton = false): void {
  const group = svg.querySelector(`[data-item-id="${itemId}"]`);
  const target = expandButton ? group?.querySelector(":scope > .expand-button > *") : group?.firstElementChild;
  target?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

/**
 * Draws the person schema and expands the schema root, which starts collapsed, so that `person` is drawn.
 *
 * @param canvas - The canvas
 * @param svg - The SVG element of the canvas
 */
function renderPerson(canvas: DiagramCanvas, svg: SVGSVGElement): void {
  canvas.render(PERSON_SCHEMA, DEFAULT_DIAGRAM_OPTIONS);
  click(svg, SCHEMA_ROOT_ID, true);
}

describe("DiagramCanvas", () => {
  let svg: SVGSVGElement;
  let handlers: HandlerMocks;
  let canvas: DiagramCanvas;

  beforeEach(() => {
    setupGetBBoxMock();
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    handlers = { select: vi.fn(), viewChanged: vi.fn(), failed: vi.fn(), dispatch: vi.fn() };
    canvas = new DiagramCanvas(svg, undefined, handlers);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("render", () => {
    test("should draw the nodes of the schema", () => {
      renderPerson(canvas, svg);

      expect(drawnIds(svg)).toContain(PERSON_ID);
      expect(canvas.getItem(PERSON_ID)?.name).toBe("person");
    });

    test.each(["showDocumentation", "alwaysShowOccurrence", "showType"] as const)(
      "should apply the option %s",
      (option) => {
        canvas.render(PERSON_SCHEMA, { ...DEFAULT_DIAGRAM_OPTIONS, [option]: true });

        expect(canvas.getItem(SCHEMA_ROOT_ID)?.diagram?.[option]).toBe(true);
      }
    );

    test("should keep the nodes that were expanded or collapsed", () => {
      renderPerson(canvas, svg);
      const expanded = canvas.getItem(PERSON_ID)!.showChildElements;
      click(svg, PERSON_ID, true);

      canvas.render(PERSON_SCHEMA, DEFAULT_DIAGRAM_OPTIONS);

      expect(canvas.getItem(PERSON_ID)?.showChildElements).toBe(!expanded);
    });

    test("should center the diagram on the first render if no view state was saved", () => {
      canvas.render(PERSON_SCHEMA, DEFAULT_DIAGRAM_OPTIONS);
      canvas.render(PERSON_SCHEMA, DEFAULT_DIAGRAM_OPTIONS);

      expect(handlers.viewChanged).toHaveBeenCalledTimes(1);
    });

    test("should keep a saved view state", () => {
      const saved = { zoom: 2, panX: 30, panY: 40 };
      const restored = new DiagramCanvas(svg, saved, handlers);

      restored.render(PERSON_SCHEMA, DEFAULT_DIAGRAM_OPTIONS);

      expect(restored.viewState).toEqual(saved);
      expect(handlers.viewChanged).not.toHaveBeenCalled();
    });

    test("should throw when drawing fails and leave no error text on the canvas", () => {
      vi.spyOn(DiagramLayout.prototype, "layout").mockImplementationOnce(() => {
        throw new Error("Layout failed");
      });

      expect(() => {
        canvas.render(PERSON_SCHEMA, DEFAULT_DIAGRAM_OPTIONS);
      }).toThrow("Layout failed");
      canvas.render(PERSON_SCHEMA, DEFAULT_DIAGRAM_OPTIONS);

      expect(svg.textContent).not.toContain("Error");
    });
  });

  describe("selection", () => {
    test("should select a clicked node and report it", () => {
      renderPerson(canvas, svg);

      click(svg, PERSON_ID);

      expect(selectedIds(svg)).toEqual([PERSON_ID]);
      expect(handlers.select).toHaveBeenCalledWith(canvas.getItem(PERSON_ID));
    });

    test.each([
      [
        "the diagram is drawn again",
        (c: DiagramCanvas): void => {
          c.render(PERSON_SCHEMA, DEFAULT_DIAGRAM_OPTIONS);
        },
      ],
      [
        "a node is expanded or collapsed",
        (_c: DiagramCanvas): void => {
          click(svg, PERSON_ID, true);
        },
      ],
    ])("should keep the selection when %s", (_case, change) => {
      renderPerson(canvas, svg);
      canvas.select(PERSON_ID);

      change(canvas);

      expect(selectedIds(svg)).toEqual([PERSON_ID]);
    });

    test("should clear the selection", () => {
      renderPerson(canvas, svg);
      canvas.select(PERSON_ID);

      canvas.select(null);

      expect(selectedIds(svg)).toEqual([]);
    });
  });

  describe("expand button", () => {
    test("should expand or collapse the node and draw it again, without selecting it", () => {
      renderPerson(canvas, svg);
      const expanded = canvas.getItem(PERSON_ID)!.showChildElements;

      click(svg, PERSON_ID, true);

      expect(canvas.getItem(PERSON_ID)?.showChildElements).toBe(!expanded);
      expect(drawnIds(svg).some((id) => id.startsWith(`${PERSON_ID}/`))).toBe(!expanded);
      expect(handlers.select).not.toHaveBeenCalled();
    });

    test("should report a failure to draw the diagram again", () => {
      renderPerson(canvas, svg);
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      const item = canvas.getItem(PERSON_ID)!;
      Object.defineProperty(item, "childElements", {
        get: () => {
          throw new Error("broken");
        },
      });

      click(svg, PERSON_ID, true);

      expect(handlers.failed).toHaveBeenCalledWith("Failed to refresh diagram: broken");
    });
  });

  describe("drops", () => {
    /**
     * Drops a schema construct on a node.
     *
     * @param itemId - The ID of the node
     * @param schemaConstruct - The dropped schema construct
     */
    function drop(itemId: string, schemaConstruct: DraggableSchemaConstruct): void {
      setDraggedSchemaConstruct(schemaConstruct);
      const event = new Event("drop", { bubbles: true, cancelable: true });
      svg.querySelector(`[data-item-id="${itemId}"]`)?.firstElementChild?.dispatchEvent(event);
      setDraggedSchemaConstruct(null);
    }

    test("should turn a drop into a command with the drop rules and dispatch it", () => {
      renderPerson(canvas, svg);

      drop(SCHEMA_ROOT_ID, DraggableSchemaConstruct.Element);

      expect(handlers.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "addElement" }));
    });

    test("should ignore a schema construct that the node does not accept", () => {
      renderPerson(canvas, svg);

      drop(SCHEMA_ROOT_ID, DraggableSchemaConstruct.Enumeration);

      expect(handlers.dispatch).not.toHaveBeenCalled();
      expect(handlers.failed).not.toHaveBeenCalled();
    });
  });

  describe("view", () => {
    test.each(["zoomIn", "zoomOut", "fit"] as const)("should not %s without a diagram", (action) => {
      canvas.changeView(action);

      expect(handlers.viewChanged).not.toHaveBeenCalled();
    });

    test("should zoom when a diagram is drawn and report the new view", () => {
      canvas.render(PERSON_SCHEMA, DEFAULT_DIAGRAM_OPTIONS);
      handlers.viewChanged.mockClear();

      canvas.changeView("zoomIn");

      expect(handlers.viewChanged).toHaveBeenCalledWith(canvas.viewState);
      expect(canvas.viewState.zoom).toBeCloseTo(1.2);
    });
  });
});
