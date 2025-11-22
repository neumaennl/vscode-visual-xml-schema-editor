/**
 * SvgHelpers provides utility functions for creating SVG elements
 * Extracted from DiagramSvgRenderer to reduce file size
 */

import { Point, Rectangle } from "./DiagramTypes";

/**
 * Create an SVG line element
 * @param group - Parent SVG group element to append to
 * @param style - CSS style string for the line
 * @param x1 - Starting X coordinate
 * @param y1 - Starting Y coordinate
 * @param x2 - Ending X coordinate
 * @param y2 - Ending Y coordinate
 */
export function svgLine(
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

/**
 * Create an SVG rectangle element
 * @param group - Parent SVG group element to append to
 * @param rect - Rectangle dimensions and position
 * @param fill - Fill style string
 * @param stroke - Stroke style string
 */
export function svgRectangle(
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

/**
 * Create an SVG polygon element
 * @param group - Parent SVG group element to append to
 * @param points - Array of points defining the polygon
 * @param fill - Fill style string
 * @param stroke - Stroke style string
 */
export function svgPolygon(
  group: SVGElement,
  points: Point[],
  fill: string,
  stroke: string
): void {
  const polygon = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polygon"
  );
  const pointsStr = points.map(({ x, y }) => `${x},${y}`).join(" ");
  polygon.setAttribute("points", pointsStr);
  polygon.setAttribute("style", `${fill};${stroke}`);
  group.appendChild(polygon);
}

/**
 * Create an SVG circle element
 * @param group - Parent SVG group element to append to
 * @param cx - Center X coordinate
 * @param cy - Center Y coordinate
 * @param r - Radius
 * @param fill - Fill style string
 */
export function svgCircle(
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

/**
 * Create an SVG text element
 * @param group - Parent SVG group element to append to
 * @param text - Text content
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param style - CSS style string
 * @param title - Optional tooltip text
 */
export function svgText(
  group: SVGElement,
  text: string,
  x: number,
  y: number,
  style: string,
  title?: string
): void {
  const textElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text"
  );
  textElement.setAttribute("x", x.toString());
  textElement.setAttribute("y", y.toString());
  textElement.setAttribute("style", style);
  textElement.textContent = text;

  // Add title for tooltip if provided
  if (title) {
    const titleElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "title"
    );
    titleElement.textContent = title;
    textElement.appendChild(titleElement);
  }

  group.appendChild(textElement);
}
