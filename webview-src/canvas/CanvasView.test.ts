/**
 * Unit tests of `CanvasView`: the zoom and pan, the toolbar actions and the mouse interaction.
 */

import { CanvasView, type ViewState } from "./CanvasView";

/** The size of the canvas in the tests. */
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

/** A saved view state. */
const SAVED: ViewState = { zoom: 2, panX: 30, panY: 40 };

/**
 * Creates an SVG canvas of 800 × 600 pixels, which jsdom does not lay out, with a group.
 *
 * @returns The canvas and the group
 */
function createCanvas(): { svg: SVGSVGElement; group: SVGGElement } {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  Object.defineProperty(svg, "clientWidth", { value: CANVAS_WIDTH });
  Object.defineProperty(svg, "clientHeight", { value: CANVAS_HEIGHT });
  svg.getBoundingClientRect = (): DOMRect => ({ left: 0, top: 0 }) as DOMRect;
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  svg.appendChild(group);
  return { svg, group };
}

/**
 * Sends a mouse event to an element.
 *
 * @param target - The element
 * @param type - The type of the event, such as `mousedown`
 * @param init - The button and position of the mouse
 */
function mouse(target: Element, type: string, init: MouseEventInit): void {
  target.dispatchEvent(new MouseEvent(type, { bubbles: true, ...init }));
}

describe("CanvasView", () => {
  let svg: SVGSVGElement;
  let group: SVGGElement;
  let onChange: ReturnType<typeof vi.fn<(viewState: ViewState) => void>>;

  beforeEach(() => {
    ({ svg, group } = createCanvas());
    onChange = vi.fn<(viewState: ViewState) => void>();
  });

  /**
   * Checks that a view still has the saved view state and has not reported a change.
   *
   * @param view - The view
   */
  function expectSavedViewKept(view: CanvasView): void {
    expect(view.viewState).toEqual(SAVED);
    expect(onChange).not.toHaveBeenCalled();
  }

  test("should apply a saved view state when it is created, without reporting it", () => {
    const view = new CanvasView(svg, group, SAVED, onChange);

    expect(group.getAttribute("transform")).toBe("translate(30, 40) scale(2)");
    expectSavedViewKept(view);
  });

  describe("centerIfNotPositioned", () => {
    test("should center the diagram once if no view state was saved", () => {
      const view = new CanvasView(svg, group, undefined, onChange);

      view.centerIfNotPositioned();
      view.centerIfNotPositioned();

      expect(view.viewState).toEqual({ zoom: 1, panX: 300, panY: 200 });
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    test("should keep a saved view state", () => {
      const view = new CanvasView(svg, group, SAVED, onChange);

      view.centerIfNotPositioned();

      expectSavedViewKept(view);
    });
  });

  test.each([
    ["zoomIn", 1.2],
    ["zoomOut", 0.8],
  ] as const)("should %s around the center of the canvas and report it", (action, factor) => {
    const view = new CanvasView(svg, group, { zoom: 1, panX: 0, panY: 0 }, onChange);

    view[action]();

    // The center (400, 300) stays where it is
    expect(view.viewState).toEqual({ zoom: factor, panX: 400 - 400 * factor, panY: 300 - 300 * factor });
    expect(onChange).toHaveBeenCalledWith(view.viewState);
  });

  test("should fit the diagram into the canvas with a padding", () => {
    group.getBBox = (): DOMRect => ({ x: 0, y: 0, width: 352, height: 152 }) as DOMRect;
    const view = new CanvasView(svg, group, SAVED, onChange);

    view.fit();

    // 352 + 2 × 24 = 400 wide, 152 + 2 × 24 = 200 high: the zoom is 2, and the center (176, 76) goes to (400, 300)
    expect(view.viewState).toEqual({ zoom: 2, panX: 48, panY: 148 });
    expect(onChange).toHaveBeenCalledWith(view.viewState);
  });

  test("should not change the view when the diagram has no size", () => {
    group.getBBox = (): DOMRect => ({ x: 0, y: 0, width: 0, height: 0 }) as DOMRect;
    const view = new CanvasView(svg, group, SAVED, onChange);

    view.fit();

    expectSavedViewKept(view);
  });

  test("should pan with the left button on the background and report the new view when the button is released", () => {
    const view = new CanvasView(svg, group, { zoom: 1, panX: 0, panY: 0 }, onChange);

    mouse(svg, "mousedown", { button: 0, clientX: 10, clientY: 10 });
    mouse(svg, "mousemove", { clientX: 60, clientY: 30 });

    expect(group.getAttribute("transform")).toBe("translate(50, 20) scale(1)");
    expect(onChange).not.toHaveBeenCalled();

    mouse(svg, "mouseup", {});

    expect(view.viewState).toEqual({ zoom: 1, panX: 50, panY: 20 });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  test("should not pan with the left button on a node without Ctrl", () => {
    const view = new CanvasView(svg, group, { zoom: 1, panX: 0, panY: 0 }, onChange);

    mouse(group, "mousedown", { button: 0, clientX: 10, clientY: 10 });
    mouse(svg, "mousemove", { clientX: 60, clientY: 30 });
    mouse(svg, "mouseup", {});

    expect(view.viewState).toEqual({ zoom: 1, panX: 0, panY: 0 });
    expect(onChange).not.toHaveBeenCalled();
  });

  test("should zoom with the wheel around the point under the mouse", () => {
    const view = new CanvasView(svg, group, { zoom: 1, panX: 0, panY: 0 }, onChange);

    svg.dispatchEvent(new WheelEvent("wheel", { deltaY: -1, clientX: 100, clientY: 50, cancelable: true }));

    expect(view.viewState).toEqual({ zoom: 1.1, panX: 100 - 100 * 1.1, panY: 50 - 50 * 1.1 });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
