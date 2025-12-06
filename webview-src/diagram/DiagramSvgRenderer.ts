/**
 * DiagramSvgRenderer renders diagram items to SVG
 * Ported from XSD Diagram project (DiagramSvgRenderer.cs)
 */

import { Diagram } from "./Diagram";
import { DiagramItem } from "./DiagramItem";
import {
  DiagramItemType,
  Point,
} from "./DiagramTypes";
import {
  svgLine,
  svgRectangle,
  svgPolygon,
} from "./SvgHelpers";
import {
  renderElementShape,
  renderGroupShape,
  renderTypeShape,
} from "./ShapeRenderers";
import {
  renderText,
  renderDocumentation,
  renderOccurrence,
} from "./TextRenderers";

export class DiagramSvgRenderer {
  private svg: SVGSVGElement;
  private mainGroup: SVGGElement;
  private contentGroup: SVGGElement;

  /**
   * Create a new DiagramSvgRenderer
   * @param svg - The SVG element to render into
   * @param containerGroup - Optional existing container group, or create a new one
   */
  constructor(svg: SVGSVGElement, containerGroup?: SVGGElement) {
    this.svg = svg;
    // Use provided container group or create our own
    this.mainGroup =
      containerGroup ||
      document.createElementNS("http://www.w3.org/2000/svg", "g");
    if (!containerGroup) {
      this.svg.appendChild(this.mainGroup);
    }
    // Create a content group for actual diagram items
    this.contentGroup = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g"
    );
    this.mainGroup.appendChild(this.contentGroup);
  }

  /**
   * Render the entire diagram to SVG
   * @param diagram - The diagram to render
   */
  public render(diagram: Diagram): void {
    // Clear existing content
    this.contentGroup.innerHTML = "";

    console.log("Rendering diagram:", diagram);

    // Don't set viewBox - let the SVG fill the container and use transform for pan/zoom
    // Remove any previously set viewBox
    this.svg.removeAttribute("viewBox");

    // Render each root element
    for (const root of diagram.rootElements) {
      this.renderItem(root);
    }
  }

  /**
   * Render a single diagram item and all its children recursively
   * @param item - The diagram item to render
   */
  private renderItem(item: DiagramItem): void {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("data-item-id", item.id);
    group.setAttribute("class", "diagram-item");

    // Add tooltip for group items (sequence, choice, all)
    if (item.itemType === DiagramItemType.group) {
      const title = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "title"
      );
      title.textContent = item.name;
      group.appendChild(title);
    }

    // Render children first (so they appear behind parent)
    if (item.showChildElements) {
      for (const child of item.childElements) {
        this.renderItem(child);
      }
      this.renderChildLines(item, group);
    }

    // Render the main shape
    this.renderShape(item, group);

    // Render text (skip for group items - they only show the symbol)
    if (item.itemType !== DiagramItemType.group) {
      renderText(item, group, this.svg);
    }

    // Render documentation if present
    if (item.diagram?.showDocumentation && item.documentation) {
      renderDocumentation(item, group);
    }

    // Render occurrence text
    renderOccurrence(item, group);

    // Render expand button if has children
    if (item.hasChildElements) {
      this.renderExpandButton(item, group);
    }

    // Render reference arrow if needed
    if (item.isReference) {
      this.renderReferenceArrow(item, group);
    }

    this.contentGroup.appendChild(group);
  }

  /**
   * Render connector lines from parent item to its child elements
   * @param item - The parent diagram item
   * @param group - The SVG group to append lines to
   */
  private renderChildLines(item: DiagramItem, group: SVGElement): void {
    if (item.childElements.length === 0) return;

    const foregroundPen = `stroke:${item.diagram?.style.lineColor};stroke-width:1;stroke-linecap:round`;
    const parentMidY = item.scaleInt(item.location.y + item.size.height / 2);
    
    // Calculate where the horizontal line from parent should start (after expand button)
    // Expand button is at parent.x + parent.width + 5, with width 12, plus 5px spacing = +22
    const expandButtonOffset = 22;

    if (item.childElements.length === 1) {
      // Single child - direct line
      const child = item.childElements[0];
      const childMidY = item.scaleInt(child.location.y + child.size.height / 2);

      const parentLineStartX = item.scaleInt(
        item.location.x + item.size.width + expandButtonOffset
      );

      // Horizontal line from parent (starting after expand button)
      const midPointX =
        parentLineStartX +
        (item.scaleInt(child.location.x) - parentLineStartX) / 2;

      svgLine(
        group,
        foregroundPen,
        parentLineStartX,
        parentMidY,
        midPointX,
        parentMidY
      );

      // Vertical line
      svgLine(
        group,
        foregroundPen,
        midPointX,
        parentMidY,
        midPointX,
        childMidY
      );

      // Horizontal line to child
      svgLine(
        group,
        foregroundPen,
        midPointX,
        childMidY,
        item.scaleInt(child.location.x),
        childMidY
      );
    } else {
      // Multiple children - vertical connector with horizontal connectors to each child
      const firstChild = item.childElements[0];
      const lastChild = item.childElements[item.childElements.length - 1];

      const parentLineStartX = item.scaleInt(
        item.location.x + item.size.width + expandButtonOffset
      );

      // Position vertical line midway between parent button and children
      const childStartX = item.scaleInt(firstChild.location.x);
      const verticalLineX = Math.floor((parentLineStartX + childStartX) / 2);

      // Draw horizontal connectors from vertical line to each child
      for (const child of item.childElements) {
        const childMidY = item.scaleInt(
          child.location.y + child.size.height / 2
        );
        svgLine(
          group,
          foregroundPen,
          verticalLineX,
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
      svgLine(
        group,
        foregroundPen,
        verticalLineX,
        firstMidY,
        verticalLineX,
        lastMidY
      );

      // Connect to parent (starting after expand button)
      svgLine(
        group,
        foregroundPen,
        parentLineStartX,
        parentMidY,
        verticalLineX,
        parentMidY
      );
    }
  }

  /**
   * Render the main shape based on item type
   * @param item - The diagram item to render
   * @param group - The SVG group to append shape to
   */
  private renderShape(item: DiagramItem, group: SVGElement): void {
    const scaledBox = item.scaleRectangle(item.elementBox);
    // Use semi-transparent background so it works with any theme
    const backgroundBrush = `fill:${item.diagram?.style.backgroundColor}`;
    const foregroundPen = `stroke:${item.diagram?.style.lineColor};stroke-width:2`;
      const dashed = item.minOccurrence === 0 ? ";stroke-dasharray:5,3" : "";

    switch (item.itemType) {
      case DiagramItemType.element:
        renderElementShape(
          scaledBox,
          backgroundBrush,
          foregroundPen + dashed,
          item,
          group
        );
        break;

      case DiagramItemType.group:
        renderGroupShape(
          scaledBox,
          backgroundBrush,
          foregroundPen + dashed,
          item,
          group
        );
        break;

      case DiagramItemType.type:
        renderTypeShape(
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
   * Render expand/collapse button for items with children
   * @param item - The diagram item with children
   * @param group - The SVG group to append button to
   */
  private renderExpandButton(item: DiagramItem, group: SVGElement): void {
    const scaledBox = item.scaleRectangle(item.childExpandButtonBox);
    const foregroundPen = `stroke:${item.diagram?.style.lineColor};stroke-width:1`;
    const backgroundBrush = `fill:${item.diagram?.style.backgroundColor}`;

    // Create a dedicated group for the button
    const buttonGroup = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g"
    );
    buttonGroup.setAttribute("class", "expand-button");
    buttonGroup.setAttribute("cursor", "pointer");

    svgRectangle(buttonGroup, scaledBox, backgroundBrush, foregroundPen);

    // Draw + or - sign
    const centerX = scaledBox.x + scaledBox.width / 2;
    const centerY = scaledBox.y + scaledBox.height / 2;
    const size = 4;

    // Horizontal line
    svgLine(
      buttonGroup,
      foregroundPen,
      centerX - size,
      centerY,
      centerX + size,
      centerY
    );

    if (!item.showChildElements) {
      // Vertical line for +
      svgLine(
        buttonGroup,
        foregroundPen,
        centerX,
        centerY - size,
        centerX,
        centerY + size
      );
    }

    group.appendChild(buttonGroup);
  }

  /**
   * Render reference arrow indicating item references another definition
   * @param item - The diagram item with a reference
   * @param group - The SVG group to append arrow to
   */
  private renderReferenceArrow(item: DiagramItem, group: SVGElement): void {
    const scaledBox = item.scaleRectangle(item.elementBox);
    const arrowPen = `stroke:${item.diagram?.style.lineColor};stroke-width:2`;
    const baseX = scaledBox.x + 1;
    const baseY = scaledBox.y + scaledBox.height - 1;
    const targetX = baseX + 3;
    const targetY = baseY - 3;

    svgLine(group, arrowPen, baseX, baseY, targetX, targetY);

    // Arrow head
    const points: Point[] = [
      { x: targetX, y: targetY },
      { x: targetX + 2, y: targetY + 2 },
      { x: targetX + 3, y: targetY - 3 },
      { x: targetX - 2, y: targetY - 2 },
    ];
    svgPolygon(
      group,
      points,
      `fill:${item.diagram?.style.foregroundColor}`,
      ""
    );
  }
}
