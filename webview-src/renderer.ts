import { schema } from "../shared/types";
import { ViewState, RenderedNode } from "./webviewTypes";
import {
  DiagramBuilder,
  DiagramLayout,
  DiagramSvgRenderer,
  Diagram,
  DiagramItem,
} from "./diagram";

export class DiagramRenderer {
  private canvas: SVGSVGElement;
  private mainGroup: SVGGElement;
  private viewState: ViewState;
  private renderedNodes: Map<string, RenderedNode> = new Map();
  private currentDiagram: Diagram | null = null;
  private svgRenderer: DiagramSvgRenderer;
  private layout: DiagramLayout;
  private onNodeClickCallback:
    | ((node: DiagramItem, isExpandButton: boolean) => void)
    | null = null;

  /**
   * Create a new DiagramRenderer
   * @param canvas - The SVG canvas element to render into
   * @param viewState - Initial view state (zoom and pan)
   */
  constructor(canvas: SVGSVGElement, viewState: ViewState) {
    this.canvas = canvas;
    this.viewState = viewState;

    // Create main group for transformations
    this.mainGroup = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g"
    );
    this.canvas.appendChild(this.mainGroup);
    this.updateView(viewState);

    // Initialize diagram rendering components
    this.svgRenderer = new DiagramSvgRenderer(this.canvas, this.mainGroup);
    this.layout = new DiagramLayout();

