/**
 * Unit tests for the annotation helpers of the executors.
 */

import type { AnnotatableNode } from "../../shared/schemaObjects.js";
import { annotate } from "./annotationUtils.js";

describe("annotate", () => {
  test("should give the node an annotation with one documentation entry", () => {
    const node: AnnotatableNode = {};
    annotate(node, "text");
    expect(node.annotation?.documentation?.map((doc) => doc.value)).toEqual(["text"]);
  });

  test("should leave the node without an annotation when there is no documentation", () => {
    const withoutDocumentation: AnnotatableNode = {};
    const withEmptyDocumentation: AnnotatableNode = {};
    annotate(withoutDocumentation, undefined);
    annotate(withEmptyDocumentation, "");
    expect(withoutDocumentation).not.toHaveProperty("annotation");
    expect(withEmptyDocumentation).not.toHaveProperty("annotation");
  });
});
