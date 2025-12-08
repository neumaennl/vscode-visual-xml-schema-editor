/**
 * Shared test utilities for SVG rendering tests.
 * jsdom doesn't implement SVG layout methods like getBBox, so we provide mocks for testing.
 */

/**
 * Extended interface for Element to include getBBox method used in SVG tests.
 * jsdom doesn't implement getBBox, so we need to add it for testing.
 */
export interface ElementWithGetBBox extends Element {
  getBBox(): DOMRect;
}

/**
 * Mock getBBox for SVG elements in jsdom environment.
 * jsdom doesn't implement SVG layout calculations, so we need to mock this.
 * 
 * This mock approximates text width as 6 pixels per character and height as 10 pixels.
 * These values are reasonable approximations for testing purposes.
 */
export function setupGetBBoxMock(): void {
  (Element.prototype as ElementWithGetBBox).getBBox = function (this: Element): DOMRect {
    const textContent = this.textContent || "";
    const width = textContent.length * 6;
    return {
      x: 0,
      y: 0,
      width,
      height: 10,
      top: 0,
      right: width,
      bottom: 10,
      left: 0,
      toJSON: () => ({}),
    } as DOMRect;
  };
}
