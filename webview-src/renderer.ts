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
  private onNodeClickCallback: ((node: DiagramItem) => void) | null = null;

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
    this.svgRenderer = new DiagramSvgRenderer(this.canvas);
    this.layout = new DiagramLayout();

    // Setup click handling
    this.setupClickHandling();
  }

  public renderSchema(
    schemaObj: schema,
    onNodeClick: (node: any) => void
  ): void {
    this.onNodeClickCallback = onNodeClick;
    this.renderedNodes.clear();

    if (!schemaObj) {
      this.showMessage("No schema to display");
      return;
    }

    try {
      // Build diagram from schema
      const builder = new DiagramBuilder();
      this.currentDiagram = builder.buildFromSchema(schemaObj);

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

  private setupClickHandling(): void {
    this.canvas.addEventListener("click", (e: MouseEvent) => {
      const target = e.target as SVGElement;

      // Check if clicked on expand button
      if (target.classList.contains("expand-button")) {
        const itemGroup = target.closest("[data-item-id]") as SVGElement;
        if (itemGroup) {
          const itemId = itemGroup.getAttribute("data-item-id");
          this.toggleExpand(itemId);
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
          this.onNodeClickCallback(item);
        }
      }
    });
  }

  private toggleExpand(itemId: string | null): void {
    if (!itemId || !this.currentDiagram) return;

    const item = this.findItemById(itemId);
    if (!item) return;

    // Toggle expansion
    item.showChildElements = !item.showChildElements;

    // Recalculate layout
    this.layout.relayoutItem(item);

    // Re-render
    this.svgRenderer.render(this.currentDiagram);
    this.updateView(this.viewState);
  }

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

  public updateView(viewState: ViewState): void {
    this.viewState = viewState;
    this.mainGroup.setAttribute(
      "transform",
      `translate(${viewState.panX}, ${viewState.panY}) scale(${viewState.zoom})`
    );
  }

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
