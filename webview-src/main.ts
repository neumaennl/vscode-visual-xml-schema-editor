// Tells Vite to write webview/styles.css, which the HTML of the webview loads with <link>.
// The bundle itself contains no CSS and injects none.
import "./styles.css";
import { DiagramRenderer } from "./renderer";
import { PropertiesPanel } from "./propertiesPanel/propertiesPanel";
import type { schema } from "../shared/types";
import type { VSCodeAPI, ViewState, WebviewState } from "./webviewTypes";
import type { DiagramItem } from "./diagram";
import type { ExtensionMessage, DiagramOptions } from "../shared/messages";
import { PaletteView } from "./palette/PaletteView";
import { DropCommandFactory } from "./drop/DropCommandFactory";
import { isPaletteSchemaConstruct } from "./palette/PaletteSchemaConstruct";

declare function acquireVsCodeApi<State>(): VSCodeAPI<State>;

/**
 * The webview application: connects the diagram, the properties panel and the palette with the
 * extension host, and keeps the state of the webview.
 */
class SchemaEditorApp {
  private vscode: VSCodeAPI<WebviewState>;
  private renderer: DiagramRenderer;
  private propertiesPanel: PropertiesPanel;
  private currentSchema: schema | undefined;
  private viewState: ViewState;
  private diagramOptions: DiagramOptions;
  private paletteView: PaletteView | null = null;
  private dropCommandFactory = new DropCommandFactory();
  private notificationBar: HTMLElement | null = null;
  private selectedNodeId: string | null = null;

  /**
   * Create and initialize the schema editor application
   *
   * @throws An {@link Error} if the page has no SVG canvas
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
    this.propertiesPanel = new PropertiesPanel(
      document.getElementById("properties-content") as HTMLDivElement,
      (command) => {
        this.vscode.postMessage({ command: "executeCommand", data: command });
      }
    );

    const paletteContainer = document.getElementById("palette-content");
    if (paletteContainer && paletteContainer instanceof HTMLDivElement) {
      this.paletteView = new PaletteView(paletteContainer);
      this.paletteView.render();
    }

    this.setupMessageListener();
    this.setupToolbar();
    this.setupCanvasInteraction();
    this.setupDragAndDrop();

    // Restore state if available
    const state = this.vscode.getState();
    if (state) {
      this.viewState = state.viewState ?? this.viewState;
      this.diagramOptions = state.diagramOptions ?? this.diagramOptions;
      if (state.schema) {
        this.currentSchema = state.schema;
        this.dropCommandFactory.updateNamesFromSchema(state.schema);
        this.renderSchema(state.schema);
      }
    }
  }

  /**
   * Set up message listener for communication with VS Code extension
   */
  private setupMessageListener(): void {
    window.addEventListener("message", (event: MessageEvent<ExtensionMessage>) => {
      const message = event.data;

      switch (message.command) {
        case "updateSchema": {
          this.currentSchema = message.data;
          this.dropCommandFactory.updateNamesFromSchema(message.data);
          this.renderSchema(message.data);
          this.dismissNotification();
          this.refreshSelection();
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
          this.showError(message.data.message);
          break;
        }

        case "commandResult": {
          if (message.data.success) {
            this.dismissNotification();
            break;
          }
          if (message.data.error) {
            this.showError(message.data.error);
          }
          this.refreshSelection();
          break;
        }

        case "schemaModified":
          // Never sent (see "Message `schemaModified` is unused" in docs/known-issues.md)
          break;
      }
    });
  }

