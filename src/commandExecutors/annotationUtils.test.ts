/**
 * Unit tests for the annotation helpers of the executors.
 */

import { createAnnotation, setDocumentation } from "./annotationUtils.js";
import { annotationType, appinfo, documentationType } from "../../shared/types.js";

describe("createAnnotation", () => {
  test("should create an annotation with one documentation entry", () => {
    expect(createAnnotation("text").documentation?.map((doc) => doc.value)).toEqual(["text"]);
  });
});

describe("setDocumentation", () => {
  test("should create the annotation of a node without one", () => {
    const node: { annotation?: annotationType } = {};
    setDocumentation(node, "text");
    expect(node.annotation?.documentation?.map((doc) => doc.value)).toEqual(["text"]);
  });

  test("should replace all documentation entries and keeps the other content of the annotation", () => {
    const annotation = createAnnotation("old");
    annotation.documentation?.push(Object.assign(new documentationType(), { value: "older" }));
    annotation.appinfo = [new appinfo()];
    const node = { annotation };

    setDocumentation(node, "new");

    expect(node.annotation).toBe(annotation);
    expect(annotation.documentation?.map((doc) => doc.value)).toEqual(["new"]);
    expect(annotation.appinfo).toHaveLength(1);
  });
});
