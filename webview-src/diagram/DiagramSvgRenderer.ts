/**
 * DiagramSvgRenderer renders diagram items to SVG
 * Ported from XSD Diagram project (DiagramSvgRenderer.cs)
 */

import { Diagram } from "./Diagram";
import { DiagramItem } from "./DiagramItem";
import {
  DiagramItemType,
  DiagramItemGroupType,
  Point,
  Rectangle,
} from "./DiagramTypes";

export class DiagramSvgRenderer {
  private svg: SVGSVGElement;
  private mainGroup: SVGGElement;

  constructor(svg: SVGSVGElement) {
    this.svg = svg;
    this.mainGroup = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g"
    );
    this.svg.appendChild(this.mainGroup);
  }

  /**
   * Render entire diagram
   */
  public render(diagram: Diagram): void {
    // Clear existing content
    this.mainGroup.innerHTML = "";

    // Set SVG viewBox based on diagram bounds
    const bounds = diagram.scaleRectangle(diagram.boundingBox);
    this.svg.setAttribute(
      "viewBox",
      `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`
    );
    this.svg.setAttribute("width", bounds.width.toString());
    this.svg.setAttribute("height", bounds.height.toString());

    // Render each root element
    for (const root of diagram.rootElements) {
      this.renderItem(root);
    }
  }

  /**
   * Render a single diagram item
   */
  private renderItem(item: DiagramItem): void {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("data-item-id", item.id);
    group.setAttribute("class", "diagram-item");

    // Render children first (so they appear behind parent)
    if (item.showChildElements) {
      for (const child of item.childElements) {
        this.renderItem(child);
      }
      this.renderChildLines(item, group);
    }

    // Render the main shape
    this.renderShape(item, group);

    // Render text
    this.renderText(item, group);

    // Render documentation if present
    if (item.diagram?.showDocumentation && item.documentation) {
      this.renderDocumentation(item, group);
    }

    // Render occurrence text
    this.renderOccurrence(item, group);

    // Render expand button if has children
    if (item.hasChildElements) {
      this.renderExpandButton(item, group);
    }

    // Render reference arrow if needed
    if (item.isReference) {
      this.renderReferenceArrow(item, group);
    }

    this.mainGroup.appendChild(group);
  }

  /**
   * Render lines connecting parent to children
   */
  private renderChildLines(item: DiagramItem, group: SVGElement): void {
    if (item.childElements.length === 0) return;

    const foregroundPen = `stroke:${item.diagram?.style.lineColor};stroke-width:1;stroke-linecap:round`;
    const parentMidY = item.scaleInt(item.location.y + item.size.height / 2);

    if (item.childElements.length === 1) {
      // Single child - direct line
      const childMidY = item.scaleInt(
        item.childElements[0].location.y + item.childElements[0].size.height / 2
      );
      this.svgLine(
        group,
        foregroundPen,
        item.scaleInt(item.location.x + item.size.width),
        parentMidY,
        item.scaleInt(item.childElements[0].location.x),
        childMidY
      );
    } else {
      // Multiple children - vertical connector
      const firstChild = item.childElements[0];
      const lastChild = item.childElements[item.childElements.length - 1];
      const verticalLine = item.scaleInt(firstChild.boundingBox.x);

      // Draw individual child lines
      for (const child of item.childElements) {
        const childMidY = item.scaleInt(
          child.location.y + child.size.height / 2
        );
        this.svgLine(
          group,
          foregroundPen,
          verticalLine,
          childMidY,
          item.scaleInt(child.location.x),
          childMidY
        );
      }

      // Draw vertical connector
      const firstMidY = item.scaleInt(
        firstChild.location.y + firstChild.size.height / 2
      );
      const lastMidY = item.scaleInt(
        lastChild.location.y + lastChild.size.height / 2
      );
      this.svgLine(
        group,
        foregroundPen,
        verticalLine,
        firstMidY,
        verticalLine,
        lastMidY
      );

      // Connect to parent
      this.svgLine(
        group,
        foregroundPen,
        item.scaleInt(item.location.x + item.size.width),
        parentMidY,
        verticalLine,
        parentMidY
      );
    }
  }

  /**
   * Render the main shape based on item type
   */
  private renderShape(item: DiagramItem, group: SVGElement): void {
    const scaledBox = item.scaleRectangle(item.elementBox);
    const backgroundBrush = `fill:${item.diagram?.style.backgroundColor}`;
    const foregroundPen = `stroke:${item.diagram?.style.lineColor};stroke-width:1`;
    const dashed = item.minOccurrence === 0 ? "stroke-dasharray:4,1;" : "";

    switch (item.itemType) {
      case DiagramItemType.element:
        this.renderElementShape(
          scaledBox,
          backgroundBrush,
          foregroundPen + dashed,
          item,
          group
        );
        break;

      case DiagramItemType.group:
        this.renderGroupShape(
          scaledBox,
          backgroundBrush,
          foregroundPen + dashed,
          item,
          group
        );
        break;

      case DiagramItemType.type:
        this.renderTypeShape(
          scaledBox,
          backgroundBrush,
          foregroundPen + dashed,
          item,
          group
        );
        break;
    }
  }

  /**
   * Render element as rectangle
   */
  private renderElementShape(
    rect: Rectangle,
    fill: string,
    stroke: string,
    item: DiagramItem,
    group: SVGElement
  ): void {
    if (item.maxOccurrence !== 1) {
      // Multiple occurrences - draw shadow
      const shadowRect = { ...rect };
      shadowRect.x += 3;
      shadowRect.y += 3;
      this.svgRectangle(group, shadowRect, fill, stroke);
    }
    this.svgRectangle(group, rect, fill, stroke);
  }

  /**
   * Render group as diamond
   */
  private renderGroupShape(
    rect: Rectangle,
    fill: string,
    stroke: string,
    item: DiagramItem,
    group: SVGElement
  ): void {
    const bevel = Math.round(rect.height * 0.3);
    const points: Point[] = [
      { x: rect.x, y: rect.y + bevel },
      { x: rect.x + rect.width / 2, y: rect.y },
      { x: rect.x + rect.width, y: rect.y + bevel },
      { x: rect.x + rect.width, y: rect.y + rect.height - bevel },
      { x: rect.x + rect.width / 2, y: rect.y + rect.height },
      { x: rect.x, y: rect.y + rect.height - bevel },
    ];

    if (item.maxOccurrence !== 1) {
      // Multiple occurrences - draw shadow
      const shadowPoints = points.map((p) => ({ x: p.x + 3, y: p.y + 3 }));
      this.svgPolygon(group, shadowPoints, fill, stroke);
    }
    this.svgPolygon(group, points, fill, stroke);

    // Draw group type indicator
    this.renderGroupTypeIndicator(item, rect, group);
  }

  /**
   * Render type as beveled rectangle
   */
  private renderTypeShape(
    rect: Rectangle,
    fill: string,
    stroke: string,
    item: DiagramItem,
    group: SVGElement
  ): void {
    const bevel = Math.round(rect.height * 0.3);
    const points: Point[] = [
      { x: rect.x + bevel, y: rect.y },
      { x: rect.x + rect.width, y: rect.y },
      { x: rect.x + rect.width, y: rect.y + rect.height },
      { x: rect.x + bevel, y: rect.y + rect.height },
      { x: rect.x, y: rect.y + rect.height - bevel },
      { x: rect.x, y: rect.y + bevel },
    ];

    if (item.maxOccurrence !== 1) {
      // Multiple occurrences - draw shadow
      const shadowPoints = points.map((p) => ({ x: p.x + 3, y: p.y + 3 }));
      this.svgPolygon(group, shadowPoints, fill, stroke);
    }
    this.svgPolygon(group, points, fill, stroke);
  }

  /**
   * Render group type indicator (sequence/choice/all)
   */
  private renderGroupTypeIndicator(
    item: DiagramItem,
    rect: Rectangle,
    group: SVGElement
  ): void {
    const foregroundPen = `stroke:${item.diagram?.style.lineColor};stroke-width:1`;
    const foregroundBrush = `fill:${item.diagram?.style.foregroundColor}`;
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;

    switch (item.groupType) {
      case DiagramItemGroupType.Sequence:
        // Three dots in a row
        const dotSize = 3;
        const spacing = 6;
        for (let i = -1; i <= 1; i++) {
          this.svgCircle(
            group,
            centerX + i * spacing,
            centerY,
            dotSize,
            foregroundBrush
          );
        }
        break;

      case DiagramItemGroupType.Choice:
        // Lines forming a choice symbol
        const spread = 8;
        this.svgLine(
          group,
          foregroundPen,
          centerX - spread,
          centerY,
          centerX,
          centerY - spread
        );
        this.svgLine(
          group,
          foregroundPen,
          centerX - spread,
          centerY,
          centerX,
          centerY + spread
        );
        this.svgLine(
          group,
          foregroundPen,
          centerX,
          centerY - spread,
          centerX + spread,
          centerY
        );
        this.svgLine(
          group,
          foregroundPen,
          centerX,
          centerY + spread,
          centerX + spread,
          centerY
        );
        break;

      case DiagramItemGroupType.All:
        // Grid of dots
        const gridSpacing = 6;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            this.svgCircle(
              group,
              centerX + dx * gridSpacing,
              centerY + dy * gridSpacing,
              2,
              foregroundBrush
            );
          }
        }
        break;
    }
  }

  /**
   * Render text label
   */
  private renderText(item: DiagramItem, group: SVGElement): void {
    const scaledBox = item.scaleRectangle(item.elementBox);
    const centerX = scaledBox.x + scaledBox.width / 2;
    const centerY = scaledBox.y + scaledBox.height / 2;

    let displayText = item.name;
    if (item.diagram?.showType && item.type) {
      displayText += `: ${item.type}`;
    }

    this.svgText(
      group,
      displayText,
      centerX,
      centerY,
      `font-family:${item.diagram?.style.fontFamily};font-size:${item.diagram?.style.fontSize}pt;fill:${item.diagram?.style.foregroundColor};font-weight:bold;text-anchor:middle;dominant-baseline:central`
    );
  }

  /**
   * Render documentation
   */
  private renderDocumentation(item: DiagramItem, group: SVGElement): void {
    const scaledBox = item.scaleRectangle(item.documentationBox);
    if (scaledBox.width === 0 || scaledBox.height === 0) return;

    // Simple documentation rendering - just show first line
    const lines = item.documentation.split("\n").slice(0, 3);
    const lineHeight = item.diagram?.style.documentationFontSize || 9;

    for (let i = 0; i < lines.length; i++) {
      const text = lines[i].substring(0, 50); // Truncate long lines
      this.svgText(
        group,
        text,
        scaledBox.x + 5,
        scaledBox.y + lineHeight + i * lineHeight,
        `font-family:${item.diagram?.style.fontFamily};font-size:${lineHeight}pt;fill:${item.diagram?.style.foregroundColor};text-anchor:start`
      );
    }
  }

  /**
   * Render occurrence constraint text
   */
  private renderOccurrence(item: DiagramItem, group: SVGElement): void {
    if (
      !item.diagram?.alwaysShowOccurence &&
      item.maxOccurrence <= 1 &&
      item.minOccurrence === 1
    ) {
      return;
    }

    const maxOccurText =
      item.maxOccurrence === -1 ? "∞" : item.maxOccurrence.toString();
    const occurText = `${item.minOccurrence}..${maxOccurText}`;
    const scaledBox = item.scaleRectangle(item.elementBox);

    this.svgText(
      group,
      occurText,
      scaledBox.x + scaledBox.width + 5,
      scaledBox.y + scaledBox.height - 5,
      `font-family:${item.diagram?.style.fontFamily};font-size:${item.diagram?.style.smallFontSize}pt;fill:${item.diagram?.style.foregroundColor};text-anchor:start`
    );
  }

  /**
   * Render expand/collapse button
   */
  private renderExpandButton(item: DiagramItem, group: SVGElement): void {
    const scaledBox = item.scaleRectangle(item.childExpandButtonBox);
    const foregroundPen = `stroke:${item.diagram?.style.lineColor};stroke-width:1`;
    const backgroundBrush = `fill:${item.diagram?.style.backgroundColor}`;

    this.svgRectangle(group, scaledBox, backgroundBrush, foregroundPen);

    // Draw + or - sign
    const centerX = scaledBox.x + scaledBox.width / 2;
    const centerY = scaledBox.y + scaledBox.height / 2;
    const size = 4;

    // Horizontal line
    this.svgLine(
      group,
      foregroundPen,
      centerX - size,
      centerY,
      centerX + size,
      centerY
    );

    if (!item.showChildElements) {
      // Vertical line for +
      this.svgLine(
        group,
        foregroundPen,
        centerX,
        centerY - size,
        centerX,
        centerY + size
      );
    }

    // Make button clickable
    const button = group.lastChild as SVGElement;
    if (button) {
      button.setAttribute("class", "expand-button");
      button.setAttribute("cursor", "pointer");
    }
  }

  /**
   * Render reference arrow
   */
  private renderReferenceArrow(item: DiagramItem, group: SVGElement): void {
    const scaledBox = item.scaleRectangle(item.elementBox);
    const arrowPen = `stroke:${item.diagram?.style.lineColor};stroke-width:2`;
    const baseX = scaledBox.x + 1;
    const baseY = scaledBox.y + scaledBox.height - 1;
    const targetX = baseX + 3;
    const targetY = baseY - 3;

    this.svgLine(group, arrowPen, baseX, baseY, targetX, targetY);

    // Arrow head
    const points: Point[] = [
      { x: targetX, y: targetY },
      { x: targetX + 2, y: targetY + 2 },
      { x: targetX + 3, y: targetY - 3 },
      { x: targetX - 2, y: targetY - 2 },
    ];
    this.svgPolygon(
      group,
      points,
      `fill:${item.diagram?.style.foregroundColor}`,
      ""
    );
  }

  // SVG Helper methods

  private svgLine(
    group: SVGElement,
    style: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): void {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1.toString());
    line.setAttribute("y1", y1.toString());
    line.setAttribute("x2", x2.toString());
    line.setAttribute("y2", y2.toString());
    line.setAttribute("style", style);
    group.appendChild(line);
  }

  private svgRectangle(
    group: SVGElement,
    rect: Rectangle,
    fill: string,
    stroke: string
  ): void {
    const rectangle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    rectangle.setAttribute("x", rect.x.toString());
    rectangle.setAttribute("y", rect.y.toString());
    rectangle.setAttribute("width", rect.width.toString());
    rectangle.setAttribute("height", rect.height.toString());
    rectangle.setAttribute("style", `${fill};${stroke}`);
    group.appendChild(rectangle);
  }

  private svgPolygon(
    group: SVGElement,
    points: Point[],
    fill: string,
    stroke: string
  ): void {
    const polygon = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "polygon"
    );
    const pointsStr = points.map((p) => `${p.x},${p.y}`).join(" ");
    polygon.setAttribute("points", pointsStr);
    polygon.setAttribute("style", `${fill};${stroke}`);
    group.appendChild(polygon);
  }

  private svgCircle(
    group: SVGElement,
    cx: number,
    cy: number,
    r: number,
    fill: string
  ): void {
    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    circle.setAttribute("cx", cx.toString());
    circle.setAttribute("cy", cy.toString());
    circle.setAttribute("r", r.toString());
    circle.setAttribute("style", fill);
    group.appendChild(circle);
  }

  private svgText(
    group: SVGElement,
    text: string,
    x: number,
    y: number,
    style: string
  ): void {
    const textElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    textElement.setAttribute("x", x.toString());
    textElement.setAttribute("y", y.toString());
    textElement.setAttribute("style", style);
    textElement.textContent = text;
    group.appendChild(textElement);
  }
}