  /**
   * Render a schema object to the diagram
   * @param schemaObj - The schema to render
   */
  private renderSchema(schemaObj: schema): void {
    try {
      console.log("Schema object received:", schemaObj);

      // The renderer will need to traverse the schema structure
      this.renderer.renderSchema(schemaObj, this.diagramOptions, (item: DiagramItem, isExpandButton: boolean) => {
        this.onNodeClick(item, isExpandButton);
      });

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
  private onNodeClick(item: DiagramItem, isExpandButton = false): void {
    if (isExpandButton) {
      // Toggle expand/collapse
      item.showChildElements = !item.showChildElements;

      // Refresh the diagram (re-layout and re-render without rebuilding)
      try {
        this.renderer.refresh();
      } catch (error) {
        this.showError(`Failed to refresh diagram: ${(error as Error).message}`);
      }
    } else {
      // Display item properties in the properties panel
      this.selectedNodeId = item.id;
      this.renderer.selectNode(item.id);
      this.propertiesPanel.display(item);
    }
  }

  /**
   * Shows the selected node again after the diagram was rebuilt, or clears the selection if the node is
   * gone.
   */
  private refreshSelection(): void {
    if (!this.selectedNodeId) {
      return;
    }

    const selectedItem = this.renderer.getItemById(this.selectedNodeId);
    if (!selectedItem) {
      this.selectedNodeId = null;
      this.propertiesPanel.clear();
      return;
    }

    this.renderer.selectNode(selectedItem.id);
    this.propertiesPanel.display(selectedItem);
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
   * Set up palette-to-canvas drag and drop interactions.
   */
  private setupDragAndDrop(): void {
    this.renderer.setNodeDropValidator(
      (item, construct) => isPaletteSchemaConstruct(construct) && this.dropCommandFactory.canDropOnNode(item, construct)
    );
    this.renderer.setDropHandler((item, construct) => {
      this.handleNodeDrop(item, construct);
    });
  }

  /**
   * Handles a drop onto a specific diagram node.
   *
   * @param item - Drop target node
   * @param construct - XML schema construct from palette
   */
  private handleNodeDrop(item: DiagramItem, construct: string): void {
    if (!isPaletteSchemaConstruct(construct)) {
      this.showError(`Drop of '${construct}' is not supported for '${item.name}'`);
      return;
    }
    const command = this.dropCommandFactory.createNodeDropCommand(item, construct);
    if (!command) {
      this.showError(`Drop of '${construct}' is not supported for '${item.name}'`);
      return;
    }
    this.vscode.postMessage({ command: "executeCommand", data: command });
  }

  /**
   * Zoom towards the center of the canvas
   * @param delta - Zoom factor (e.g., 1.2 for zoom in, 0.8 for zoom out)
   */
  private zoomTowardsCenter(delta: number): void {
    if (!this.currentSchema) return;

    const canvas = document.getElementById("schema-canvas");
    if (!canvas) return;

    this.zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, delta);
  }

  /**
   * Zooms the view and keeps a point of the canvas in the same position.
   *
   * @param canvasX - The x coordinate of the point, relative to the canvas
   * @param canvasY - The y coordinate of the point, relative to the canvas
   * @param delta - Zoom factor (e.g., 1.2 for zoom in, 0.8 for zoom out)
   */
  private zoomAt(canvasX: number, canvasY: number, delta: number): void {
    // The point in diagram space before the zoom
    const pointX = (canvasX - this.viewState.panX) / this.viewState.zoom;
    const pointY = (canvasY - this.viewState.panY) / this.viewState.zoom;

    this.viewState.zoom *= delta;
    this.viewState.panX = canvasX - pointX * this.viewState.zoom;
    this.viewState.panY = canvasY - pointY * this.viewState.zoom;

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

      // Keep the point under the mouse in the same position
      this.zoomAt(mouseX, mouseY, e.deltaY > 0 ? 0.9 : 1.1);
    });
  }

  /**
   * Display a non-destructive error notification bar.
   * The bar remains visible until the user dismisses it.
   * @param message - Error message to display
   */
  private showError(message: string): void {
    if (!this.notificationBar) {
      this.notificationBar = document.getElementById("notification-bar");
      document.getElementById("notification-dismiss")?.addEventListener("click", () => {
        this.dismissNotification();
      });
    }
    const msgEl = document.getElementById("notification-message");
    if (msgEl) {
      msgEl.textContent = message;
    }
    this.notificationBar?.removeAttribute("hidden");
  }

  /**
   * Dismiss the notification bar.
   */
  private dismissNotification(): void {
    this.notificationBar?.setAttribute("hidden", "");
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
