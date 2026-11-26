// Tells Vite to write webview/styles.css, which the HTML of the webview loads with <link>.
// The bundle itself contains no CSS and injects none.
import "./styles.css";
import { DiagramCanvas, type ViewChange } from "./canvas/DiagramCanvas";
import { PropertiesPanel } from "./propertiesPanel/propertiesPanel";
import { compositorIdAfterChange } from "./propertiesPanel/propertiesPanelCompositor";
import type { schema, SchemaCommand, WebviewMessage } from "../shared/types";
import type { ViewState } from "./canvas/CanvasView";
import type { DiagramItem } from "./diagram";
import type { ExtensionMessage, DiagramOptions } from "../shared/messages";
import { PaletteView } from "./palette/PaletteView";

/** The API that VS Code gives the webview. */
interface VSCodeAPI<State> {
  postMessage(message: WebviewMessage): void;
  getState(): State | undefined;
  setState(state: State): void;
}

/** What the webview saves with `setState()`, so that it can be shown again when it is recreated. */
interface WebviewState {
  viewState?: ViewState;
  schema?: schema;
  diagramOptions?: DiagramOptions;
}

declare function acquireVsCodeApi<State>(): VSCodeAPI<State>;

/**
 * The webview application: connects the canvas, the properties panel and the palette with the extension
 * host, and keeps the state of the webview.
 */
class SchemaEditorApp {
  private vscode: VSCodeAPI<WebviewState>;
  private canvas: DiagramCanvas;
  private propertiesPanel: PropertiesPanel;
  private currentSchema: schema | undefined;
  private diagramOptions: DiagramOptions;
  private notificationBar: HTMLElement | null = null;
  private selectedNodeId: string | null = null;
  /** The ID that the selected node gets from a command that changes it, which the selection follows. */
  private selectionAfterCommand: string | null = null;

  /**
   * Create and initialize the schema editor application
   *
   * @throws An {@link Error} if the page has no SVG canvas
   */
  constructor() {
    this.vscode = acquireVsCodeApi<WebviewState>();
    const state = this.vscode.getState();
    this.diagramOptions = state?.diagramOptions ?? {
      showDocumentation: false,
      alwaysShowOccurrence: false,
      showType: false,
    };

    const svg = document.getElementById("schema-canvas");
    if (!svg || !(svg instanceof SVGSVGElement)) {
      throw new Error("Canvas element not found or is not an SVG element");
    }

    this.canvas = new DiagramCanvas(svg, state?.viewState, {
      select: (item): void => {
        this.onNodeSelected(item);
      },
      viewChanged: (): void => {
        this.saveState();
      },
      failed: (message): void => {
        this.showError(message);
      },
      dispatch: (command): void => {
        this.vscode.postMessage({ command: "executeCommand", data: command });
      },
    });
    this.propertiesPanel = new PropertiesPanel(
      document.getElementById("properties-content") as HTMLDivElement,
      (command) => {
        this.selectionAfterCommand = this.idAfterCommand(command) ?? this.selectionAfterCommand;
        this.vscode.postMessage({ command: "executeCommand", data: command });
      }
    );

    const paletteContainer = document.getElementById("palette-content");
    if (paletteContainer && paletteContainer instanceof HTMLDivElement) {
      new PaletteView(paletteContainer).render();
    }

    this.setupMessageListener();
    this.setupToolbar();

    if (state?.schema) {
      this.currentSchema = state.schema;
      this.renderSchema(state.schema);
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
      }
    });
  }

  /**
   * Draws a schema on the canvas and shows an error if that fails.
   *
   * @param schemaObj - The schema to draw
   */
  private renderSchema(schemaObj: schema): void {
    try {
      this.canvas.render(schemaObj, this.diagramOptions);
    } catch (error) {
      console.error("Error rendering schema:", error);
      this.showError(`Failed to render: ${(error as Error).message}`);
    }
  }

  /**
   * Shows a node that the user selected on the canvas in the properties panel.
   *
   * @param item - The selected node
   */
  private onNodeSelected(item: DiagramItem): void {
    this.selectedNodeId = item.id;
    this.propertiesPanel.display(item);
  }

  /**
   * Returns the ID that the node of a command gets from it, for a command that changes the ID: a compositor
   * whose kind changes.
   *
   * @param command - The command that the properties panel sends
   * @returns The new ID, or `null` if the command does not change the ID of its node
   */
  private idAfterCommand(command: SchemaCommand): string | null {
    if (command.type !== "modifyCompositor" || command.payload.compositor === undefined) {
      return null;
    }
    const item = this.canvas.getItem(command.payload.compositorId);
    const { compositor } = command.payload;
    return item && item.compositor !== compositor ? compositorIdAfterChange(item, compositor) : null;
  }

  /**
   * Shows the selected node again after the diagram was rebuilt, or clears the selection if the node is
   * gone. If a command gave the node a new ID, the selection follows it; if the command was rejected, the
   * node keeps its ID.
   */
  private refreshSelection(): void {
    const idAfterCommand = this.selectionAfterCommand;
    this.selectionAfterCommand = null;
    if (!this.selectedNodeId) {
      return;
    }

    const selectedItem = this.canvas.getItem(idAfterCommand) ?? this.canvas.getItem(this.selectedNodeId);
    if (!selectedItem) {
      this.selectedNodeId = null;
      this.canvas.select(null);
      this.propertiesPanel.clear();
      return;
    }

    this.selectedNodeId = selectedItem.id;
    this.canvas.select(selectedItem.id);
    this.propertiesPanel.display(selectedItem);
  }

  /**
   * Set up toolbar button event handlers
   */
  private setupToolbar(): void {
    const actions = { zoomIn: "zoomIn", zoomOut: "zoomOut", fitView: "fit" } as const satisfies Record<
      string,
      ViewChange
    >;
    for (const [buttonId, action] of Object.entries(actions)) {
      document.getElementById(buttonId)?.addEventListener("click", () => {
        this.canvas.changeView(action);
      });
    }
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
      viewState: this.canvas.viewState,
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
