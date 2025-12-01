/**
 * TextRenderers provides methods for rendering text elements in diagrams
 * Extracted from DiagramSvgRenderer to reduce file size
 */

import { DiagramItem } from "./DiagramItem";
import { svgText } from "./SvgHelpers";

/** Maximum length for truncated documentation lines */
const MAX_DOC_LINE_LENGTH = 50;

/**
 * Render the text label for a diagram item
 * @param item - The diagram item containing the text
 * @param group - The SVG group to append text to
 * @param svg - The SVG element for text measurement
 */
export function renderText(
  item: DiagramItem,
  group: SVGElement,
  svg: SVGSVGElement
): void {
  const scaledBox = item.scaleRectangle(item.elementBox);
  const centerX = scaledBox.x + scaledBox.width / 2;
  const centerY = scaledBox.y + scaledBox.height / 2;

  let displayText = item.name;
  if (item.diagram?.showType && item.type) {
    displayText += `: ${item.type}`;
  }

  // Truncate text to fit in box with some padding
  const maxWidth = scaledBox.width - 10; // 5px padding on each side
  const fontSize = item.diagram?.style.fontSize || 10;
  const truncatedText = truncateText(displayText, maxWidth, fontSize, svg);

  svgText(
    group,
    truncatedText,
    centerX,
    centerY,
    `font-family:${item.diagram?.style.fontFamily};font-size:${item.diagram?.style.fontSize}pt;fill:${item.diagram?.style.foregroundColor};font-weight:bold;text-anchor:middle;dominant-baseline:central`,
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
export function truncateText(
  text: string,
  maxWidth: number,
  fontSize: number,
  svg: SVGSVGElement
): string {
  // Create a temporary SVG text element to measure actual width
  const tempText = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text"
  );
  tempText.setAttribute(
    "style",
    `font-family:${
      svg.style.fontFamily || "Arial"
    };font-size:${fontSize}pt;font-weight:bold`
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
export function renderDocumentation(
  item: DiagramItem,
  group: SVGElement
): void {
  const scaledBox = item.scaleRectangle(item.documentationBox);
  if (scaledBox.width === 0 || scaledBox.height === 0) return;

  // Simple documentation rendering - just show first line
  const lines = item.documentation.split("\n").slice(0, 3);
  const lineHeight = item.diagram?.style.documentationFontSize || 9;

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i].substring(0, MAX_DOC_LINE_LENGTH); // Truncate long lines
    svgText(
      group,
      text,
      scaledBox.x + 5,
      scaledBox.y + lineHeight + i * lineHeight,
      `font-family:${item.diagram?.style.fontFamily};font-size:${lineHeight}pt;fill:${item.diagram?.style.foregroundColor};text-anchor:start`
    );
  }
}

/**
 * Render occurrence constraint text (e.g., "1..∞")
 * @param item - The diagram item with occurrence constraints
 * @param group - The SVG group to append text to
 */
export function renderOccurrence(item: DiagramItem, group: SVGElement): void {
  if (
    !item.diagram?.alwaysShowOccurrence &&
    item.maxOccurrence <= 1 &&
    item.minOccurrence === 1
  ) {
    return;
  }

  const maxOccurText =
    item.maxOccurrence === -1 ? "∞" : item.maxOccurrence.toString();
  const occurText = `${item.minOccurrence}..${maxOccurText}`;
  const scaledBox = item.scaleRectangle(item.elementBox);

  svgText(
    group,
    occurText,
    scaledBox.x + scaledBox.width + 5,
    scaledBox.y + scaledBox.height - 5,
    `font-family:${item.diagram?.style.fontFamily};font-size:${item.diagram?.style.smallFontSize}pt;fill:${item.diagram?.style.foregroundColor};text-anchor:start`
  );
}
