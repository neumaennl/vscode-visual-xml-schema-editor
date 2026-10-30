/**
 * Unit tests for annotation validators (Annotation and Documentation).
 */

import {
  AddAnnotationCommand,
  RemoveAnnotationCommand,
  ModifyAnnotationCommand,
  AddDocumentationCommand,
  RemoveDocumentationCommand,
  ModifyDocumentationCommand,
} from "../../shared/types.js";
import {
  validateAddAnnotation,
  validateRemoveAnnotation,
  validateModifyAnnotation,
  validateAddDocumentation,
  validateRemoveDocumentation,
  validateModifyDocumentation,
} from "./annotationValidators.js";
import { expectInvalid } from "../__tests__/validationTestHelpers.js";
import { emptySchema, readTestSchema, schemaWith } from "../__tests__/schemaTestHelpers.js";

// ─── Shared XML fixtures ────────────────────────────────────────────────────

/** The file with an element `person` with an annotation that has one documentation. */
const DOCUMENTED_PERSON_XSD = "person-element-with-documentation.xsd";

/** The file with a schema with two annotations. */
const TWO_ANNOTATIONS_XSD = "schema-with-two-annotations.xsd";

/** A plain element (no annotation). */
const PERSON_ELEMENT = `<xs:element name="person" type="xs:string"/>`;

// ─── Annotation Validators ──────────────────────────────────────────────────

describe("Annotation Validators", () => {
  describe("validateAddAnnotation", () => {
    test("should reject addAnnotation with missing targetId", () => {
      const schemaObj = emptySchema();
      const command: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "" },
      };

      const result = validateAddAnnotation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Target ID cannot be empty");
    });

    test("should reject addAnnotation when target element does not exist", () => {
      const schemaObj = emptySchema();
      const command: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "/element:missing" },
      };

      const result = validateAddAnnotation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("not found");
    });

    test("should accept addAnnotation for an existing element", () => {
      const schemaObj = schemaWith(PERSON_ELEMENT);
      const command: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "/element:person", documentation: "A person." },
      };

      const result = validateAddAnnotation(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("should reject addAnnotation when element already has an annotation", () => {
      const schemaObj = readTestSchema(DOCUMENTED_PERSON_XSD);
      const command: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "/element:person", documentation: "Duplicate." },
      };

      const result = validateAddAnnotation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("already has an annotation");
    });
  });

  describe("validateRemoveAnnotation", () => {
    test("should reject removeAnnotation with missing annotationId", () => {
      const schemaObj = emptySchema();
      const command: RemoveAnnotationCommand = {
        type: "removeAnnotation",
        payload: { annotationId: "" },
      };

      const result = validateRemoveAnnotation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Annotation ID cannot be empty");
    });

    test("should reject removeAnnotation when element does not exist", () => {
      const schemaObj = emptySchema();
      const command: RemoveAnnotationCommand = {
        type: "removeAnnotation",
        payload: { annotationId: "/element:missing" },
      };

      const result = validateRemoveAnnotation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("not found");
    });

    test("should reject removeAnnotation when element has no annotation", () => {
      const schemaObj = schemaWith(PERSON_ELEMENT);
      const command: RemoveAnnotationCommand = {
        type: "removeAnnotation",
        payload: { annotationId: "/element:person" },
      };

      const result = validateRemoveAnnotation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("No annotation");
    });

    test("should accept removeAnnotation when annotation exists", () => {
      const schemaObj = readTestSchema(DOCUMENTED_PERSON_XSD);
      const command: RemoveAnnotationCommand = {
        type: "removeAnnotation",
        payload: { annotationId: "/element:person" },
      };

      const result = validateRemoveAnnotation(command, schemaObj);
      expect(result.valid).toBe(true);
    });
  });

  describe("validateModifyAnnotation", () => {
    test("should reject modifyAnnotation with missing annotationId", () => {
      const schemaObj = emptySchema();
      const command: ModifyAnnotationCommand = {
        type: "modifyAnnotation",
        payload: { annotationId: "" },
      };

      const result = validateModifyAnnotation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Annotation ID cannot be empty");
    });

    test("should reject modifyAnnotation when element has no annotation", () => {
      const schemaObj = schemaWith(PERSON_ELEMENT);
      const command: ModifyAnnotationCommand = {
        type: "modifyAnnotation",
        payload: { annotationId: "/element:person", documentation: "Updated." },
      };

      const result = validateModifyAnnotation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("No annotation");
    });

    test("should accept modifyAnnotation when annotation exists", () => {
      const schemaObj = readTestSchema(DOCUMENTED_PERSON_XSD);
      const command: ModifyAnnotationCommand = {
        type: "modifyAnnotation",
        payload: { annotationId: "/element:person", documentation: "Updated." },
      };

      const result = validateModifyAnnotation(command, schemaObj);
      expect(result.valid).toBe(true);
    });
  });
});

