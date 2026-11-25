/**
 * `TextRenderers` provides methods for rendering text elements in diagrams
 * Extracted from `DiagramSvgRenderer` to reduce file size
 */

import type { DiagramItem } from "./DiagramItem";
import { svgText } from "./SvgHelpers";
import { getMaxOccurs, getMinOccurs } from "./schemaAccessors";
import { getTypeText } from "./typeAccessors";
import { getDocumentation } from "./documentationAccessors";
import { UNBOUNDED } from "../../shared/occurrences";

/** Maximum length for truncated documentation lines */
const MAX_DOC_LINE_LENGTH = 50;

/**
 * Render the text label for a diagram item
 * @param item - The diagram item containing the text
 * @param group - The SVG group to append text to
 * @param svg - The SVG element for text measurement
 * @param leftWidth - The width at the left of the box that the label leaves free, such as for the
 *   reference arrow
 */
export function renderText(item: DiagramItem, group: SVGElement, svg: SVGSVGElement, leftWidth = 0): void {
  const box = item.elementBox;
  const centerX = box.x + (leftWidth + box.width) / 2;
  const centerY = box.y + box.height / 2;

  let displayText = item.label;
  const typeText = getTypeText(item);
  if (item.diagram.showType && typeText) {
    displayText += `: ${typeText}`;
  }

  // Truncate text to fit in box with some padding
  const maxWidth = box.width - leftWidth - 10; // 5px padding on each side
  const fontSize = item.getStyle().fontSize;
  const truncatedText = truncateText(displayText, maxWidth, fontSize, svg);

  svgText(
    group,
    truncatedText,
    centerX,
    centerY,
    `font-family:${item.getStyle().fontFamily};font-size:${item.getStyle().fontSize}pt;fill:${item.getStyle().foregroundColor};font-weight:bold;text-anchor:middle;dominant-baseline:central`,
    truncatedText !== displayText ? displayText : undefined // Show full text as tooltip if truncated
  );
}

/**
 * Truncate text to fit within a maximum width using binary search
 * @param text - The text to truncate
 * @param maxWidth - Maximum width in pixels
 * @param fontSize - Font size in points
 * @param svg - The SVG element for text measurement
 * @returns Truncated text with ellipsis if needed
 */
function truncateText(text: string, maxWidth: number, fontSize: number, svg: SVGSVGElement): string {
  // Create a temporary SVG text element to measure actual width
  const tempText = document.createElementNS("http://www.w3.org/2000/svg", "text");
  tempText.setAttribute(
    "style",
    `font-family:${svg.style.fontFamily || "Arial"};font-size:${fontSize}pt;font-weight:bold`
  );
  tempText.textContent = text;
  svg.appendChild(tempText);

  const textWidth = tempText.getBBox().width;
  svg.removeChild(tempText);

  // If it fits, return as-is
  if (textWidth <= maxWidth) {
    return text;
  }

  // Binary search to find the right length
  let left = 0;
  let right = text.length;
  let result = text;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    const testText = text.substring(0, mid) + "...";

    tempText.textContent = testText;
    svg.appendChild(tempText);
    const testWidth = tempText.getBBox().width;
    svg.removeChild(tempText);

    if (testWidth <= maxWidth) {
      result = testText;
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  return result;
}

/**
 * Render documentation text for a diagram item
 * @param item - The diagram item with documentation
 * @param group - The SVG group to append documentation to
 */
export function renderDocumentation(item: DiagramItem, group: SVGElement): void {
  const box = item.documentationBox;
  if (box.width === 0 || box.height === 0) return;

  // Simple documentation rendering - just show first line
  const lines = getDocumentation(item).split("\n").slice(0, 3);
  const lineHeight = item.getStyle().documentationFontSize;

  lines.forEach((line, i) => {
    const text = line.substring(0, MAX_DOC_LINE_LENGTH); // Truncate long lines
    svgText(
      group,
      text,
      box.x + 5,
      box.y + lineHeight + i * lineHeight,
      `font-family:${item.getStyle().fontFamily};font-size:${lineHeight}pt;fill:${item.getStyle().foregroundColor};text-anchor:start`
    );
  });
}

/**
 * Render occurrence constraint text (e.g., `"1..∞"`)
 * @param item - The diagram item with occurrence constraints
 * @param group - The SVG group to append text to
 */
export function renderOccurrence(item: DiagramItem, group: SVGElement): void {
  const minOccurs = getMinOccurs(item);
  const maxOccurs = getMaxOccurs(item);
  if (!item.diagram.alwaysShowOccurrence && minOccurs === 1 && maxOccurs === 1) {
    return;
  }

  const occurText = `${minOccurs}..${maxOccurs === UNBOUNDED ? "∞" : maxOccurs}`;
  const box = item.elementBox;

  svgText(
    group,
    occurText,
    box.x + box.width + 5,
    box.y + box.height - 5,
    `font-family:${item.getStyle().fontFamily};font-size:${item.getStyle().smallFontSize}pt;fill:${item.getStyle().foregroundColor};text-anchor:start`
  );
}
