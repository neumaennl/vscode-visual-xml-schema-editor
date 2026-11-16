/**
 * `ShapeRenderers` provides methods for rendering different diagram item shapes
 * Extracted from `DiagramSvgRenderer` to reduce file size
 */

import type { DiagramItem } from "./DiagramItem";
import type { Point, Rectangle } from "./DiagramTypes";
import { DiagramItemGroupType } from "./DiagramTypes";
import { svgRectangle, svgPolygon, svgCircle, svgLine } from "./SvgHelpers";
import { isCompositorGroup } from "./groupUtils";

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
  const points = beveledRectangle(rect, Math.round(rect.height * 0.3), true);
  renderPolygonWithShadow(group, points, fill, stroke, item);

  // Draw group type indicator only for compositor groups (sequence/choice/all)
  if (isCompositorGroup(item)) {
    renderGroupTypeIndicator(item, rect, group);
  }
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
  const bevel = Math.round(rect.height * 0.2);
  const points = beveledRectangle(rect, bevel, false);
  renderPolygonWithShadow(group, points, fill, stroke, item);

  // For simple types, fill the beveled area with the stroke color
  if (item.isSimpleContent) {
    const bevelFillPoints: Point[] = [
      { x: rect.x, y: rect.y + bevel },
      { x: rect.x + bevel, y: rect.y },
      { x: rect.x + bevel, y: rect.y + rect.height },
      { x: rect.x, y: rect.y + rect.height - bevel },
    ];
    // Extract stroke color from stroke style string
    const strokeColor = stroke.replace(/^stroke:/, "").split(";")[0];
    svgPolygon(group, bevelFillPoints, `fill:${strokeColor}`, "stroke:none");
  }
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
  const foregroundPen = `stroke:${item.getStyle().lineColor};stroke-width:1`;
  const foregroundBrush = `fill:${item.getStyle().foregroundColor}`;
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  switch (item.groupType) {
    case DiagramItemGroupType.Sequence: {
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
    }

    case DiagramItemGroupType.Choice:
      // Choice indicator: a bent line on the left, the dots and a fork on the right
      renderForkIndicator(group, foregroundPen, foregroundBrush, centerX, centerY, "choice");
      break;

    case DiagramItemGroupType.All:
      // All indicator: the dots between two forks
      renderForkIndicator(group, foregroundPen, foregroundBrush, centerX, centerY, "all");
      break;
  }
}

/**
 * Draws a polygon, with a shadow behind it if the item can occur more than once.
 *
 * @param group - Parent SVG group element
 * @param points - The corners of the polygon
 * @param fill - Fill style string
 * @param stroke - Stroke style string
 * @param item - Diagram item being rendered
 */
function renderPolygonWithShadow(group: SVGElement, points: Point[], fill: string, stroke: string, item: DiagramItem): void {
  if (item.maxOccurrence !== 1) {
    const shadowPoints = points.map((p) => ({ x: p.x + SHADOW_OFFSET, y: p.y + SHADOW_OFFSET }));
    svgPolygon(group, shadowPoints, fill, stroke);
  }
  svgPolygon(group, points, fill, stroke);
}

/**
 * Draws the indicator of a choice or an all: three dots in a column, with a three-pronged fork on the
 * right whose prongs point to the dots. An all has a mirrored fork on the left as well; a choice has a
 * line on the left that bends up to the upper dot.
 *
 * @param group - Parent SVG group element
 * @param pen - The stroke of the lines
 * @param brush - The fill of the dots
 * @param centerX - The x coordinate of the center of the indicator
 * @param centerY - The y coordinate of the center of the indicator
 * @param kind - Whether a choice or an all is drawn
 */
function renderForkIndicator(
  group: SVGElement,
  pen: string,
  brush: string,
  centerX: number,
  centerY: number,
  kind: "choice" | "all"
): void {
  const yUp = centerY - 4;
  const yDown = centerY + 4;

  if (kind === "choice") {
    svgLine(group, pen, centerX - 12, centerY, centerX - 8, centerY);
    svgLine(group, pen, centerX - 8, centerY, centerX - 4, yUp);
  } else {
    renderFork(group, pen, centerX - 4, centerX - 8, centerX - 12, yUp, centerY, yDown);
  }
  renderFork(group, pen, centerX + 4, centerX + 8, centerX + 12, yUp, centerY, yDown);

  const dotSize = 2;
  for (const y of [yUp, centerY, yDown]) {
    svgCircle(group, centerX, y, dotSize, brush);
  }
}

/**
 * Draws a three-pronged fork whose prongs point to the dots of an indicator: a stem that leads away from
 * the dots, a crossbar, and three prongs from the crossbar towards the dots. The middle prong and the
 * stem are one line. The left fork of an all mirrors the right one.
 *
 * @param group - Parent SVG group element
 * @param pen - The stroke of the lines
 * @param xProngTips - The x coordinate where the prongs end, next to the dots
 * @param xCrossbar - The x coordinate of the crossbar that joins the prongs
 * @param xStemEnd - The x coordinate where the stem ends, away from the dots
 * @param yUp - The y coordinate of the upper prong
 * @param yMiddle - The y coordinate of the middle prong and the stem
 * @param yDown - The y coordinate of the lower prong
 */
function renderFork(
  group: SVGElement,
  pen: string,
  xProngTips: number,
  xCrossbar: number,
  xStemEnd: number,
  yUp: number,
  yMiddle: number,
  yDown: number
): void {
  svgLine(group, pen, xProngTips, yUp, xCrossbar, yUp);
  svgLine(group, pen, xProngTips, yMiddle, xStemEnd, yMiddle);
  svgLine(group, pen, xProngTips, yDown, xCrossbar, yDown);
  svgLine(group, pen, xCrossbar, yUp, xCrossbar, yDown);
}

/**
 * Returns the corners of a rectangle whose left corners, and optionally its right corners, are beveled,
 * clockwise from the top left.
 *
 * @param rect - The rectangle
 * @param bevel - The size of the bevels
 * @param bevelRight - Whether the right corners are beveled too
 * @returns The corners
 */
function beveledRectangle(rect: Rectangle, bevel: number, bevelRight: boolean): Point[] {
  const left = rect.x;
  const top = rect.y;
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  let rightSide: Point[];
  if (bevelRight) {
    rightSide = [
      { x: right - bevel, y: top },
      { x: right, y: top + bevel },
      { x: right, y: bottom - bevel },
      { x: right - bevel, y: bottom },
    ];
  } else {
    rightSide = [
      { x: right, y: top },
      { x: right, y: bottom },
    ];
  }
  return [
    { x: left + bevel, y: top },
    ...rightSide,
    { x: left + bevel, y: bottom },
    { x: left, y: bottom - bevel },
    { x: left, y: top + bevel },
  ];
}
