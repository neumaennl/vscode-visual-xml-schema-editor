/**
 * DiagramLayout calculates positions and sizes for diagram items
 * Ported and adapted from XSD Diagram project
 */

import { Diagram } from "./Diagram";
import { DiagramItem } from "./DiagramItem";
import { DiagramItemType, Rectangle, Size } from "./DiagramTypes";

export class DiagramLayout {
  // Default dimensions
  private readonly ELEMENT_WIDTH = 120;
  private readonly ELEMENT_HEIGHT = 40;
  private readonly GROUP_WIDTH = 40;
  private readonly GROUP_HEIGHT = 40;
  private readonly HORIZONTAL_SPACING = 40;
  private readonly VERTICAL_SPACING = 20;
  private readonly EXPAND_BUTTON_SIZE = 12;
  private readonly DOCUMENTATION_MAX_WIDTH = 200;

  /**
   * Calculate layout for entire diagram
   */
  public layout(diagram: Diagram): void {
    // Layout each root element
    let currentY = 0;
    for (const root of diagram.rootElements) {
      root.location = { x: 0, y: currentY };
      this.layoutItem(root);
      currentY += root.boundingBox.height + this.VERTICAL_SPACING;
    }

    // Calculate overall bounding box
    diagram.calculateBoundingBox();
  }

  /**
   * Layout a single diagram item and its children
   */
  private layoutItem(item: DiagramItem): void {
    // Calculate size based on item type
    this.calculateSize(item);

    // Calculate element box (main shape)
    item.elementBox = {
      x: item.location.x,
      y: item.location.y,
      width: item.size.width,
      height: item.size.height,
    };

    // Add expand button if item has children
    if (item.hasChildElements) {
      item.childExpandButtonBox = {
        x: item.location.x + item.size.width + 5,
        y: item.location.y + item.size.height / 2 - this.EXPAND_BUTTON_SIZE / 2,
        width: this.EXPAND_BUTTON_SIZE,
        height: this.EXPAND_BUTTON_SIZE,
      };
    }

    // Layout children if expanded
    if (item.showChildElements && item.childElements.length > 0) {
      this.layoutChildren(item);
    }

    // Add documentation box if needed
    if (item.diagram?.showDocumentation && item.documentation) {
      this.calculateDocumentationBox(item);
    }

    // Calculate overall bounding box
    item.calculateBoundingBox();
  }

  /**
   * Calculate size of item based on type and content
   */
  private calculateSize(item: DiagramItem): void {
    switch (item.itemType) {
      case DiagramItemType.element:
      case DiagramItemType.type:
        item.size = {
          width: this.ELEMENT_WIDTH,
          height: this.ELEMENT_HEIGHT,
        };
        break;

      case DiagramItemType.group:
        item.size = {
          width: this.GROUP_WIDTH,
          height: this.GROUP_HEIGHT,
        };
        break;

      case DiagramItemType.reference:
        item.size = {
          width: this.ELEMENT_WIDTH,
          height: this.ELEMENT_HEIGHT,
        };
        break;

      default:
        item.size = {
          width: this.ELEMENT_WIDTH,
          height: this.ELEMENT_HEIGHT,
        };
    }
  }

  /**
   * Layout children of an item
   */
  private layoutChildren(parent: DiagramItem): void {
    let currentY = parent.location.y;
    // Position children relative to parent's width + expand button + spacing
    // Expand button: 5px gap + 12px button + 5px gap = 22px
    // Use single spacing for one child (no vertical line), double spacing for multiple (with vertical line)
    const horizontalSpacing = parent.childElements.length === 1 
      ? this.HORIZONTAL_SPACING 
      : this.HORIZONTAL_SPACING * 2;
    const startX = parent.location.x + parent.size.width + 22 + horizontalSpacing;

    // Layout each child
    for (const child of parent.childElements) {
      child.location = { x: startX, y: currentY };
      this.layoutItem(child);
      currentY += child.boundingBox.height + this.VERTICAL_SPACING;
    }
  }

  /**
   * Calculate documentation box size and position
   */
  private calculateDocumentationBox(item: DiagramItem): void {
    if (!item.documentation) {
      item.documentationBox = { x: 0, y: 0, width: 0, height: 0 };
      return;
    }

    // Estimate documentation height based on text length
    // Simple estimation: 15 chars per line, 12 pixels per line
    const charsPerLine = 30;
    const lineHeight = 12;
    const lines = Math.ceil(item.documentation.length / charsPerLine);
    const height = Math.min(lines * lineHeight + 10, 100); // Max 100px

    item.documentationBox = {
      x: item.location.x,
      y: item.location.y + item.size.height + 5,
      width: this.DOCUMENTATION_MAX_WIDTH,
      height: height,
    };
  }

  /**
   * Recalculate layout when an item is expanded or collapsed
   */
  public relayoutItem(item: DiagramItem): void {
    this.layoutItem(item);

    // Also need to relayout parent to adjust spacing
    let current = item.parent;
    while (current) {
      current.calculateBoundingBox();
      current = current.parent;
    }

    // Recalculate diagram bounding box
    if (item.diagram) {
      item.diagram.calculateBoundingBox();
    }
  }
}
