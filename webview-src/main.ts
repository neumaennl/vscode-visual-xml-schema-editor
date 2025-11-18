import { DiagramRenderer } from "./renderer";
import { PropertyPanel } from "./propertyPanel";
import { schema } from "../shared/types";
import { VSCodeAPI, MessageFromExtension, ViewState } from "./webviewTypes";

declare function acquireVsCodeApi(): VSCodeAPI;

class SchemaEditorApp {
  private vscode: VSCodeAPI;
  private renderer: DiagramRenderer;
  private propertyPanel: PropertyPanel;
  private currentSchema: schema | null = null;
  private viewState: ViewState;

  constructor() {
    this.vscode = acquireVsCodeApi();
    this.viewState = { zoom: 1, panX: 0, panY: 0 };

    const canvas = document.getElementById("schema-canvas");
    if (!canvas || !(canvas instanceof SVGSVGElement)) {
      throw new Error("Canvas element not found or is not an SVG element");
    }

    this.renderer = new DiagramRenderer(canvas, this.viewState);
    this.propertyPanel = new PropertyPanel(
      document.getElementById("properties-content") as HTMLDivElement
    );

    this.setupMessageListener();
    this.setupToolbar();
    this.setupCanvasInteraction();

    // Restore state if available
    const state = this.vscode.getState();
    if (state) {
      this.viewState = state.viewState || this.viewState;
      if (state.schema) {
        this.currentSchema = state.schema;
        this.renderSchema(state.schema);
      }
    }
  }

  private setupMessageListener(): void {
    window.addEventListener(
      "message",
      (event: MessageEvent<MessageFromExtension>) => {
        const message = event.data;
        switch (message.command) {
          case "updateSchema":
            this.currentSchema = message.data as schema;
            this.renderSchema(message.data as schema);
            this.saveState();
            break;
          case "error":
            this.showError(message.data?.message || "Unknown error");
            break;
        }
      }
    );
  }

  private renderSchema(schemaObj: schema): void {
    if (!schemaObj) {
      this.showMessage("No schema to display");
      return;
    }

    // TODO: Implement rendering logic that works directly with schema object
    // The renderer will need to traverse the schema structure
    this.renderer.renderSchema(schemaObj, (node: any) => {
      this.onNodeClick(node);
    });
  }

  private onNodeClick(node: any): void {
    // TODO: Adapt to work with generated class instances
    this.propertyPanel.display(node);

    this.vscode.postMessage({
      command: "nodeClicked",
      data: { nodeId: node.id },
    });
  }

  private setupToolbar(): void {
    const zoomInBtn = document.getElementById("zoomIn");
    const zoomOutBtn = document.getElementById("zoomOut");
    const fitViewBtn = document.getElementById("fitView");
    const exportClassesBtn = document.getElementById("exportClasses");

    zoomInBtn?.addEventListener("click", () => {
      this.viewState.zoom *= 1.2;
      if (this.currentSchema) {
        this.renderer.updateView(this.viewState);
        this.saveState();
      }
    });

    zoomOutBtn?.addEventListener("click", () => {
      this.viewState.zoom *= 0.8;
      if (this.currentSchema) {
        this.renderer.updateView(this.viewState);
        this.saveState();
      }
    });

    fitViewBtn?.addEventListener("click", () => {
      this.viewState = { zoom: 1, panX: 0, panY: 0 };
      if (this.currentSchema) {
        this.renderer.updateView(this.viewState);
        this.saveState();
      }
    });

    exportClassesBtn?.addEventListener("click", () => {
      this.vscode.postMessage({
        command: "requestClasses",
        data: {},
      });
    });
  }

  private setupCanvasInteraction(): void {
    const canvas = document.getElementById("schema-canvas");
    if (!canvas || !(canvas instanceof SVGSVGElement)) {
      return;
    }
    let isPanning = false;
    let startX = 0;
    let startY = 0;

    canvas.addEventListener("mousedown", (e: MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
        isPanning = true;
        startX = e.clientX - this.viewState.panX;
        startY = e.clientY - this.viewState.panY;
        e.preventDefault();
      }
    });

    document.addEventListener("mousemove", (e: MouseEvent) => {
      if (isPanning) {
        this.viewState.panX = e.clientX - startX;
        this.viewState.panY = e.clientY - startY;
        this.renderer.updateView(this.viewState);
      }
    });

    document.addEventListener("mouseup", () => {
      if (isPanning) {
        isPanning = false;
        this.saveState();
      }
    });

    // Zoom with mouse wheel
    canvas.addEventListener("wheel", (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.viewState.zoom *= delta;
      this.renderer.updateView(this.viewState);
      this.saveState();
    });
  }

  private showError(message: string): void {
    this.renderer.showError(message);
  }

  private showMessage(message: string): void {
    this.renderer.showMessage(message);
  }

  private saveState(): void {
    this.vscode.setState({
      schema: this.currentSchema,
      viewState: this.viewState,
    });
  }
}

// Initialize the app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new SchemaEditorApp());
} else {
  new SchemaEditorApp();
}
