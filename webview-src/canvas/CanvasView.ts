/**
 * The view of the canvas: its zoom and pan, kept in one place, and the mouse interaction and toolbar
 * actions that change them.
 */

/** The zoom and pan of the canvas. */
export interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
}

/** The zoom factor of the zoom buttons. */
const BUTTON_ZOOM_IN = 1.2;
const BUTTON_ZOOM_OUT = 0.8;

/** The zoom factor of one step of the mouse wheel. */
const WHEEL_ZOOM_IN = 1.1;
const WHEEL_ZOOM_OUT = 0.9;

/** The padding around the diagram when it is fitted into the canvas, in screen pixels. */
const FIT_PADDING = 24;

/** How far from the center of the canvas the diagram starts when it is centred, in screen pixels. */
const CENTER_OFFSET = 100;

/**
 * Holds the zoom and pan of the canvas and applies them to the group that holds the diagram. Changes by
 * the user are reported with `onChange`, so that the app can save them.
 */
export class CanvasView {
  private state: ViewState;
  private positioned: boolean;

  /**
   * Creates the view and starts handling panning and zooming with the mouse.
   *
   * @param svg - The SVG canvas
   * @param group - The group that holds the diagram, which the view transforms
   * @param saved - The saved view state, or undefined to center the diagram when it is first drawn
   * @param onChange - Called with the new view state after the user changed it
   */
  constructor(
    private readonly svg: SVGSVGElement,
    private readonly group: SVGGElement,
    saved: ViewState | undefined,
    private readonly onChange: (viewState: ViewState) => void
  ) {
    this.state = saved ? { ...saved } : { zoom: 1, panX: 0, panY: 0 };
    this.positioned = saved !== undefined;
    this.apply();
    this.setUpPanning();
    this.setUpWheelZoom();
  }

  /**
   * Returns the current view state.
   *
   * @returns A copy of the zoom and pan
   */
  public get viewState(): ViewState {
    return { ...this.state };
  }

  /**
   * Centers the diagram the first time it is drawn, unless a saved view state was given.
   */
  public centerIfNotPositioned(): void {
    if (this.positioned) {
      return;
    }
    this.positioned = true;
    this.state.panX = this.svg.clientWidth / 2 - CENTER_OFFSET;
    this.state.panY = this.svg.clientHeight / 2 - CENTER_OFFSET;
    this.changed();
  }

  /** Zooms in towards the center of the canvas. */
  public zoomIn(): void {
    this.zoomAt(this.svg.clientWidth / 2, this.svg.clientHeight / 2, BUTTON_ZOOM_IN);
  }

  /** Zooms out from the center of the canvas. */
  public zoomOut(): void {
    this.zoomAt(this.svg.clientWidth / 2, this.svg.clientHeight / 2, BUTTON_ZOOM_OUT);
  }

  /**
   * Fits the drawn diagram into the canvas, with a padding on all sides. Nothing changes if the canvas
   * or the diagram has no size.
   */
  public fit(): void {
    const bbox = this.group.getBBox();
    const canvasWidth = this.svg.clientWidth || this.svg.viewBox.baseVal.width || 0;
    const canvasHeight = this.svg.clientHeight || this.svg.viewBox.baseVal.height || 0;
    if (canvasWidth === 0 || canvasHeight === 0 || bbox.width === 0 || bbox.height === 0) {
      return;
    }

    const zoom = Math.min(canvasWidth / (bbox.width + FIT_PADDING * 2), canvasHeight / (bbox.height + FIT_PADDING * 2));
    // The center of the diagram goes to the center of the canvas
    this.state = {
      zoom,
      panX: canvasWidth / 2 - (bbox.x + bbox.width / 2) * zoom,
      panY: canvasHeight / 2 - (bbox.y + bbox.height / 2) * zoom,
    };
    this.positioned = true;
    this.changed();
  }

  /** Applies the zoom and pan to the group of the diagram. */
  public apply(): void {
    // Scale first, then translate, so that the pan is in screen pixels whatever the zoom
    this.group.setAttribute("transform", `translate(${this.state.panX}, ${this.state.panY}) scale(${this.state.zoom})`);
  }

  /**
   * Zooms the view and keeps a point of the canvas in the same position.
   *
   * @param canvasX - The x coordinate of the point, relative to the canvas
   * @param canvasY - The y coordinate of the point, relative to the canvas
   * @param factor - The zoom factor, such as 1.2 to zoom in
   */
  private zoomAt(canvasX: number, canvasY: number, factor: number): void {
    // The point in diagram space before the zoom
    const pointX = (canvasX - this.state.panX) / this.state.zoom;
    const pointY = (canvasY - this.state.panY) / this.state.zoom;

    this.state.zoom *= factor;
    this.state.panX = canvasX - pointX * this.state.zoom;
    this.state.panY = canvasY - pointY * this.state.zoom;
    this.positioned = true;
    this.changed();
  }

  /** Applies the view state and reports it. */
  private changed(): void {
    this.apply();
    this.onChange(this.viewState);
  }

  /**
   * Pans with the middle button, with the left button and Ctrl, or with the left button on the
   * background of the canvas.
   */
  private setUpPanning(): void {
    let panning = false;
    let moved = false;
    let startX = 0;
    let startY = 0;

    this.svg.addEventListener("mousedown", (event: MouseEvent) => {
      const onBackground = event.target === this.svg;
      if (event.button === 1 || (event.button === 0 && (event.ctrlKey || onBackground))) {
        panning = true;
        moved = false;
        startX = event.clientX - this.state.panX;
        startY = event.clientY - this.state.panY;
        event.preventDefault();
        this.svg.style.cursor = "grabbing";
      }
    });

    this.svg.addEventListener("mousemove", (event: MouseEvent) => {
      if (panning) {
        moved = true;
        this.state.panX = event.clientX - startX;
        this.state.panY = event.clientY - startY;
        this.apply();
      }
    });

    this.svg.addEventListener("mouseup", (event: MouseEvent) => {
      if (!panning) {
        return;
      }
      panning = false;
      this.svg.style.cursor = "grab";
      if (moved) {
        this.positioned = true;
        this.onChange(this.viewState);
        // A pan is no click
        event.stopPropagation();
      }
    });
  }

  /** Zooms with the mouse wheel, keeping the point under the mouse in place. */
  private setUpWheelZoom(): void {
    this.svg.addEventListener("wheel", (event: WheelEvent) => {
      event.preventDefault();
      const rect = this.svg.getBoundingClientRect();
      this.zoomAt(
        event.clientX - rect.left,
        event.clientY - rect.top,
        event.deltaY > 0 ? WHEEL_ZOOM_OUT : WHEEL_ZOOM_IN
      );
    });
  }
}
