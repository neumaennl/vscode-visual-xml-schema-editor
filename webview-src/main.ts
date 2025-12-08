import { DiagramRenderer } from "./renderer";
import { PropertyPanel } from "./propertyPanel";
import { schema } from "../shared/types";
import {
  VSCodeAPI,
  ViewState,
  WebviewState,
} from "./webviewTypes";
import { DiagramItem } from "./diagram";
import { ExtensionMessage, DiagramOptions } from "../shared/messages";

declare function acquireVsCodeApi<State>(): VSCodeAPI<State>;

class SchemaEditorApp {
  private vscode: VSCodeAPI<WebviewState>;
  private renderer: DiagramRenderer;
  private propertyPanel: PropertyPanel;
  private currentSchema: schema | undefined;
  private viewState: ViewState;
  private diagramOptions: DiagramOptions;

  /**
   * Create and initialize the schema editor application
   */
  constructor() {
    this.vscode = acquireVsCodeApi<WebviewState>();
    this.viewState = { zoom: 1, panX: 0, panY: 0 };
    this.diagramOptions = {
      showDocumentation: false,
      alwaysShowOccurrence: false,
      showType: false,
    };

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
      this.diagramOptions = state.diagramOptions || this.diagramOptions;
      if (state.schema) {
        this.currentSchema = state.schema;
        this.renderSchema(state.schema);
      }
    }
  }

  /**
   * Set up message listener for communication with VS Code extension
   */
  private setupMessageListener(): void {
    window.addEventListener(
      "message",
      (event: MessageEvent<ExtensionMessage>) => {
        const message = event.data;

        switch (message.command) {
          case "updateSchema": {
            this.currentSchema = message.data;
            this.renderSchema(message.data);
            this.saveState();
            break;
          }

          case "updateDiagramOptions": {
            this.diagramOptions = message.data;
            this.saveState();
            // Re-render with new options if schema is loaded
            if (this.currentSchema) {
              this.renderSchema(this.currentSchema);
            }
            break;
          }

          case "error": {
            const errorMessage = message.data.message ?? "Unknown error";
            this.showError(errorMessage);
            break;
          }
        }
      }
    );
  }

  /**
   * Render a schema object to the diagram
   * @param schemaObj - The schema to render
   */
  private renderSchema(schemaObj: schema): void {
    if (!schemaObj) {
      this.showMessage("No schema to display");
      return;
    }

    try {
      console.log("Schema object received:", schemaObj);

      // The renderer will need to traverse the schema structure
      this.renderer.renderSchema(
        schemaObj,
        this.diagramOptions,
        (item: DiagramItem, isExpandButton: boolean) => {
          this.onNodeClick(item, isExpandButton);
        }
      );

      // Center the diagram if this is the first render (no saved pan position)
      if (this.viewState.panX === 0 && this.viewState.panY === 0) {
        this.centerDiagram();
      }
    } catch (error) {
      console.error("Error rendering schema:", error);
      this.showError(`Failed to render: ${(error as Error).message}`);
    }
  }

  /**
   * Center the diagram in the canvas viewport
   */
  private centerDiagram(): void {
    const canvas = document.getElementById("schema-canvas");
    if (!canvas) return;

    // Get canvas dimensions
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;

    // Center the diagram by offsetting to middle of canvas
    // Start with some offset from top-left to avoid toolbar
    this.viewState.panX = canvasWidth / 2 - 100;
    this.viewState.panY = canvasHeight / 2 - 100;

    this.renderer.updateView(this.viewState);
    this.saveState();
  }

  /**
   * Handle node click events
   * @param item - The diagram item that was clicked
   * @param isExpandButton - True if the expand button was clicked
   */
  private onNodeClick(
    item: DiagramItem,
    isExpandButton: boolean = false
  ): void {
    if (isExpandButton) {
      // Toggle expand/collapse
      item.showChildElements = !item.showChildElements;

      // Refresh the diagram (re-layout and re-render without rebuilding)
      this.renderer.refresh();
    } else {
      // Display item properties in the property panel
      this.propertyPanel.display(item);
    }
  }

  /**
   * Set up toolbar button event handlers
   */
  private setupToolbar(): void {
    const zoomInBtn = document.getElementById("zoomIn");
    const zoomOutBtn = document.getElementById("zoomOut");
    const fitViewBtn = document.getElementById("fitView");

    zoomInBtn?.addEventListener("click", () => {
      this.zoomTowardsCenter(1.2);
    });

    zoomOutBtn?.addEventListener("click", () => {
      this.zoomTowardsCenter(0.8);
    });

    fitViewBtn?.addEventListener("click", () => {
      if (!this.currentSchema) return;
      // Fit the diagram content precisely into the canvas
      const newView = this.renderer.fitToCanvas(24);
      this.viewState = newView;
      this.saveState();
    });
  }

  /**
   * Zoom towards the center of the canvas
   * @param delta - Zoom factor (e.g., 1.2 for zoom in, 0.8 for zoom out)
   */
  private zoomTowardsCenter(delta: number): void {
    if (!this.currentSchema) return;

    const canvas = document.getElementById("schema-canvas");
    if (!canvas) return;

    // Get center of canvas
    const centerX = canvas.clientWidth / 2;
    const centerY = canvas.clientHeight / 2;

    // Calculate point in diagram space before zoom
    const pointX = (centerX - this.viewState.panX) / this.viewState.zoom;
    const pointY = (centerY - this.viewState.panY) / this.viewState.zoom;

    // Apply zoom
    this.viewState.zoom *= delta;

    // Adjust pan to keep the center point in the same position
    this.viewState.panX = centerX - pointX * this.viewState.zoom;
    this.viewState.panY = centerY - pointY * this.viewState.zoom;

    this.renderer.updateView(this.viewState);
    this.saveState();
  }

  /**
   * Set up canvas interaction handlers for panning and zooming
   */
  private setupCanvasInteraction(): void {
    const canvas = document.getElementById("schema-canvas");
    if (!canvas || !(canvas instanceof SVGSVGElement)) {
      return;
    }
    let isPanning = false;
    let startX = 0;
    let startY = 0;
    let hasMoved = false;

    canvas.addEventListener("mousedown", (e: MouseEvent) => {
      const target = e.target as SVGElement;

      // Allow panning with middle button, Ctrl+left button, or left button on canvas background
      const isMiddleButton = e.button === 1;
      const isCtrlLeftButton = e.button === 0 && e.ctrlKey;
      const isBackgroundClick = e.button === 0 && target === canvas;

      if (isMiddleButton || isCtrlLeftButton || isBackgroundClick) {
        isPanning = true;
        hasMoved = false;
        startX = e.clientX - this.viewState.panX;
        startY = e.clientY - this.viewState.panY;
        e.preventDefault();
        canvas.style.cursor = "grabbing";
      }
    });

    canvas.addEventListener("mousemove", (e: MouseEvent) => {
      if (isPanning) {
        hasMoved = true;
        this.viewState.panX = e.clientX - startX;
        this.viewState.panY = e.clientY - startY;
        this.renderer.updateView(this.viewState);
      }
    });

    canvas.addEventListener("mouseup", (e: MouseEvent) => {
      if (isPanning) {
        isPanning = false;
        canvas.style.cursor = "grab";
        if (hasMoved) {
          this.saveState();
          // Prevent click event if we were panning
          e.stopPropagation();
        }
      }
    });

    // Zoom with mouse wheel
    canvas.addEventListener("wheel", (e: WheelEvent) => {
      e.preventDefault();

      // Get mouse position relative to canvas
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate point in diagram space before zoom
      const pointX = (mouseX - this.viewState.panX) / this.viewState.zoom;
      const pointY = (mouseY - this.viewState.panY) / this.viewState.zoom;

      // Apply zoom
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.viewState.zoom *= delta;

      // Adjust pan to keep the point under the mouse in the same position
      this.viewState.panX = mouseX - pointX * this.viewState.zoom;
      this.viewState.panY = mouseY - pointY * this.viewState.zoom;

      this.renderer.updateView(this.viewState);
      this.saveState();
    });
  }

  /**
   * Display an error message
   * @param message - Error message to display
   */
  private showError(message: string): void {
    this.renderer.showError(message);
  }

  /**
   * Display an informational message
   * @param message - Message to display
   */
  private showMessage(message: string): void {
    this.renderer.showMessage(message);
  }

  /**
   * Save the current application state to VS Code
   */
  private saveState(): void {
    this.vscode.setState({
      schema: this.currentSchema,
      viewState: this.viewState,
      diagramOptions: this.diagramOptions,
    });
  }
}

// Initialize the app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new SchemaEditorApp());
} else {
  new SchemaEditorApp();
}
