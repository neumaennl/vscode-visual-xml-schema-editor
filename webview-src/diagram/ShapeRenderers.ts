/**
 * ShapeRenderers provides methods for rendering different diagram item shapes
 * Extracted from DiagramSvgRenderer to reduce file size
 */

import { DiagramItem } from "./DiagramItem";
import { DiagramItemGroupType, Point, Rectangle } from "./DiagramTypes";
import { svgRectangle, svgPolygon, svgCircle, svgLine } from "./SvgHelpers";

/** Offset for shadow effect on multiple occurrence shapes */
const SHADOW_OFFSET = 3;

/**
 * Render an element as a rectangle with optional shadow for multiple occurrences
 * @param rect - Rectangle dimensions and position
 * @param fill - Fill style string
 * @param stroke - Stroke style string
 * @param item - Diagram item being rendered
 * @param group - Parent SVG group element
 */
export function renderElementShape(
  rect: Rectangle,
  fill: string,
  stroke: string,
  item: DiagramItem,
  group: SVGElement
): void {
  if (item.maxOccurrence !== 1) {
    // Multiple occurrences - draw shadow
    const shadowRect = { ...rect };
    shadowRect.x += SHADOW_OFFSET;
    shadowRect.y += SHADOW_OFFSET;
    svgRectangle(group, shadowRect, fill, stroke);
  }
  svgRectangle(group, rect, fill, stroke);
}

/**
 * Render a group as an octagon shape with optional shadow for multiple occurrences
 * @param rect - Rectangle dimensions and position
 * @param fill - Fill style string
 * @param stroke - Stroke style string
 * @param item - Diagram item being rendered
 * @param group - Parent SVG group element
 */
export function renderGroupShape(
  rect: Rectangle,
  fill: string,
  stroke: string,
  item: DiagramItem,
  group: SVGElement
): void {
  const bevel = Math.round(rect.height * 0.3);
  const points: Point[] = [
    { x: rect.x + bevel, y: rect.y },
    { x: rect.x + rect.width - bevel, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + bevel },
    { x: rect.x + rect.width, y: rect.y + rect.height - bevel },
    { x: rect.x + rect.width - bevel, y: rect.y + rect.height },
    { x: rect.x + bevel, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height - bevel },
    { x: rect.x, y: rect.y + bevel },
  ];

  if (item.maxOccurrence !== 1) {
    // Multiple occurrences - draw shadow
    const shadowPoints = points.map((p) => ({
      x: p.x + SHADOW_OFFSET,
      y: p.y + SHADOW_OFFSET,
    }));
    svgPolygon(group, shadowPoints, fill, stroke);
  }
  svgPolygon(group, points, fill, stroke);

  // Draw group type indicator
  renderGroupTypeIndicator(item, rect, group);
}

/**
 * Render a type as a beveled rectangle with optional shadow for multiple occurrences
 * @param rect - Rectangle dimensions and position
 * @param fill - Fill style string
 * @param stroke - Stroke style string
 * @param item - Diagram item being rendered
 * @param group - Parent SVG group element
 */
export function renderTypeShape(
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
    const shadowPoints = points.map((p) => ({
      x: p.x + SHADOW_OFFSET,
      y: p.y + SHADOW_OFFSET,
    }));
    svgPolygon(group, shadowPoints, fill, stroke);
  }
  svgPolygon(group, points, fill, stroke);
}

/**
 * Render a group type indicator symbol (sequence/choice/all) inside the group shape
 * @param item - Diagram item with group type information
 * @param rect - Rectangle dimensions and position
 * @param group - Parent SVG group element
 */
export function renderGroupTypeIndicator(
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
      // Three dots in a row with horizontal line
      const dotSize = 2;
      const spacing = dotSize * 3;
      // Draw horizontal line
      svgLine(
        group,
        foregroundPen,
        centerX - spacing * 2,
        centerY,
        centerX + spacing * 2,
        centerY
      );
      // Draw dots
      for (let i = -1; i <= 1; i++) {
        svgCircle(
          group,
          centerX + i * spacing,
          centerY,
          dotSize,
          foregroundBrush
        );
      }
      break;

    case DiagramItemGroupType.Choice:
      // Choice indicator with lines and three dots
      const yMiddle = centerY;
      const yUp = yMiddle - 4;
      const yDown = yMiddle + 4;
      const xMiddle = centerX;
      const xLeft2 = xMiddle - 4;
      const xLeft1 = xLeft2 - 4;
      const xLeft0 = xLeft1 - 4;
      const xRight0 = xMiddle + 4;
      const xRight1 = xRight0 + 4;
      const xRight2 = xRight1 + 4;

      // Left side lines
      svgLine(group, foregroundPen, xLeft0, yMiddle, xLeft1, yMiddle);
      svgLine(group, foregroundPen, xLeft1, yMiddle, xLeft2, yUp);

      // Right side lines
      svgLine(group, foregroundPen, xRight0, yUp, xRight1, yUp);
      svgLine(group, foregroundPen, xRight0, yMiddle, xRight2, yMiddle);
      svgLine(group, foregroundPen, xRight0, yDown, xRight1, yDown);
      svgLine(group, foregroundPen, xRight1, yUp, xRight1, yDown);

      // Three dots
      const choiceDotSize = 2;
      svgCircle(group, xMiddle, yUp, choiceDotSize, foregroundBrush);
      svgCircle(group, xMiddle, yMiddle, choiceDotSize, foregroundBrush);
      svgCircle(group, xMiddle, yDown, choiceDotSize, foregroundBrush);
      break;

    case DiagramItemGroupType.All:
      // All indicator with lines and three dots (similar to choice but with different line pattern)
      const allYMiddle = centerY;
      const allYUp = allYMiddle - 4;
      const allYDown = allYMiddle + 4;
      const allXMiddle = centerX;
      const allXLeft2 = allXMiddle - 4;
      const allXLeft1 = allXLeft2 - 4;
      const allXLeft0 = allXLeft1 - 4;
      const allXRight0 = allXMiddle + 4;
      const allXRight1 = allXRight0 + 4;
      const allXRight2 = allXRight1 + 4;

      // Left side lines
      svgLine(group, foregroundPen, allXLeft2, allYUp, allXLeft1, allYUp);
      svgLine(
        group,
        foregroundPen,
        allXLeft2,
        allYMiddle,
        allXLeft0,
        allYMiddle
      );
      svgLine(group, foregroundPen, allXLeft2, allYDown, allXLeft1, allYDown);
      svgLine(group, foregroundPen, allXLeft1, allYUp, allXLeft1, allYDown);

      // Right side lines
      svgLine(group, foregroundPen, allXRight0, allYUp, allXRight1, allYUp);
      svgLine(
        group,
        foregroundPen,
        allXRight0,
        allYMiddle,
        allXRight2,
        allYMiddle
      );
      svgLine(group, foregroundPen, allXRight0, allYDown, allXRight1, allYDown);
      svgLine(group, foregroundPen, allXRight1, allYUp, allXRight1, allYDown);

      // Three dots
      const allDotSize = 2;
      svgCircle(group, allXMiddle, allYUp, allDotSize, foregroundBrush);
      svgCircle(group, allXMiddle, allYMiddle, allDotSize, foregroundBrush);
      svgCircle(group, allXMiddle, allYDown, allDotSize, foregroundBrush);
      break;
  }
}
