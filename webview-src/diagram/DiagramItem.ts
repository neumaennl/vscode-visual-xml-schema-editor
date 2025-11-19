/**
 * DiagramItem represents a single element/group/type in the diagram
 * Ported from XSD Diagram project
 */

import {
  DiagramItemType,
  DiagramItemGroupType,
  Point,
  Size,
  Rectangle,
  DiagramStyle,
} from "./DiagramTypes";
import type { Diagram } from "./Diagram";

export class DiagramItem {
  // Identity and hierarchy
  public id: string;
  public name: string;
  public type: string = "";
  public itemType: DiagramItemType;
  public groupType: DiagramItemGroupType = DiagramItemGroupType.Sequence;
  public parent: DiagramItem | null = null;
  public childElements: DiagramItem[] = [];
  public inheritFrom: DiagramItem | null = null;

  // Occurrence constraints
  public minOccurrence: number = 1;
  public maxOccurrence: number = 1; // -1 for unbounded

  // Display properties
  public showChildElements: boolean = false;
  public hasChildElements: boolean = false;
  public isReference: boolean = false;
  public isSimpleContent: boolean = false;
  public isAbstract: boolean = false;

  // Layout properties
  public location: Point = { x: 0, y: 0 };
  public size: Size = { width: 0, height: 0 };
  public elementBox: Rectangle = { x: 0, y: 0, width: 0, height: 0 };
  public documentationBox: Rectangle = { x: 0, y: 0, width: 0, height: 0 };
  public childExpandButtonBox: Rectangle = { x: 0, y: 0, width: 0, height: 0 };
  public boundingBox: Rectangle = { x: 0, y: 0, width: 0, height: 0 };

  // Documentation
  public documentation: string = "";

  // Reference to diagram for accessing settings
  public diagram: Diagram | null = null;

  constructor(
    id: string,
    name: string,
    itemType: DiagramItemType,
    diagram: Diagram | null = null
  ) {
    this.id = id;
    this.name = name;
    this.itemType = itemType;
    this.diagram = diagram;
  }

  /**
   * Add a child element to this diagram item
   */
  public addChild(child: DiagramItem): void {
    child.parent = this;
    this.childElements.push(child);
    this.hasChildElements = true;
  }

  /**
   * Get text documentation, handling multi-language if needed
   */
  public getTextDocumentation(): string {
    return this.documentation;
  }

  /**
   * Scale a number based on diagram scale
   */
  public scaleInt(value: number): number {
    if (!this.diagram) return value;
    return Math.round(value * this.diagram.scale);
  }

  /**
   * Scale a point
   */
  public scalePoint(point: Point): Point {
    if (!this.diagram) return point;
    return {
      x: Math.round(point.x * this.diagram.scale),
      y: Math.round(point.y * this.diagram.scale),
    };
  }

  /**
   * Scale a size
   */
  public scaleSize(size: Size): Size {
    if (!this.diagram) return size;
    return {
      width: Math.round(size.width * this.diagram.scale),
      height: Math.round(size.height * this.diagram.scale),
    };
  }

  /**
   * Scale a rectangle
   */
  public scaleRectangle(rect: Rectangle): Rectangle {
    if (!this.diagram) return rect;
    return {
      x: Math.round(rect.x * this.diagram.scale),
      y: Math.round(rect.y * this.diagram.scale),
      width: Math.round(rect.width * this.diagram.scale),
      height: Math.round(rect.height * this.diagram.scale),
    };
  }

  /**
   * Calculate the bounding box including all children
   */
  public calculateBoundingBox(): Rectangle {
    let minX = this.location.x;
    let minY = this.location.y;
    let maxX = this.location.x + this.size.width;
    let maxY = this.location.y + this.size.height;

    if (this.showChildElements) {
      for (const child of this.childElements) {
        const childBounds = child.calculateBoundingBox();
        minX = Math.min(minX, childBounds.x);
        minY = Math.min(minY, childBounds.y);
        maxX = Math.max(maxX, childBounds.x + childBounds.width);
        maxY = Math.max(maxY, childBounds.y + childBounds.height);
      }
    }

    this.boundingBox = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };

    return this.boundingBox;
  }
}