    // Setup click handling
    this.setupClickHandling();
  }

  /**
   * Render a schema object to the canvas
   * @param schemaObj - The schema to render
   * @param onNodeClick - Callback function for node click events
   */
  public renderSchema(
    schemaObj: schema,
    onNodeClick: (node: DiagramItem, isExpandButton: boolean) => void
  ): void {
    this.onNodeClickCallback = onNodeClick;
    this.renderedNodes.clear();

    if (!schemaObj) {
      this.showMessage("No schema to display");
      return;
    }

    try {
      // Save expand state before rebuilding
      const expandState = this.saveExpandState();

      // Build diagram from schema
      const builder = new DiagramBuilder();
      this.currentDiagram = builder.buildFromSchema(schemaObj);

      // Restore expand state
      this.restoreExpandState(expandState);

      // Calculate layout
      this.layout.layout(this.currentDiagram);

      // Render to SVG
      this.svgRenderer.render(this.currentDiagram);

      // Apply view transformations
      this.updateView(this.viewState);
    } catch (error) {
      this.showError(`Failed to render schema: ${(error as Error).message}`);
      console.error("Schema rendering error:", error);
    }
  }

  /**
   * Refresh the current diagram by re-calculating layout and re-rendering
   * without rebuilding from schema
   */
  public refresh(): void {
    if (!this.currentDiagram) return;

    try {
      // Recalculate layout
      this.layout.layout(this.currentDiagram);

      // Re-render to SVG
      this.svgRenderer.render(this.currentDiagram);

      // Apply view transformations
      this.updateView(this.viewState);
    } catch (error) {
      this.showError(`Failed to refresh diagram: ${(error as Error).message}`);
      console.error("Diagram refresh error:", error);
    }
  }

  /**
   * Set up click event handlers for diagram items and expand buttons
   */
  private setupClickHandling(): void {
    this.canvas.addEventListener("click", (e: MouseEvent) => {
      const target = e.target as SVGElement;

      // Check if clicked on expand button (or inside expand button group)
      const expandButton = target.closest(".expand-button") as SVGElement;
      if (expandButton) {
        const itemGroup = expandButton.closest("[data-item-id]") as SVGElement;
        if (itemGroup) {
          const itemId = itemGroup.getAttribute("data-item-id");
          const item = this.findItemById(itemId);
          if (item && this.onNodeClickCallback) {
            this.onNodeClickCallback(item, true);
          }
        }
        e.stopPropagation();
        return;
      }

      // Check if clicked on diagram item
      const itemGroup = target.closest("[data-item-id]") as SVGElement;
      if (itemGroup) {
        const itemId = itemGroup.getAttribute("data-item-id");
        const item = this.findItemById(itemId);
        if (item && this.onNodeClickCallback) {
          this.onNodeClickCallback(item, false);
        }
      }
    });
  }

  /**
   * Find a diagram item by its ID
   * @param itemId - ID of the item to find
   * @returns The diagram item or null if not found
   */
  private findItemById(itemId: string | null): DiagramItem | null {
    if (!itemId || !this.currentDiagram) return null;

    const searchInItem = (item: DiagramItem): DiagramItem | null => {
      if (item.id === itemId) return item;

      for (const child of item.childElements) {
        const found = searchInItem(child);
        if (found) return found;
      }

      return null;
    };

    for (const root of this.currentDiagram.rootElements) {
      const found = searchInItem(root);
      if (found) return found;
    }

    return null;
  }

  /**
   * Save the expand/collapse state of all items in the diagram
   * @returns A map of item IDs to their expand state
   */
  private saveExpandState(): Map<string, boolean> {
    const state = new Map<string, boolean>();
    if (!this.currentDiagram) return state;

    const saveItemState = (item: DiagramItem): void => {
      state.set(item.id, item.showChildElements);
      for (const child of item.childElements) {
        saveItemState(child);
      }
    };

    for (const root of this.currentDiagram.rootElements) {
      saveItemState(root);
    }

    return state;
  }

  /**
   * Restore the expand/collapse state of all items in the diagram
   * @param state - Map of item IDs to their expand state
   */
  private restoreExpandState(state: Map<string, boolean>): void {
    if (!this.currentDiagram) return;

    const restoreItemState = (item: DiagramItem): void => {
      if (state.has(item.id)) {
        const savedState = state.get(item.id);
        item.showChildElements = savedState ?? item.showChildElements;
      }
      for (const child of item.childElements) {
        restoreItemState(child);
      }
    };

    for (const root of this.currentDiagram.rootElements) {
      restoreItemState(root);
    }
  }

  /**
   * Create an SVG text element
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param content - Text content
   * @param className - CSS class name
   * @returns The created SVG text element
   */
  private createText(
    x: number,
    y: number,
    content: string,
    className: string
  ): SVGTextElement {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x.toString());
    text.setAttribute("y", y.toString());
    text.textContent = content;
    text.classList.add(className);
    return text;
  }

  /**
   * Update the view transformation (zoom and pan)
   * @param viewState - New view state to apply
   */
  public updateView(viewState: ViewState): void {
    this.viewState = viewState;
    // Apply scale first, then translate (order matters in SVG transforms)
    // This way pan values work in screen space regardless of zoom
    this.mainGroup.setAttribute(
      "transform",
      `translate(${viewState.panX}, ${viewState.panY}) scale(${viewState.zoom})`
    );
  }

  /**
   * Fit the rendered diagram content into the canvas viewport
   * keeping a small padding around all sides.
   * @param padding - Padding in screen pixels
   */
  public fitToCanvas(padding: number = 24): ViewState {
    // Ensure there is content
    if (!this.canvas || !this.mainGroup) {
      return this.viewState;
    }

    const bbox = this.mainGroup.getBBox();
    const canvasWidth =
      this.canvas.clientWidth || this.canvas.viewBox.baseVal.width || 0;
    const canvasHeight =
      this.canvas.clientHeight || this.canvas.viewBox.baseVal.height || 0;

    if (
      canvasWidth === 0 ||
      canvasHeight === 0 ||
      bbox.width === 0 ||
      bbox.height === 0
    ) {
      return this.viewState;
    }

    // Add padding around the content box
    const paddedWidth = bbox.width + padding * 2;
    const paddedHeight = bbox.height + padding * 2;

    // Compute scale to fit both width and height
    const scaleX = canvasWidth / paddedWidth;
    const scaleY = canvasHeight / paddedHeight;
    const scale = Math.min(scaleX, scaleY);

    // Target center of content in diagram space
    const contentCenterX = bbox.x + bbox.width / 2;
    const contentCenterY = bbox.y + bbox.height / 2;

    // Canvas center in screen space
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    // Compute pan so that content center maps to canvas center
    const panX = centerX - contentCenterX * scale;
    const panY = centerY - contentCenterY * scale;

    const newView: ViewState = { zoom: scale, panX, panY };
    this.updateView(newView);
    return newView;
  }

  /**
   * Select a specific node in the diagram
   * @param nodeId - ID of the node to select
   */
  public selectNode(nodeId: string): void {
    // Remove selection from all nodes
    this.canvas.querySelectorAll(".diagram-item").forEach((el) => {
      el.classList.remove("selected");
    });

    // Add selection to specified node
    const nodeElement = this.canvas.querySelector(`[data-item-id="${nodeId}"]`);
    if (nodeElement) {
      nodeElement.classList.add("selected");
    }
  }

  /**
   * Display an error message on the canvas
   * @param message - Error message to display
   */
  public showError(message: string): void {
    // Clear canvas and show error
    this.canvas.innerHTML = "";
    this.mainGroup = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g"
    );
    this.canvas.appendChild(this.mainGroup);

    const text = this.createText(50, 50, `Error: ${message}`, "error-message");
    this.mainGroup.appendChild(text);
  }

  /**
   * Display an informational message on the canvas
   * @param message - Message to display
   */
  public showMessage(message: string): void {
    // Clear canvas and show message
    this.canvas.innerHTML = "";
    this.mainGroup = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g"
    );
    this.canvas.appendChild(this.mainGroup);

    const text = this.createText(50, 50, message, "info-message");
    this.mainGroup.appendChild(text);
  }
}
