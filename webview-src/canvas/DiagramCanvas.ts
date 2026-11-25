/**
 * The canvas: draws the diagram of a schema into the SVG element and handles what happens on it,
 * selecting, expanding and collapsing nodes, the view (see `CanvasView`) and dropping schema constructs from
 * the palette (see `canvasDrop`), which the drop rules turn into commands.
 */

import type { DiagramOptions, schema, SchemaCommand } from "../../shared/types";
import type { Diagram, DiagramItem } from "../diagram";
import { DiagramBuilder, DiagramLayout, DiagramSvgRenderer } from "../diagram";
import { CanvasView, type ViewState } from "./CanvasView";
import { setUpNodeDrop } from "./canvasDrop";
import { DropCommandFactory } from "../dragAndDrop/DropCommandFactory";

/** What the canvas reports to the app. */
export interface CanvasHandlers {
  /**
   * @param item - The node that the user selected
   */
  select(item: DiagramItem): void;
  /**
   * @param viewState - The zoom and pan after the user changed them
   */
  viewChanged(viewState: ViewState): void;
  /**
   * @param command - The command that a drop on a node created
   */
  dispatch(command: SchemaCommand): void;
  /**
   * @param message - What failed: drawing the diagram again after a click, or a drop
   */
  failed(message: string): void;
}

/** The class of the selected node. */
const SELECTED_CLASS = "selected";

/** A change of the view that the toolbar offers: zoom in or out, or fit the diagram into the canvas. */
export type ViewChange = "zoomIn" | "zoomOut" | "fit";

/**
 * Draws the diagram of a schema and keeps what belongs to the canvas once: the diagram, the selected
 * node and the view.
 */
export class DiagramCanvas {
  private readonly group: SVGGElement;
  private readonly svgRenderer: DiagramSvgRenderer;
  private readonly layout = new DiagramLayout();
  private readonly view: CanvasView;
  private readonly dropCommandFactory = new DropCommandFactory();
  private diagram: Diagram | null = null;
  private selectedId: string | null = null;

  /**
   * Creates the canvas and starts handling clicks, panning, zooming and drops.
   *
   * @param svg - The SVG element to draw into
   * @param savedView - The saved zoom and pan, or undefined to center the diagram when it is first drawn
   * @param handlers - What the canvas reports to the app
   */
  constructor(
    private readonly svg: SVGSVGElement,
    savedView: ViewState | undefined,
    private readonly handlers: CanvasHandlers
  ) {
    this.group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.svg.appendChild(this.group);
    this.svgRenderer = new DiagramSvgRenderer(this.svg, this.group);
    this.view = new CanvasView(this.svg, this.group, savedView, (viewState) => {
      handlers.viewChanged(viewState);
    });
    this.setUpClickHandling();
    setUpNodeDrop(this.svg, (itemId) => this.getItem(itemId), {
      canDrop: (item, schemaConstruct): boolean => this.dropCommandFactory.canDropOnNode(item, schemaConstruct),
      drop: (item, schemaConstruct): void => {
        const command = this.dropCommandFactory.createNodeDropCommand(item, schemaConstruct);
        if (command) {
          handlers.dispatch(command);
        } else {
          handlers.failed(`Drop of '${schemaConstruct}' is not supported for '${item.label}'`);
        }
      },
    });
  }

  /**
   * Returns the current zoom and pan.
   *
   * @returns The view state
   */
  public get viewState(): ViewState {
    return this.view.viewState;
  }

  /**
   * Builds the diagram of a schema and draws it. Nodes that were expanded stay expanded, and the selected
   * node stays selected.
   *
   * @param schemaObj - The schema to draw
   * @param diagramOptions - The display options of the diagram
   * @throws The error if building, laying out or drawing the diagram fails
   */
  public render(schemaObj: schema, diagramOptions: DiagramOptions): void {
    this.dropCommandFactory.updateNamesFromSchema(schemaObj);
    const expandState = this.diagram?.getExpandState();
    const diagram: Diagram = new DiagramBuilder().buildFromSchema(schemaObj);
    diagram.showDocumentation = diagramOptions.showDocumentation;
    diagram.alwaysShowOccurrence = diagramOptions.alwaysShowOccurrence;
    diagram.showType = diagramOptions.showType;
    if (expandState) {
      diagram.restoreExpandState(expandState);
    }
    this.diagram = diagram;
    this.draw();
    this.view.centerIfNotPositioned();
  }

  /**
   * Finds a node of the drawn diagram by its ID.
   *
   * @param itemId - The ID of the node
   * @returns The node, or null if the diagram has none with this ID
   */
  public getItem(itemId: string | null): DiagramItem | null {
    return itemId === null || !this.diagram ? null : this.diagram.findItem(itemId);
  }

  /**
   * Selects a node, which stays selected when the diagram is drawn again, or clears the selection.
   *
   * @param itemId - The ID of the node, or null to clear the selection
   */
  public select(itemId: string | null): void {
    this.selectedId = itemId;
    this.showSelection();
  }

  /**
   * Changes the view with a toolbar action, if a diagram is drawn.
   *
   * @param action - Zoom in or out from the center of the canvas, or fit the diagram into the canvas
   */
  public changeView(action: ViewChange): void {
    if (!this.diagram) {
      return;
    }
    switch (action) {
      case "zoomIn":
        this.view.zoomIn();
        break;
      case "zoomOut":
        this.view.zoomOut();
        break;
      case "fit":
        this.view.fit();
        break;
    }
  }

  /**
   * Lays out and draws the current diagram again, and shows the selection and the view.
   *
   * @throws The error if laying out or drawing fails
   */
  private draw(): void {
    if (!this.diagram) {
      return;
    }
    this.layout.layout(this.diagram);
    this.svgRenderer.render(this.diagram);
    this.showSelection();
    this.view.apply();
  }

  /** Draws the diagram again after a node was expanded or collapsed, and reports a failure. */
  private redrawAfterClick(): void {
    try {
      this.draw();
    } catch (error) {
      console.error("Diagram refresh error:", error);
      this.handlers.failed(`Failed to refresh diagram: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** Marks the selected node, which every draw creates anew. */
  private showSelection(): void {
    this.svg.querySelectorAll(`.${SELECTED_CLASS}`).forEach((element) => {
      element.classList.remove(SELECTED_CLASS);
    });
    if (this.selectedId !== null) {
      this.svg.querySelector(`[data-item-id="${CSS.escape(this.selectedId)}"]`)?.classList.add(SELECTED_CLASS);
    }
  }

  /**
   * A click on the expand button of a node expands or collapses it; a click on a node selects it.
   */
  private setUpClickHandling(): void {
    this.svg.addEventListener("click", (event: MouseEvent) => {
      const target = event.target as SVGElement;
      const expandButton = target.closest(".expand-button");
      const item = this.getItem(target.closest("[data-item-id]")?.getAttribute("data-item-id") ?? null);
      if (expandButton) {
        event.stopPropagation();
        if (item) {
          item.showChildElements = !item.showChildElements;
          this.redrawAfterClick();
        }
        return;
      }
      if (item) {
        this.select(item.id);
        this.handlers.select(item);
      }
    });
  }
}
