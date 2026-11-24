/**
 * `DiagramSvgRenderer` renders diagram items to SVG
 * Ported from XSD Diagram project (`DiagramSvgRenderer.cs`)
 */

import type { Diagram } from "./Diagram";
import type { DiagramItem } from "./DiagramItem";
import { DiagramItemType } from "./DiagramTypes";
import { isCompositorGroup } from "./groupUtils";
import { getMinOccurs, isReference } from "./schemaAccessors";
import { getDocumentation } from "./documentationAccessors";
import { svgLine, svgRectangle } from "./SvgHelpers";
import {
  REFERENCE_ARROW_WIDTH,
  renderElementShape,
  renderGroupShape,
  renderReferenceArrow,
  renderTypeShape,
} from "./ShapeRenderers";
import { renderText, renderDocumentation, renderOccurrence } from "./TextRenderers";

/**
 * Draws diagram items into an SVG element: shapes, texts, documentation, occurrences, expand buttons
 * and the lines between parents and children.
 */
export class DiagramSvgRenderer {
  private svg: SVGSVGElement;
  private mainGroup: SVGGElement;
  private contentGroup: SVGGElement;

  /**
   * Create a new `DiagramSvgRenderer`
   * @param svg - The SVG element to render into
   * @param containerGroup - Optional existing container group, or create a new one
   */
  constructor(svg: SVGSVGElement, containerGroup?: SVGGElement) {
    this.svg = svg;
    // Use provided container group or create our own
    this.mainGroup = containerGroup ?? document.createElementNS("http://www.w3.org/2000/svg", "g");
    if (!containerGroup) {
      this.svg.appendChild(this.mainGroup);
    }
    // Create a content group for actual diagram items
    this.contentGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
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
      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = item.label;
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

    // Render the reference arrow, which the label leaves room for
    const reference = isReference(item);
    if (reference) {
      renderReferenceArrow(item.elementBox, item, group);
    }

    // Render text for non-group items and named groups (skip compositor symbols only)
    if (item.itemType !== DiagramItemType.group || !isCompositorGroup(item)) {
      renderText(item, group, this.svg, reference ? REFERENCE_ARROW_WIDTH : 0);
    }

    // Render documentation if present
    if (item.diagram.showDocumentation && getDocumentation(item)) {
      renderDocumentation(item, group);
    }

    // Render occurrence text
    renderOccurrence(item, group);

    // Render expand button if has children
    if (item.hasChildElements) {
      this.renderExpandButton(item, group);
    }

    this.contentGroup.appendChild(group);
  }

  /**
   * Render connector lines from parent item to its child elements
   * @param item - The parent diagram item
   * @param group - The SVG group to append lines to
   */
  private renderChildLines(item: DiagramItem, group: SVGElement): void {
    const firstChild = item.childElements[0];
    const lastChild = item.childElements.at(-1);
    if (!firstChild || !lastChild) return;

    const foregroundPen = `stroke:${item.getStyle().lineColor};stroke-width:1;stroke-linecap:round`;
    const parentMidY = item.location.y + item.size.height / 2;

    // Calculate where the horizontal line from parent should start (after expand button)
    // Expand button is at parent.x + parent.width + 5, with width 12, plus 5px spacing = +22
    const expandButtonOffset = 22;

    if (firstChild === lastChild) {
      // Single child - direct line
      const child = firstChild;
      const childMidY = child.location.y + child.size.height / 2;

      const parentLineStartX = item.location.x + item.size.width + expandButtonOffset;

      // Horizontal line from parent (starting after expand button)
      const midPointX = parentLineStartX + (child.location.x - parentLineStartX) / 2;

      svgLine(group, foregroundPen, parentLineStartX, parentMidY, midPointX, parentMidY);

      // Vertical line
      svgLine(group, foregroundPen, midPointX, parentMidY, midPointX, childMidY);

      // Horizontal line to child
      svgLine(group, foregroundPen, midPointX, childMidY, child.location.x, childMidY);
    } else {
      // Multiple children - vertical connector with horizontal connectors to each child
      const parentLineStartX = item.location.x + item.size.width + expandButtonOffset;

      // Position vertical line midway between parent button and children
      const childStartX = firstChild.location.x;
      const verticalLineX = (parentLineStartX + childStartX) / 2;

      // Draw horizontal connectors from vertical line to each child
      for (const child of item.childElements) {
        const childMidY = child.location.y + child.size.height / 2;
        svgLine(group, foregroundPen, verticalLineX, childMidY, child.location.x, childMidY);
      }

      // Draw vertical connector
      const firstMidY = firstChild.location.y + firstChild.size.height / 2;
      const lastMidY = lastChild.location.y + lastChild.size.height / 2;
      svgLine(group, foregroundPen, verticalLineX, firstMidY, verticalLineX, lastMidY);

      // Connect to parent (starting after expand button)
      svgLine(group, foregroundPen, parentLineStartX, parentMidY, verticalLineX, parentMidY);
    }
  }

  /**
   * Render the main shape based on item type
   * @param item - The diagram item to render
   * @param group - The SVG group to append shape to
   */
  private renderShape(item: DiagramItem, group: SVGElement): void {
    const box = item.elementBox;
    // Use semi-transparent background so it works with any theme
    const backgroundBrush = `fill:${item.getStyle().backgroundColor}`;
    const foregroundPen = `stroke:${item.getStyle().lineColor};stroke-width:2`;
    const dashed = getMinOccurs(item) === 0 ? ";stroke-dasharray:5,3" : "";

    switch (item.itemType) {
      case DiagramItemType.element:
        renderElementShape(box, backgroundBrush, foregroundPen + dashed, item, group);
        break;

      case DiagramItemType.group:
        renderGroupShape(box, backgroundBrush, foregroundPen + dashed, item, group);
        break;

      case DiagramItemType.type:
        renderTypeShape(box, backgroundBrush, foregroundPen + dashed, item, group);
        break;
    }
  }

  /**
   * Render expand/collapse button for items with children
   * @param item - The diagram item with children
   * @param group - The SVG group to append button to
   */
  private renderExpandButton(item: DiagramItem, group: SVGElement): void {
    const box = item.childExpandButtonBox;
    const foregroundPen = `stroke:${item.getStyle().lineColor};stroke-width:1`;
    const backgroundBrush = `fill:${item.getStyle().backgroundColor}`;

    // Create a dedicated group for the button
    const buttonGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    buttonGroup.setAttribute("class", "expand-button");
    buttonGroup.setAttribute("cursor", "pointer");

    svgRectangle(buttonGroup, box, backgroundBrush, foregroundPen);

    // Draw + or - sign
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const size = 4;

    // Horizontal line
    svgLine(buttonGroup, foregroundPen, centerX - size, centerY, centerX + size, centerY);

    if (!item.showChildElements) {
      // Vertical line for +
      svgLine(buttonGroup, foregroundPen, centerX, centerY - size, centerX, centerY + size);
    }

    group.appendChild(buttonGroup);
  }
}
