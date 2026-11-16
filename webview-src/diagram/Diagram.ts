/**
 * Diagram represents the entire XSD diagram structure.
 * Ported from XSD Diagram project.
 * Contains root elements, layout settings, and rendering style configuration.
 */

import type { DiagramItem } from "./DiagramItem";
import type {
  Size,
  Rectangle,
  DiagramStyle,
} from "./DiagramTypes";
import {
  enclosingRectangle,
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
  public scale = 1.0;
  
  /** Whether to display documentation annotations */
  public showDocumentation = false;
  
  /** Whether to always show occurrence constraints */
  public alwaysShowOccurrence = false;
  
  /** Whether to show type information */
  public showType = false;

  /** Prefix bound to this schema's `targetNamespace`, when available */
  public currentSchemaPrefix?: string;

  /** Schema-level `targetNamespace` (schema root metadata) */
  public schemaTargetNamespace = "";

  /** Schema-level namespace declarations keyed by prefix */
  public schemaNamespacePrefixes: Record<string, string> = {};

  /** Cached local simple/complex type names discovered in the current schema diagram */
  public localSchemaTypeNames?: ReadonlySet<string>;

  /** Visual style settings for the diagram */
  public style: DiagramStyle = { ...defaultDiagramStyle };

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
