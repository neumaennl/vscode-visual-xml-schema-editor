/**
 * Diagram represents the entire XSD diagram structure.
 * Ported from XSD Diagram project.
 * Contains root elements, layout settings, and rendering style configuration.
 */

import { DiagramItem } from "./DiagramItem";
import {
  Size,
  Rectangle,
  DiagramStyle,
  defaultDiagramStyle,
} from "./DiagramTypes";

/**
 * Main diagram class that holds the complete structure of an XSD visualization.
 */
export class Diagram {
  /** Root elements of the diagram (typically the schema node) */
  public rootElements: DiagramItem[] = [];

  /** Overall size of the diagram canvas */
  public size: Size = { width: 0, height: 0 };
  
  /** Padding around the diagram content */
  public padding: Size = { width: 20, height: 20 };
  
  /** Calculated bounding box containing all diagram elements */
  public boundingBox: Rectangle = { x: 0, y: 0, width: 0, height: 0 };
  
  /** Scale factor for rendering (1.0 = 100%) */
  public scale: number = 1.0;
  
  /** Whether to display documentation annotations */
  public showDocumentation: boolean = false;
  
  /** Whether to always show occurrence constraints */
  public alwaysShowOccurrence: boolean = false;
  
  /** Whether to show type information */
  public showType: boolean = false;

  /** Visual style settings for the diagram */
  public style: DiagramStyle = { ...defaultDiagramStyle };

  /**
   * Creates a new Diagram instance.
   */
  constructor() {}

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

    let minX = Number.MAX_VALUE;
    let minY = Number.MAX_VALUE;
    let maxX = Number.MIN_VALUE;
    let maxY = Number.MIN_VALUE;

    for (const root of this.rootElements) {
      const bounds = root.calculateBoundingBox();
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    }

    this.boundingBox = {
      x: minX - this.padding.width,
      y: minY - this.padding.height,
      width: maxX - minX + 2 * this.padding.width,
      height: maxY - minY + 2 * this.padding.height,
    };

    return this.boundingBox;
  }

  /**
   * Scales a rectangle based on the diagram's scale factor.
   * Applies the diagram scale to all rectangle dimensions and rounds to integers.
   * 
   * @param rect - The rectangle to scale
   * @returns A new rectangle with scaled dimensions
   */
  public scaleRectangle(rect: Rectangle): Rectangle {
    return {
      x: Math.round(rect.x * this.scale),
      y: Math.round(rect.y * this.scale),
      width: Math.round(rect.width * this.scale),
      height: Math.round(rect.height * this.scale),
    };
  }
}
