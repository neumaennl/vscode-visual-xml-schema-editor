/**
 * Integration tests: annotation and documentation add / remove / modify pipeline.
 *
 * Exercises the full extension-side editing pipeline for metadata commands.
 * Success-path assertions are made against the unmarshalled schema object.
 */

import type {
  AddAnnotationCommand,
  RemoveAnnotationCommand,
  ModifyAnnotationCommand,
  AddDocumentationCommand,
  RemoveDocumentationCommand,
  ModifyDocumentationCommand,
} from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";
import { describe, it, expect } from "vitest";
import {
  MINIMAL_SCHEMA,
  SCHEMA_WITH_ELEMENTS,
  SCHEMA_WITH_ANNOTATION,
  runCommandExpectSuccessSchema,
  runCommandExpectValidationFailure,
} from "./testHelpers";

describe("Integration: Annotation pipeline", () => {
  // ─── addAnnotation ─────────────────────────────────────────────────────────

  describe("addAnnotation", () => {
    it("adds an annotation with documentation to a top-level element", () => {
      const cmd: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "/element:person", documentation: "A person record" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_ELEMENTS, cmd);
      const elements = toArray(result.element);
      const person = elements.find((e) => e.name === "person");

      expect(person).toBeDefined();
      expect(person!.annotation).toBeDefined();
      const docs = toArray(person!.annotation!.documentation);
      expect(docs[0].value).toBe("A person record");
    });

    it("adds a schema-level annotation", () => {
      const cmd: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "schema", documentation: "My schema" },
      };

      const result = runCommandExpectSuccessSchema(MINIMAL_SCHEMA, cmd);
      const annotations = toArray(result.annotation);

      expect(annotations.length).toBe(1);
      const docs = toArray(annotations[0].documentation);
      expect(docs[0].value).toBe("My schema");
    });

    it("returns validation error when target element does not exist", () => {
      const cmd: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "/element:nonexistent", documentation: "desc" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ELEMENTS, cmd, "Target node not found or does not support annotations: /element:nonexistent");
    });
  });

  // ─── removeAnnotation ──────────────────────────────────────────────────────

  describe("removeAnnotation", () => {
    it("removes the annotation from an annotated element", () => {
      const cmd: RemoveAnnotationCommand = {
        type: "removeAnnotation",
        payload: { annotationId: "/element:person" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_ANNOTATION, cmd);
      const elements = toArray(result.element);
      const person = elements.find((e) => e.name === "person");

      expect(person).toBeDefined();
      expect(person!.annotation).toBeUndefined();
    });

    it("returns validation error when the element has no annotation", () => {
      const cmd: RemoveAnnotationCommand = {
        type: "removeAnnotation",
        payload: { annotationId: "/element:person" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ELEMENTS, cmd, "No annotation found on node: /element:person");
    });
  });

  // ─── modifyAnnotation ──────────────────────────────────────────────────────

  describe("modifyAnnotation", () => {
    it("replaces the documentation text on an annotated element", () => {
      const cmd: ModifyAnnotationCommand = {
        type: "modifyAnnotation",
        payload: {
          annotationId: "/element:person",
          documentation: "Updated description",
        },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_ANNOTATION, cmd);
      const elements = toArray(result.element);
      const person = elements.find((e) => e.name === "person");

      expect(person).toBeDefined();
      const docs = toArray(person!.annotation!.documentation);
      expect(docs[0].value).toBe("Updated description");
    });

    it("returns validation error when element does not exist", () => {
      const cmd: ModifyAnnotationCommand = {
        type: "modifyAnnotation",
        payload: { annotationId: "/element:noElement", documentation: "text" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ANNOTATION, cmd, "Target node not found or does not support annotations: /element:noElement");
    });
  });
});

describe("Integration: Documentation pipeline", () => {
  // ─── addDocumentation ──────────────────────────────────────────────────────

  describe("addDocumentation", () => {
    it("adds a documentation node to an existing annotation", () => {
      const cmd: AddDocumentationCommand = {
        type: "addDocumentation",
        payload: {
          targetId: "/element:person",
          content: "Additional details",
        },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_ANNOTATION, cmd);
      const elements = toArray(result.element);
      const person = elements.find((e) => e.name === "person");

      expect(person).toBeDefined();
      const docs = toArray(person!.annotation!.documentation);
      expect(docs.some((d) => d.value === "Additional details")).toBe(true);
    });

    it("returns validation error when target element does not exist", () => {
      const cmd: AddDocumentationCommand = {
        type: "addDocumentation",
        payload: {
          targetId: "/element:missing",
          content: "text",
        },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ANNOTATION, cmd, "Target node not found or does not support annotations: /element:missing");
    });
  });

  // ─── removeDocumentation ───────────────────────────────────────────────────

  describe("removeDocumentation", () => {
    it("removes the first documentation node from an annotation", () => {
      const cmd: RemoveDocumentationCommand = {
        type: "removeDocumentation",
        payload: { documentationId: "/element:person/documentation[0]" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_ANNOTATION, cmd);
      const elements = toArray(result.element);
      const person = elements.find((e) => e.name === "person");

      expect(person).toBeDefined();
      const docs = toArray(person!.annotation?.documentation);
      expect(docs.some((d) => d.value === "A person element")).toBe(false);
    });

    it("returns validation error when documentation index is out of bounds", () => {
      const cmd: RemoveDocumentationCommand = {
        type: "removeDocumentation",
        payload: { documentationId: "/element:person/documentation[5]" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ANNOTATION, cmd, "Documentation index 5 out of bounds (length 1): /element:person/documentation[5]");
    });
  });

  // ─── modifyDocumentation ───────────────────────────────────────────────────

  describe("modifyDocumentation", () => {
    it("updates the content of a documentation node", () => {
      const cmd: ModifyDocumentationCommand = {
        type: "modifyDocumentation",
        payload: {
          documentationId: "/element:person/documentation[0]",
          content: "New documentation text",
        },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_ANNOTATION, cmd);
      const elements = toArray(result.element);
      const person = elements.find((e) => e.name === "person");

      expect(person).toBeDefined();
      const docs = toArray(person!.annotation!.documentation);
      expect(docs[0].value).toBe("New documentation text");
    });

    it("returns validation error when documentation index is out of bounds", () => {
      const cmd: ModifyDocumentationCommand = {
        type: "modifyDocumentation",
        payload: {
          documentationId: "/element:person/documentation[9]",
          content: "text",
        },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ANNOTATION, cmd, "Documentation index 9 out of bounds (length 1): /element:person/documentation[9]");
    });
  });
});
