/**
 * Unit tests for the helpers of `DiagramTypes`.
 */

import { enclosingRectangle } from "./DiagramTypes";

describe("enclosingRectangle", () => {
  test("should return a single rectangle unchanged", () => {
    expect(enclosingRectangle([{ x: 1, y: 2, width: 3, height: 4 }])).toEqual({ x: 1, y: 2, width: 3, height: 4 });
  });

  test("should enclose overlapping and separate rectangles", () => {
    const rectangles = [
      { x: 10, y: 10, width: 20, height: 5 },
      { x: 5, y: 12, width: 10, height: 30 },
      { x: 40, y: 0, width: 5, height: 5 },
    ];
    expect(enclosingRectangle(rectangles)).toEqual({ x: 5, y: 0, width: 40, height: 42 });
  });
});
