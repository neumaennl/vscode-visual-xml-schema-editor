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
} from "../../shared/types.js";
import { toArray } from "../../shared/schemaUtils.js";
import {
  SCHEMA_WITH_ELEMENTS,
  SCHEMA_WITH_ANNOTATION,
  runCommandExpectSuccess,
  runCommandExpectSuccessSchema,
  runCommandExpectValidationFailure,
} from "./pipelineTestHelpers.js";
import { expectLinesInOrder } from "./textTestHelpers.js";
import { emptySchemaXml, schemaXmlWith } from "./schemaTestHelpers.js";

describe("Integration: Annotation pipeline", () => {
  // ─── addAnnotation ─────────────────────────────────────────────────────────

  describe("addAnnotation", () => {
    test("adds an annotation with documentation to a top-level element", () => {
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

    test("adds a schema-level annotation", () => {
      const cmd: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "/schema", documentation: "My schema" },
      };

      const result = runCommandExpectSuccessSchema(emptySchemaXml(), cmd);
      const annotations = toArray(result.annotation);

      expect(annotations.length).toBe(1);
      const docs = toArray(annotations[0].documentation);
      expect(docs[0].value).toBe("My schema");
    });

    test("inserts a schema-level annotation before top-level declarations", () => {
      const schemaWithTopLevelDeclaration = schemaXmlWith(`<xs:element name="person" type="xs:string"/>`);
      const cmd: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "/schema", documentation: "Schema docs" },
      };

      const updatedXml = runCommandExpectSuccess(schemaWithTopLevelDeclaration, cmd);
      expectLinesInOrder(updatedXml, ["<xs:annotation>", "<xs:element "]);
    });

    test("inserts node annotations before compositor/content children", () => {
      const schemaWithComplexType = schemaXmlWith(`<xs:complexType name="PersonType">
  <xs:sequence/>
</xs:complexType>`);
      const cmd: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "/complexType:PersonType", documentation: "Complex type docs" },
      };

      const updatedXml = runCommandExpectSuccess(schemaWithComplexType, cmd);
      expectLinesInOrder(updatedXml, ["<xs:annotation>", "<xs:sequence"]);
    });

    test("returns validation error when target element does not exist", () => {
      const cmd: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "/element:nonexistent", documentation: "desc" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ELEMENTS, cmd, "Target node not found or does not support annotations: /element:nonexistent");
    });
  });

  // ─── removeAnnotation ──────────────────────────────────────────────────────

  describe("removeAnnotation", () => {
    test("removes the annotation from an annotated element", () => {
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

    test("returns validation error when the element has no annotation", () => {
      const cmd: RemoveAnnotationCommand = {
        type: "removeAnnotation",
        payload: { annotationId: "/element:person" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ELEMENTS, cmd, "No annotation found on node: /element:person");
    });

    test("keeps remaining schema annotations before top-level declarations after deletion", () => {
      const schemaWithTopLevelElement = schemaXmlWith(`<xs:element name="root" type="xs:string"/>`);

      const afterFirstDoc = runCommandExpectSuccess(schemaWithTopLevelElement, {
        type: "addDocumentation",
        payload: { targetId: "/schema", content: "doc A1" },
      });

      const afterSecondDoc = runCommandExpectSuccess(afterFirstDoc, {
        type: "addDocumentation",
        payload: { targetId: "/schema/annotation[0]", content: "doc A2" },
      });

      const afterSecondAnnotation = runCommandExpectSuccess(afterSecondDoc, {
        type: "addAnnotation",
        payload: { targetId: "/schema" },
      });
      expectLinesInOrder(afterSecondAnnotation, ["<xs:annotation", "<xs:element "]);

      const afterDocOnSecondAnnotation = runCommandExpectSuccess(afterSecondAnnotation, {
        type: "addDocumentation",
        payload: { targetId: "/schema/annotation[1]", content: "doc B1" },
      });

      const afterRemoval = runCommandExpectSuccess(afterDocOnSecondAnnotation, {
        type: "removeAnnotation",
        payload: { annotationId: "/schema/annotation[0]" },
      });
      expectLinesInOrder(afterRemoval, ["<xs:annotation", "<xs:element "]);
    });
  });

  // ─── modifyAnnotation ──────────────────────────────────────────────────────

  describe("modifyAnnotation", () => {
    test("replaces the documentation text on an annotated element", () => {
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

    test("returns validation error when element does not exist", () => {
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
    test("adds a documentation node to an existing annotation", () => {
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

    test("returns validation error when target element does not exist", () => {
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
    test("removes the first documentation node from an annotation", () => {
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

    test("returns validation error when documentation index is out of bounds", () => {
      const cmd: RemoveDocumentationCommand = {
        type: "removeDocumentation",
        payload: { documentationId: "/element:person/documentation[5]" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ANNOTATION, cmd, "Documentation index 5 out of bounds (length 1): /element:person/documentation[5]");
    });
  });

  // ─── modifyDocumentation ───────────────────────────────────────────────────

  describe("modifyDocumentation", () => {
    test("updates the content of a documentation node", () => {
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

    test("returns validation error when documentation index is out of bounds", () => {
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
