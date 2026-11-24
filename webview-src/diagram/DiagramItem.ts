/**
 * `DiagramItem` represents a single element/group/type in the diagram
 * Ported from XSD Diagram project
 */

import type { DiagramItemType, Point, Size, Rectangle } from "./DiagramTypes";
import type { DiagramStyle } from "./DiagramTypes";
import { DiagramItemGroupType, enclosingRectangle } from "./DiagramTypes";
import type { Diagram } from "./Diagram";
import type { SchemaNodeType } from "../../shared/idStrategy";
import type { DiagramSchemaObject } from "./schemaAccessors";

/**
 * A node of the diagram: an element, group, type or the schema, with what the diagram shows of it, its
 * layout and its children.
 */
export class DiagramItem {
  // Identity and hierarchy
  public id: string;
  /** The text that the diagram shows for the item, such as its name or `sequence`. */
  public label: string;
  /** The schema object that the item stands for; read it with the functions of the accessor modules. */
  public schemaObject: DiagramSchemaObject;
  public itemType: DiagramItemType;
  /**
   * The kind of schema construct that the item shows, as the diagram builder found it in its parent, such
   * as a complex type in the `complexType` list of the schema. Unlike the schema object, it tells a named
   * complex type without content from a simple type.
   */
  public nodeType?: SchemaNodeType;
  public groupType: DiagramItemGroupType = DiagramItemGroupType.Sequence;
  public parent: DiagramItem | null = null;
  public childElements: DiagramItem[] = [];

  // Display properties
  public showChildElements = false;
  public hasChildElements = false;

  // Layout properties
  public location: Point = { x: 0, y: 0 };
  public size: Size = { width: 0, height: 0 };
  public elementBox: Rectangle = { x: 0, y: 0, width: 0, height: 0 };
  public documentationBox: Rectangle = { x: 0, y: 0, width: 0, height: 0 };
  public childExpandButtonBox: Rectangle = { x: 0, y: 0, width: 0, height: 0 };
  public boundingBox: Rectangle = { x: 0, y: 0, width: 0, height: 0 };

  /** The diagram that the item belongs to, which references the schema and holds the display options */
  public diagram: Diagram;

  /**
   * Creates a diagram item.
   *
   * @param id - The ID of the schema node
   * @param label - The text that the diagram shows
   * @param itemType - The kind of item
   * @param schemaObject - The schema object that the item stands for
   * @param diagram - The diagram that the item belongs to, if any
   */
  constructor(
    id: string,
    label: string,
    itemType: DiagramItemType,
    schemaObject: DiagramSchemaObject,
    diagram: Diagram
  ) {
    this.id = id;
    this.label = label;
    this.itemType = itemType;
    this.schemaObject = schemaObject;
    this.diagram = diagram;
  }

  /**
   * Add a child element to this diagram item
   *
   * @param child - The child
   */
  public addChild(child: DiagramItem): void {
    child.parent = this;
    this.childElements.push(child);
    this.hasChildElements = true;
  }

  /**
   * Get the style of the diagram
   *
   * @returns The style
   */
  public getStyle(): DiagramStyle {
    return this.diagram.style;
  }

  /**
   * Calculate the bounding box including all children
   *
   * @returns The bounding box of the item and its shown children, which is also stored in `boundingBox`
   */
  public calculateBoundingBox(): Rectangle {
    const own: Rectangle = { ...this.location, ...this.size };
    const children = this.showChildElements ? this.childElements.map((child) => child.calculateBoundingBox()) : [];
    this.boundingBox = enclosingRectangle([own, ...children]);

    return this.boundingBox;
  }
}
