/**
 * Unit tests for the annotation helpers of the executors.
 */

import { createAnnotation } from "./annotationUtils.js";

describe("createAnnotation", () => {
  test("should create an annotation with one documentation entry", () => {
    expect(createAnnotation("text").documentation?.map((doc) => doc.value)).toEqual(["text"]);
  });
});