// ─── Documentation Validators ───────────────────────────────────────────────

describe("Documentation Validators", () => {
  describe("validateAddDocumentation", () => {
    test("should reject addDocumentation with missing targetId", () => {
      const schemaObj = emptySchema();
      const command: AddDocumentationCommand = {
        type: "addDocumentation",
        payload: { targetId: "", content: "test doc" },
      };

      const result = validateAddDocumentation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Target ID cannot be empty");
    });

    test("should reject addDocumentation when target element does not exist", () => {
      const schemaObj = emptySchema();
      const command: AddDocumentationCommand = {
        type: "addDocumentation",
        payload: { targetId: "/element:missing", content: "doc" },
      };

      const result = validateAddDocumentation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("not found");
    });

    test("should accept addDocumentation for an existing element", () => {
      const schemaObj = schemaWith(PERSON_ELEMENT);
      const command: AddDocumentationCommand = {
        type: "addDocumentation",
        payload: { targetId: "/element:person", content: "A person.", lang: "en" },
      };

      const result = validateAddDocumentation(command, schemaObj);
      expect(result.valid).toBe(true);
    });
  });

  describe("validateRemoveDocumentation", () => {
    test("should reject removeDocumentation with missing documentationId", () => {
      const schemaObj = emptySchema();
      const command: RemoveDocumentationCommand = {
        type: "removeDocumentation",
        payload: { documentationId: "" },
      };

      const result = validateRemoveDocumentation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Documentation ID cannot be empty");
    });

    test("should reject removeDocumentation with invalid documentationId format", () => {
      const schemaObj = readTestSchema(DOCUMENTED_PERSON_XSD);
      const command: RemoveDocumentationCommand = {
        type: "removeDocumentation",
        payload: { documentationId: "not-a-valid-id" },
      };

      const result = validateRemoveDocumentation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("Invalid documentationId format");
    });

    test("should reject removeDocumentation when documentation index is out of bounds", () => {
      const schemaObj = readTestSchema(DOCUMENTED_PERSON_XSD);
      const command: RemoveDocumentationCommand = {
        type: "removeDocumentation",
        payload: { documentationId: "/element:person/documentation[5]" },
      };

      const result = validateRemoveDocumentation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("out of bounds");
    });

    test("should accept removeDocumentation for an existing documentation element", () => {
      const schemaObj = readTestSchema(DOCUMENTED_PERSON_XSD);
      const command: RemoveDocumentationCommand = {
        type: "removeDocumentation",
        payload: { documentationId: "/element:person/documentation[0]" },
      };

      const result = validateRemoveDocumentation(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("should accept removeDocumentation for second element in multi-doc annotation", () => {
      const schemaObj = readTestSchema("person-element-with-two-documentations.xsd");
      const command: RemoveDocumentationCommand = {
        type: "removeDocumentation",
        payload: { documentationId: "/element:person/documentation[1]" },
      };

      const result = validateRemoveDocumentation(command, schemaObj);
      expect(result.valid).toBe(true);
    });
  });

  describe("validateModifyDocumentation", () => {
    test("should reject modifyDocumentation with missing documentationId", () => {
      const schemaObj = emptySchema();
      const command: ModifyDocumentationCommand = {
        type: "modifyDocumentation",
        payload: { documentationId: "" },
      };

      const result = validateModifyDocumentation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Documentation ID cannot be empty");
    });

    test("should reject modifyDocumentation with invalid documentationId format", () => {
      const schemaObj = readTestSchema(DOCUMENTED_PERSON_XSD);
      const command: ModifyDocumentationCommand = {
        type: "modifyDocumentation",
        payload: { documentationId: "not-a-valid-id" },
      };

      const result = validateModifyDocumentation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("Invalid documentationId format");
    });

    test("should reject modifyDocumentation when documentation index is out of bounds", () => {
      const schemaObj = readTestSchema(DOCUMENTED_PERSON_XSD);
      const command: ModifyDocumentationCommand = {
        type: "modifyDocumentation",
        payload: {
          documentationId: "/element:person/documentation[3]",
          content: "Updated",
        },
      };

      const result = validateModifyDocumentation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("out of bounds");
    });

    test("should accept modifyDocumentation with valid payload", () => {
      const schemaObj = readTestSchema(DOCUMENTED_PERSON_XSD);
      const command: ModifyDocumentationCommand = {
        type: "modifyDocumentation",
        payload: {
          documentationId: "/element:person/documentation[0]",
          content: "Updated documentation content",
        },
      };

      const result = validateModifyDocumentation(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("should accept modifyDocumentation with lang update only", () => {
      const schemaObj = readTestSchema(DOCUMENTED_PERSON_XSD);
      const command: ModifyDocumentationCommand = {
        type: "modifyDocumentation",
        payload: {
          documentationId: "/element:person/documentation[0]",
          lang: "en",
        },
      };

      const result = validateModifyDocumentation(command, schemaObj);
      expect(result.valid).toBe(true);
    });
  });
});

// ─── Schema-root annotation validators ──────────────────────────────────────

/** A single annotation on the schema element. */
const SCHEMA_ANNOTATION = `<xs:annotation>
  <xs:documentation>Schema description.</xs:documentation>
</xs:annotation>`;

describe("Schema-root Annotation Validators", () => {
  describe("validateAddAnnotation — schema root", () => {
    test("accepts targetId 'schema' even when schema already has annotations", () => {
      const schemaObj = schemaWith(SCHEMA_ANNOTATION);
      const command: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "/schema" },
      };

      const result = validateAddAnnotation(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("accepts targetId 'schema' on an empty schema", () => {
      const schemaObj = emptySchema();
      const command: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "/schema" },
      };

      const result = validateAddAnnotation(command, schemaObj);
      expect(result.valid).toBe(true);
    });
  });

  describe("validateRemoveAnnotation — schema root", () => {
    test("accepts a valid '/schema/annotation[N]' index", () => {
      const schemaObj = readTestSchema(TWO_ANNOTATIONS_XSD);
      const command: RemoveAnnotationCommand = {
        type: "removeAnnotation",
        payload: { annotationId: "/schema/annotation[1]" },
      };

      const result = validateRemoveAnnotation(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("rejects when annotation index is out of bounds", () => {
      const schemaObj = schemaWith(SCHEMA_ANNOTATION);
      const command: RemoveAnnotationCommand = {
        type: "removeAnnotation",
        payload: { annotationId: "/schema/annotation[5]" },
      };

      const result = validateRemoveAnnotation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("out of bounds");
    });

    test("rejects the legacy bare schema-root ID 'schema'", () => {
      const schemaObj = schemaWith(SCHEMA_ANNOTATION);
      const command: RemoveAnnotationCommand = {
        type: "removeAnnotation",
        payload: { annotationId: "schema" },
      };

      const result = validateRemoveAnnotation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("Target node not found");
    });

    test("rejects bare schema-root ID '/schema' (requires schema/annotation[N])", () => {
      const schemaObj = schemaWith(SCHEMA_ANNOTATION);
      const command: RemoveAnnotationCommand = {
        type: "removeAnnotation",
        payload: { annotationId: "/schema" },
      };

      const result = validateRemoveAnnotation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("/schema/annotation[N]");
    });
  });

  describe("validateModifyAnnotation — schema root", () => {
    test("accepts a valid '/schema/annotation[N]' index", () => {
      const schemaObj = schemaWith(SCHEMA_ANNOTATION);
      const command: ModifyAnnotationCommand = {
        type: "modifyAnnotation",
        payload: { annotationId: "/schema/annotation[0]", documentation: "Updated." },
      };

      const result = validateModifyAnnotation(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("rejects when annotation index is out of bounds", () => {
      const schemaObj = emptySchema();
      const command: ModifyAnnotationCommand = {
        type: "modifyAnnotation",
        payload: { annotationId: "/schema/annotation[0]", documentation: "x" },
      };

      const result = validateModifyAnnotation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("out of bounds");
    });

    test("rejects the legacy bare schema-root ID 'schema'", () => {
      const schemaObj = schemaWith(SCHEMA_ANNOTATION);
      const command: ModifyAnnotationCommand = {
        type: "modifyAnnotation",
        payload: { annotationId: "schema", documentation: "Updated." },
      };

      const result = validateModifyAnnotation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("Target node not found");
    });

    test("rejects bare schema-root ID '/schema' (requires schema/annotation[N])", () => {
      const schemaObj = schemaWith(SCHEMA_ANNOTATION);
      const command: ModifyAnnotationCommand = {
        type: "modifyAnnotation",
        payload: { annotationId: "/schema", documentation: "Updated." },
      };

      const result = validateModifyAnnotation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("/schema/annotation[N]");
    });
  });

  describe("validateAddDocumentation — schema root", () => {
    test("accepts targetId 'schema' on an empty schema (creates annotation)", () => {
      const schemaObj = emptySchema();
      const command: AddDocumentationCommand = {
        type: "addDocumentation",
        payload: { targetId: "/schema", content: "Doc." },
      };

      const result = validateAddDocumentation(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("accepts targetId '/schema/annotation[N]' when annotation exists", () => {
      const schemaObj = readTestSchema(TWO_ANNOTATIONS_XSD);
      const command: AddDocumentationCommand = {
        type: "addDocumentation",
        payload: { targetId: "/schema/annotation[1]", content: "Doc." },
      };

      const result = validateAddDocumentation(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("rejects when '/schema/annotation[N]' index is out of bounds", () => {
      const schemaObj = schemaWith(SCHEMA_ANNOTATION);
      const command: AddDocumentationCommand = {
        type: "addDocumentation",
        payload: { targetId: "/schema/annotation[9]", content: "Doc." },
      };

      const result = validateAddDocumentation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("out of bounds");
    });
  });

  describe("validateRemoveDocumentation — schema root", () => {
    test("accepts '/schema/annotation[N]/documentation[M]' with valid indices", () => {
      const schemaObj = schemaWith(SCHEMA_ANNOTATION);
      const command: RemoveDocumentationCommand = {
        type: "removeDocumentation",
        payload: { documentationId: "/schema/annotation[0]/documentation[0]" },
      };

      const result = validateRemoveDocumentation(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("rejects '/schema/annotation[N]/documentation[M]' when annotation index out of bounds", () => {
      const schemaObj = schemaWith(SCHEMA_ANNOTATION);
      const command: RemoveDocumentationCommand = {
        type: "removeDocumentation",
        payload: { documentationId: "/schema/annotation[9]/documentation[0]" },
      };

      const result = validateRemoveDocumentation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("out of bounds");
    });

    test("accepts '/schema/documentation[N]' shorthand when first annotation has docs", () => {
      const schemaObj = schemaWith(SCHEMA_ANNOTATION);
      const command: RemoveDocumentationCommand = {
        type: "removeDocumentation",
        payload: { documentationId: "/schema/documentation[0]" },
      };

      const result = validateRemoveDocumentation(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("rejects '/schema/documentation[N]' when schema has no annotations", () => {
      const schemaObj = emptySchema();
      const command: RemoveDocumentationCommand = {
        type: "removeDocumentation",
        payload: { documentationId: "/schema/documentation[0]" },
      };

      const result = validateRemoveDocumentation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("No annotation found on schema root");
    });
  });

  describe("validateModifyDocumentation — schema root", () => {
    test("accepts '/schema/annotation[N]/documentation[M]' with valid indices", () => {
      const schemaObj = schemaWith(SCHEMA_ANNOTATION);
      const command: ModifyDocumentationCommand = {
        type: "modifyDocumentation",
        payload: {
          documentationId: "/schema/annotation[0]/documentation[0]",
          content: "Updated.",
        },
      };

      const result = validateModifyDocumentation(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("accepts '/schema/documentation[N]' shorthand", () => {
      const schemaObj = schemaWith(SCHEMA_ANNOTATION);
      const command: ModifyDocumentationCommand = {
        type: "modifyDocumentation",
        payload: {
          documentationId: "/schema/documentation[0]",
          content: "Updated.",
        },
      };

      const result = validateModifyDocumentation(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("rejects '/schema/documentation[N]' when schema has no annotations", () => {
      const schemaObj = emptySchema();
      const command: ModifyDocumentationCommand = {
        type: "modifyDocumentation",
        payload: { documentationId: "/schema/documentation[0]", content: "x" },
      };

      const result = validateModifyDocumentation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("No annotation found on schema root");
    });
  });
});
