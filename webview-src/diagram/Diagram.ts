/**
 * Diagram represents the entire XSD diagram structure.
 * Ported from XSD Diagram project.
 * Contains root elements, layout settings, and rendering style configuration.
 */

import type { DiagramItem } from "./DiagramItem";
import type { Size, Rectangle, DiagramStyle } from "./DiagramTypes";
import { enclosingRectangle, defaultDiagramStyle } from "./DiagramTypes";
import type { schema } from "../../shared/types";

/**
 * Main diagram class that holds the complete structure of an XSD visualization.
 */
export class Diagram {
  /** Root elements of the diagram (typically the schema node) */
  public rootElements: DiagramItem[] = [];

  /** The schema that the diagram shows */
  public readonly schema: schema;

  /** Padding around the diagram content */
  public padding: Size = { width: 20, height: 20 };

  /** Calculated bounding box containing all diagram elements */
  public boundingBox: Rectangle = { x: 0, y: 0, width: 0, height: 0 };

  /** Whether to display documentation annotations */
  public showDocumentation = false;

  /** Whether to always show occurrence constraints */
  public alwaysShowOccurrence = false;

  /** Whether to show type information */
  public showType = false;

  /** Visual style settings for the diagram */
  public style: DiagramStyle = { ...defaultDiagramStyle };

  /**
   * Creates the diagram of a schema.
   *
   * @param schemaObj - The schema that the diagram shows
   */
  constructor(schemaObj: schema) {
    this.schema = schemaObj;
  }

  /**
   * Adds a root element to the diagram.
   * Typically used to add the schema root node.
   *
   * @param element - The diagram item to add as a root element
   */
  public addRootElement(element: DiagramItem): void {
    element.diagram = this;
    this.rootElements.push(element);
  }

  /**
   * Calculates the overall bounding box of the diagram.
   * Computes the minimum rectangle that contains all root elements and their children.
   * Includes padding in the calculation.
   *
   * @returns The calculated bounding rectangle
   */
  public calculateBoundingBox(): Rectangle {
    if (this.rootElements.length === 0) {
      this.boundingBox = { x: 0, y: 0, width: 0, height: 0 };
      return this.boundingBox;
    }

    const bounds = enclosingRectangle(this.rootElements.map((root) => root.calculateBoundingBox()));
    this.boundingBox = {
      x: bounds.x - this.padding.width,
      y: bounds.y - this.padding.height,
      width: bounds.width + 2 * this.padding.width,
      height: bounds.height + 2 * this.padding.height,
    };

    return this.boundingBox;
  }

  /**
   * Finds the item with the given ID among the root elements and their descendants.
   *
   * @param itemId - The ID of the item
   * @returns The first item with the ID, in document order, or null if there is none
   */
  public findItem(itemId: string): DiagramItem | null {
    for (const item of this.items()) {
      if (item.id === itemId) {
        return item;
      }
    }
    return null;
  }

  /**
   * Records which items show their children, so that a rebuilt diagram can show the same.
   *
   * @returns Whether each item shows its children, by item ID
   */
  public getExpandState(): Map<string, boolean> {
    const state = new Map<string, boolean>();
    for (const item of this.items()) {
      state.set(item.id, item.showChildElements);
    }
    return state;
  }

  /**
   * Shows or hides the children of the items as recorded by {@link Diagram.getExpandState}. Items that
   * the state does not contain keep their setting.
   *
   * @param state - Whether each item shows its children, by item ID
   */
  public restoreExpandState(state: ReadonlyMap<string, boolean>): void {
    for (const item of this.items()) {
      item.showChildElements = state.get(item.id) ?? item.showChildElements;
    }
  }

  /**
   * Walks through the root elements and their descendants, each parent before its children.
   *
   * @returns The items of the diagram
   */
  private *items(): Generator<DiagramItem> {
    const pending = [...this.rootElements].reverse();
    let item = pending.pop();
    while (item) {
      yield item;
      pending.push(...[...item.childElements].reverse());
      item = pending.pop();
    }
  }
}
