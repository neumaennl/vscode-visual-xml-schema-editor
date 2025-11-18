import { schema } from "../shared/types";
import { ViewState, RenderedNode } from "./webviewTypes";

export class DiagramRenderer {
  private canvas: SVGSVGElement;
  private mainGroup: SVGGElement;
  private viewState: ViewState;
  private renderedNodes: Map<string, RenderedNode> = new Map();
  private readonly NODE_WIDTH = 200;
  private readonly NODE_HEIGHT = 80;
  private readonly HORIZONTAL_SPACING = 250;
  private readonly VERTICAL_SPACING = 120;

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
  }

  public renderSchema(
    schemaObj: schema,
    onNodeClick: (node: any) => void
  ): void {
    // Clear existing content
    this.mainGroup.innerHTML = "";
    this.renderedNodes.clear();

    if (!schemaObj) {
      return;
    }

    // TODO: Implement rendering that traverses the generated schema structure
    // For now, show a placeholder
    const text = this.createText(
      50,
      50,
      `Schema: ${schemaObj.targetNamespace || "no namespace"}`,
      "info-message"
    );
    this.mainGroup.appendChild(text);

    const text2 = this.createText(
      50,
      80,
      "TODO: Implement schema tree rendering using generated classes",
      "info-message"
    );
    this.mainGroup.appendChild(text2);
  }

  // TODO: Implement rendering methods that work with generated class instances
  // These would traverse element, complexType, simpleType, etc. from the schema object

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
    this.canvas.querySelectorAll(".schema-node").forEach((el) => {
      el.classList.remove("selected");
    });

    // Add selection to specified node
    const nodeElement = this.canvas.querySelector(`[data-node-id="${nodeId}"]`);
    if (nodeElement) {
      nodeElement.classList.add("selected");
    }
  }

  public showError(message: string): void {
    this.mainGroup.innerHTML = "";
    const text = this.createText(50, 50, `Error: ${message}`, "error-message");
    this.mainGroup.appendChild(text);
  }

  public showMessage(message: string): void {
    this.mainGroup.innerHTML = "";
    const text = this.createText(50, 50, message, "info-message");
    this.mainGroup.appendChild(text);
  }
}
