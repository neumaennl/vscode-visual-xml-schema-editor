/**
 * Integration tests: annotation and documentation add / remove / modify pipeline.
 *
 * Exercises the full extension-side editing pipeline for metadata commands.
 */

import type {
  AddAnnotationCommand,
  RemoveAnnotationCommand,
  ModifyAnnotationCommand,
  AddDocumentationCommand,
  RemoveDocumentationCommand,
  ModifyDocumentationCommand,
} from "../../shared/types";
import {
  MINIMAL_SCHEMA,
  SCHEMA_WITH_ELEMENTS,
  SCHEMA_WITH_ANNOTATION,
  runCommandExpectSuccess,
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

      const xml = runCommandExpectSuccess(SCHEMA_WITH_ELEMENTS, cmd);

      expect(xml).toContain("A person record");
      expect(xml).toContain("<annotation");
      expect(xml).toContain("<documentation");
    });

    it("adds a schema-level annotation", () => {
      const cmd: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "schema", documentation: "My schema" },
      };

      const xml = runCommandExpectSuccess(MINIMAL_SCHEMA, cmd);

      expect(xml).toContain("My schema");
    });

    it("returns validation error when target element does not exist", () => {
      const cmd: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "/element:nonexistent", documentation: "desc" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ELEMENTS, cmd, "nonexistent");
    });
  });

  // ─── removeAnnotation ──────────────────────────────────────────────────────

  describe("removeAnnotation", () => {
    it("removes the annotation from an annotated element", () => {
      const cmd: RemoveAnnotationCommand = {
        type: "removeAnnotation",
        payload: { annotationId: "/element:person" },
      };

      const xml = runCommandExpectSuccess(SCHEMA_WITH_ANNOTATION, cmd);

      expect(xml).not.toContain("<xs:annotation");
      expect(xml).not.toContain("A person element");
    });

    it("returns validation error when the element has no annotation", () => {
      const cmd: RemoveAnnotationCommand = {
        type: "removeAnnotation",
        payload: { annotationId: "/element:person" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ELEMENTS, cmd, "No annotation found");
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

      const xml = runCommandExpectSuccess(SCHEMA_WITH_ANNOTATION, cmd);

      expect(xml).toContain("Updated description");
      expect(xml).not.toContain("A person element");
    });

    it("returns validation error when element does not exist", () => {
      const cmd: ModifyAnnotationCommand = {
        type: "modifyAnnotation",
        payload: { annotationId: "/element:noElement", documentation: "text" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ANNOTATION, cmd, "noElement");
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

      const xml = runCommandExpectSuccess(SCHEMA_WITH_ANNOTATION, cmd);

      expect(xml).toContain("Additional details");
    });

    it("returns validation error when target element does not exist", () => {
      const cmd: AddDocumentationCommand = {
        type: "addDocumentation",
        payload: {
          targetId: "/element:missing",
          content: "text",
        },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ANNOTATION, cmd, "not found");
    });
  });

  // ─── removeDocumentation ───────────────────────────────────────────────────

  describe("removeDocumentation", () => {
    it("removes the first documentation node from an annotation", () => {
      const cmd: RemoveDocumentationCommand = {
        type: "removeDocumentation",
        payload: { documentationId: "/element:person/documentation[0]" },
      };

      const xml = runCommandExpectSuccess(SCHEMA_WITH_ANNOTATION, cmd);

      expect(xml).not.toContain("A person element");
    });

    it("returns validation error when documentation index is out of bounds", () => {
      const cmd: RemoveDocumentationCommand = {
        type: "removeDocumentation",
        payload: { documentationId: "/element:person/documentation[5]" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ANNOTATION, cmd, "out of bounds");
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

      const xml = runCommandExpectSuccess(SCHEMA_WITH_ANNOTATION, cmd);

      expect(xml).toContain("New documentation text");
      expect(xml).not.toContain("A person element");
    });

    it("returns validation error when documentation index is out of bounds", () => {
      const cmd: ModifyDocumentationCommand = {
        type: "modifyDocumentation",
        payload: {
          documentationId: "/element:person/documentation[9]",
          content: "text",
        },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ANNOTATION, cmd, "out of bounds");
    });
  });
});
