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
 * Render a group as a diamond shape with optional shadow for multiple occurrences
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
    { x: rect.x, y: rect.y + bevel },
    { x: rect.x + rect.width / 2, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + bevel },
    { x: rect.x + rect.width, y: rect.y + rect.height - bevel },
    { x: rect.x + rect.width / 2, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height - bevel },
  ];

  if (item.maxOccurrence !== 1) {
    // Multiple occurrences - draw shadow
    const shadowPoints = points.map((p) => ({ x: p.x + SHADOW_OFFSET, y: p.y + SHADOW_OFFSET }));
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
    const shadowPoints = points.map((p) => ({ x: p.x + SHADOW_OFFSET, y: p.y + SHADOW_OFFSET }));
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
      // Three dots in a row
      const dotSize = 3;
      const spacing = 6;
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
      // Lines forming a choice symbol
      const spread = 8;
      svgLine(
        group,
        foregroundPen,
        centerX - spread,
        centerY,
        centerX,
        centerY - spread
      );
      svgLine(
        group,
        foregroundPen,
        centerX - spread,
        centerY,
        centerX,
        centerY + spread
      );
      svgLine(
        group,
        foregroundPen,
        centerX,
        centerY - spread,
        centerX + spread,
        centerY
      );
      svgLine(
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
          svgCircle(
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
