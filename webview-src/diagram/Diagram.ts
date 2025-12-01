/**
 * Diagram represents the entire XSD diagram
 * Ported from XSD Diagram project
 */

import { DiagramItem } from "./DiagramItem";
import {
  Size,
  Rectangle,
  DiagramStyle,
  defaultDiagramStyle,
} from "./DiagramTypes";

export class Diagram {
  // Root elements of the diagram
  public rootElements: DiagramItem[] = [];

  // Diagram settings
  public size: Size = { width: 0, height: 0 };
  public padding: Size = { width: 20, height: 20 };
  public boundingBox: Rectangle = { x: 0, y: 0, width: 0, height: 0 };
  public scale: number = 1.0;
  public showDocumentation: boolean = false;
  public alwaysShowOccurrence: boolean = false;
  public showType: boolean = false;

  // Style settings
  public style: DiagramStyle = { ...defaultDiagramStyle };

  constructor() {}

  /**
   * Add a root element to the diagram
   */
  public addRootElement(element: DiagramItem): void {
    element.diagram = this;
    this.rootElements.push(element);
  }

  /**
   * Calculate the overall bounding box of the diagram
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
   * Scale a rectangle based on diagram scale
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
