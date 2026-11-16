/**
 * DiagramItem represents a single element/group/type in the diagram
 * Ported from XSD Diagram project
 */

import type {
  DiagramItemType,
  DiagramComplexDerivationKind,
  DiagramSimpleTypeDerivationKind,
  DiagramAnnotationEntry,
  Point,
  Size,
  Rectangle,
} from "./DiagramTypes";
import type { DiagramStyle } from "./DiagramTypes";
import {
  DiagramItemGroupType,
  defaultDiagramStyle,
  enclosingRectangle,
} from "./DiagramTypes";
import type { Diagram } from "./Diagram";

export class DiagramItem {
  // Identity and hierarchy
  public id: string;
  public name: string;
  public type = "";
  public itemType: DiagramItemType;
  public groupType: DiagramItemGroupType = DiagramItemGroupType.Sequence;
  public parent: DiagramItem | null = null;
  public childElements: DiagramItem[] = [];
  public inheritFrom: DiagramItem | null = null;

  // Occurrence constraints
  public minOccurrence = 1;
  public maxOccurrence = 1; // -1 for unbounded

  // Display properties
  // jscpd:ignore-start -- distinct flags of the same type, not duplicated logic
  public showChildElements = false;
  public hasChildElements = false;
  public isReference = false;
  public isSimpleContent = false;
  public isAbstract = false;
  public isNillable = false;
  public isMixed = false;
  public hasAnonymousComplexType = false;
  // jscpd:ignore-end
  public complexDerivationKind?: DiagramComplexDerivationKind;
  public simpleTypeDerivationKind?: DiagramSimpleTypeDerivationKind;
  public simpleTypeListItemType?: string;
  public simpleTypeUnionMemberTypes?: string[];

  // Default/fixed value constraints (element-level)
  public elementDefault?: string;
  public elementFixed?: string;

  // Layout properties
  public location: Point = { x: 0, y: 0 };
  public size: Size = { width: 0, height: 0 };
  public elementBox: Rectangle = { x: 0, y: 0, width: 0, height: 0 };
  public documentationBox: Rectangle = { x: 0, y: 0, width: 0, height: 0 };
  public childExpandButtonBox: Rectangle = { x: 0, y: 0, width: 0, height: 0 };
  public boundingBox: Rectangle = { x: 0, y: 0, width: 0, height: 0 };

  // Documentation
  public documentation = "";
  public documentationAnnotations: DiagramAnnotationEntry[] = [];

  // Namespace
  public namespace = "";

  // Attributes
  public attributes: Array<{
    name: string;
    type: string;
    use?: string;
    defaultValue?: string;
    fixedValue?: string;
  }> = [];

  // Restrictions (for simpleType restrictions)
  public restrictions?: {
    enumeration?: string[];
    pattern?: string[];
    length?: number;
    minLength?: number;
    maxLength?: number;
    minInclusive?: string;
    maxInclusive?: string;
    minExclusive?: string;
    maxExclusive?: string;
    totalDigits?: number;
    fractionDigits?: number;
    whiteSpace?: string;
  };

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
   * Get the style of the diagram, or the default style if the item belongs to no diagram
   */
  public getStyle(): DiagramStyle {
    return this.diagram?.style ?? defaultDiagramStyle;
  }

  /**
   * Scale a number based on diagram scale
   */
  public scaleInt(value: number): number {
    if (!this.diagram) return value;
    return Math.round(value * this.diagram.scale);
  }

  /**
   * Scale a rectangle (see {@link Diagram.scaleRectangle})
   */
  public scaleRectangle(rect: Rectangle): Rectangle {
    return this.diagram ? this.diagram.scaleRectangle(rect) : rect;
  }

  /**
   * Calculate the bounding box including all children
   */
  public calculateBoundingBox(): Rectangle {
    const own: Rectangle = { ...this.location, ...this.size };
    const children = this.showChildElements ? this.childElements.map((child) => child.calculateBoundingBox()) : [];
    this.boundingBox = enclosingRectangle([own, ...children]);

    return this.boundingBox;
  }
}
