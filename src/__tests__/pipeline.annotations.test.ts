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
import {
  SCHEMA_WITH_ELEMENTS,
  SCHEMA_WITH_ANNOTATION,
  runCommandExpectSuccess,
  runCommandExpectSuccessSchema,
  runCommandExpectValidationFailure,
} from "./pipelineTestHelpers.js";
import { expectLinesInOrder } from "./textTestHelpers.js";
import { emptySchemaXml, schemaXmlWith } from "../../shared/__tests__/schemaTestHelpers.js";

/** A complex type without an annotation, with comments before and between its children. */
const COMPLEX_TYPE_WITH_COMMENTS = schemaXmlWith(`<xs:complexType name="PersonType">
  <!--before sequence-->
  <xs:sequence/>
  <!--before attribute-->
  <xs:attribute name="id"/>
</xs:complexType>`);

/** The lines that a new annotation of `PersonType` in `COMPLEX_TYPE_WITH_COMMENTS` and its children give, in order. */
const ANNOTATED_COMPLEX_TYPE_LINES = [
  "<xs:annotation>",
  "<!--before sequence-->",
  "<xs:sequence/>",
  "<!--before attribute-->",
  "<xs:attribute ",
];

describe("Integration: Annotation pipeline", () => {
  // ─── addAnnotation ─────────────────────────────────────────────────────────

  describe("addAnnotation", () => {
    test("adds an annotation with documentation to a top-level element", () => {
      const cmd: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "/element:person", documentation: "A person record" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_ELEMENTS, cmd);
      const elements = result.element ?? [];
      const person = elements.find((e) => e.name === "person");

      expect(person).toBeDefined();
      expect(person!.annotation).toBeDefined();
      const documentations = person!.annotation!.documentation ?? [];
      expect(documentations[0].value).toBe("A person record");
    });

    test("adds a schema-level annotation", () => {
      const cmd: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "/schema", documentation: "My schema" },
      };

      const result = runCommandExpectSuccessSchema(emptySchemaXml(), cmd);
      const annotations = result.annotation ?? [];

      expect(annotations.length).toBe(1);
      const documentations = annotations[0].documentation ?? [];
      expect(documentations[0].value).toBe("My schema");
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

    test("should add an annotation before the first child of a node and keep its comments in place", () => {
      const cmd: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "/complexType:PersonType", documentation: "Complex type docs" },
      };

      const updatedXml = runCommandExpectSuccess(COMPLEX_TYPE_WITH_COMMENTS, cmd);
      expectLinesInOrder(updatedXml, ANNOTATED_COMPLEX_TYPE_LINES);
    });

    test("should add a schema annotation before the top-level declarations and keep the comments in place", () => {
      const schemaWithComments = schemaXmlWith(`<xs:import namespace="urn:other"/>
<!--before element-->
<xs:element name="person" type="xs:string"/>
<!--before complex type-->
<xs:complexType name="PersonType"/>`);
      const cmd: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "/schema", documentation: "Schema docs" },
      };

      const updatedXml = runCommandExpectSuccess(schemaWithComments, cmd);
      expectLinesInOrder(updatedXml, [
        "<xs:import ",
        "<xs:annotation>",
        "<!--before element-->",
        "<xs:element ",
        "<!--before complex type-->",
        "<xs:complexType ",
      ]);
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
      const elements = result.element ?? [];
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

      const afterFirstDocumentation = runCommandExpectSuccess(schemaWithTopLevelElement, {
        type: "addDocumentation",
        payload: { targetId: "/schema", content: "doc A1" },
      });

      const afterSecondDocumentation = runCommandExpectSuccess(afterFirstDocumentation, {
        type: "addDocumentation",
        payload: { targetId: "/schema/annotation[0]", content: "doc A2" },
      });

      const afterSecondAnnotation = runCommandExpectSuccess(afterSecondDocumentation, {
        type: "addAnnotation",
        payload: { targetId: "/schema" },
      });
      expectLinesInOrder(afterSecondAnnotation, ["<xs:annotation", "<xs:element "]);

      const afterDocumentationOnSecondAnnotation = runCommandExpectSuccess(afterSecondAnnotation, {
        type: "addDocumentation",
        payload: { targetId: "/schema/annotation[1]", content: "doc B1" },
      });

      const afterRemoval = runCommandExpectSuccess(afterDocumentationOnSecondAnnotation, {
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
      const elements = result.element ?? [];
      const person = elements.find((e) => e.name === "person");

      expect(person).toBeDefined();
      const documentations = person!.annotation!.documentation ?? [];
      expect(documentations[0].value).toBe("Updated description");
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
      const elements = result.element ?? [];
      const person = elements.find((e) => e.name === "person");

      expect(person).toBeDefined();
      const documentations = person!.annotation!.documentation ?? [];
      expect(documentations.some((d) => d.value === "Additional details")).toBe(true);
    });

    test("should create the annotation of a node before its first child and keep its comments in place", () => {
      const cmd: AddDocumentationCommand = {
        type: "addDocumentation",
        payload: { targetId: "/complexType:PersonType", content: "Complex type docs" },
      };

      const updatedXml = runCommandExpectSuccess(COMPLEX_TYPE_WITH_COMMENTS, cmd);
      expectLinesInOrder(updatedXml, ANNOTATED_COMPLEX_TYPE_LINES);
    });

    test("should keep a schema annotation after top-level declarations in its place", () => {
      const schemaWithLateAnnotation = schemaXmlWith(`<xs:element name="person" type="xs:string"/>
<!--before annotation-->
<xs:annotation><xs:documentation>Existing docs</xs:documentation></xs:annotation>
<!--before complex type-->
<xs:complexType name="PersonType"/>`);
      const cmd: AddDocumentationCommand = {
        type: "addDocumentation",
        payload: { targetId: "/schema", content: "More docs" },
      };

      const updatedXml = runCommandExpectSuccess(schemaWithLateAnnotation, cmd);
      expectLinesInOrder(updatedXml, [
        "<xs:element ",
        "<!--before annotation-->",
        "<xs:annotation>",
        "Existing docs",
        "More docs",
        "<!--before complex type-->",
        "<xs:complexType ",
      ]);
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
      const elements = result.element ?? [];
      const person = elements.find((e) => e.name === "person");

      expect(person).toBeDefined();
      const documentations = person!.annotation?.documentation ?? [];
      expect(documentations.some((d) => d.value === "A person element")).toBe(false);
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
      const elements = result.element ?? [];
      const person = elements.find((e) => e.name === "person");

      expect(person).toBeDefined();
      const documentations = person!.annotation!.documentation ?? [];
      expect(documentations[0].value).toBe("New documentation text");
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
