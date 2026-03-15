/**
 * Unit tests for annotation validators (Annotation and Documentation).
 */

import { unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../../shared/types";
import {
  AddAnnotationCommand,
  RemoveAnnotationCommand,
  ModifyAnnotationCommand,
  AddDocumentationCommand,
  RemoveDocumentationCommand,
  ModifyDocumentationCommand,
} from "../../shared/types";
import {
  validateAddAnnotation,
  validateRemoveAnnotation,
  validateModifyAnnotation,
  validateAddDocumentation,
  validateRemoveDocumentation,
  validateModifyDocumentation,
} from "./annotationValidators";

// ─── Shared XML fixtures ────────────────────────────────────────────────────

const emptySchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;

/** Schema with a plain element (no annotation). */
const elementSchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
</xs:schema>`;

/** Schema with an annotated element that has one documentation child. */
const annotatedElementXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string">
    <xs:annotation>
      <xs:documentation>A person.</xs:documentation>
    </xs:annotation>
  </xs:element>
</xs:schema>`;

/** Schema with an annotated element that has two documentation children. */
const twoDocumentationXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string">
    <xs:annotation>
      <xs:documentation xml:lang="en">English</xs:documentation>
      <xs:documentation xml:lang="de">Deutsch</xs:documentation>
    </xs:annotation>
  </xs:element>
</xs:schema>`;

// ─── Annotation Validators ──────────────────────────────────────────────────

describe("Annotation Validators", () => {
  describe("validateAddAnnotation", () => {
    test("should reject addAnnotation with missing targetId", () => {
      const schemaObj = unmarshal(schema, emptySchemaXml);
      const command: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "" },
      };

      const result = validateAddAnnotation(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Target ID cannot be empty");
    });

    test("should reject addAnnotation when target element does not exist", () => {
      const schemaObj = unmarshal(schema, emptySchemaXml);
      const command: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "/element:missing" },
      };

      const result = validateAddAnnotation(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not found");
    });

    test("should accept addAnnotation for an existing element", () => {
      const schemaObj = unmarshal(schema, elementSchemaXml);
      const command: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "/element:person", documentation: "A person." },
      };

      const result = validateAddAnnotation(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("should reject addAnnotation when element already has an annotation", () => {
      const schemaObj = unmarshal(schema, annotatedElementXml);
      const command: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "/element:person", documentation: "Duplicate." },
      };

      const result = validateAddAnnotation(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("already has an annotation");
    });
  });

  describe("validateRemoveAnnotation", () => {
    test("should reject removeAnnotation with missing annotationId", () => {
      const schemaObj = unmarshal(schema, emptySchemaXml);
      const command: RemoveAnnotationCommand = {
        type: "removeAnnotation",
        payload: { annotationId: "" },
      };

      const result = validateRemoveAnnotation(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Annotation ID cannot be empty");
    });

    test("should reject removeAnnotation when element does not exist", () => {
      const schemaObj = unmarshal(schema, emptySchemaXml);
      const command: RemoveAnnotationCommand = {
        type: "removeAnnotation",
        payload: { annotationId: "/element:missing" },
      };

      const result = validateRemoveAnnotation(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not found");
    });

    test("should reject removeAnnotation when element has no annotation", () => {
      const schemaObj = unmarshal(schema, elementSchemaXml);
      const command: RemoveAnnotationCommand = {
        type: "removeAnnotation",
        payload: { annotationId: "/element:person" },
      };

      const result = validateRemoveAnnotation(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("No annotation");
    });

    test("should accept removeAnnotation when annotation exists", () => {
      const schemaObj = unmarshal(schema, annotatedElementXml);
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
      const schemaObj = unmarshal(schema, emptySchemaXml);
      const command: ModifyAnnotationCommand = {
        type: "modifyAnnotation",
        payload: { annotationId: "" },
      };

      const result = validateModifyAnnotation(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Annotation ID cannot be empty");
    });

    test("should reject modifyAnnotation when element has no annotation", () => {
      const schemaObj = unmarshal(schema, elementSchemaXml);
      const command: ModifyAnnotationCommand = {
        type: "modifyAnnotation",
        payload: { annotationId: "/element:person", documentation: "Updated." },
      };

      const result = validateModifyAnnotation(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("No annotation");
    });

    test("should accept modifyAnnotation when annotation exists", () => {
      const schemaObj = unmarshal(schema, annotatedElementXml);
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
      const schemaObj = unmarshal(schema, emptySchemaXml);
      const command: AddDocumentationCommand = {
        type: "addDocumentation",
        payload: { targetId: "", content: "test doc" },
      };

      const result = validateAddDocumentation(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Target ID cannot be empty");
    });

    test("should reject addDocumentation when target element does not exist", () => {
      const schemaObj = unmarshal(schema, emptySchemaXml);
      const command: AddDocumentationCommand = {
        type: "addDocumentation",
        payload: { targetId: "/element:missing", content: "doc" },
      };

      const result = validateAddDocumentation(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not found");
    });

    test("should accept addDocumentation for an existing element", () => {
      const schemaObj = unmarshal(schema, elementSchemaXml);
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
      const schemaObj = unmarshal(schema, emptySchemaXml);
      const command: RemoveDocumentationCommand = {
        type: "removeDocumentation",
        payload: { documentationId: "" },
      };

      const result = validateRemoveDocumentation(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Documentation ID cannot be empty");
    });

    test("should reject removeDocumentation with invalid documentationId format", () => {
      const schemaObj = unmarshal(schema, annotatedElementXml);
      const command: RemoveDocumentationCommand = {
        type: "removeDocumentation",
        payload: { documentationId: "not-a-valid-id" },
      };

      const result = validateRemoveDocumentation(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid documentationId format");
    });

    test("should reject removeDocumentation when documentation index is out of bounds", () => {
      const schemaObj = unmarshal(schema, annotatedElementXml);
      const command: RemoveDocumentationCommand = {
        type: "removeDocumentation",
        payload: { documentationId: "/element:person/documentation[5]" },
      };

      const result = validateRemoveDocumentation(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("out of bounds");
    });

    test("should accept removeDocumentation for an existing documentation element", () => {
      const schemaObj = unmarshal(schema, annotatedElementXml);
      const command: RemoveDocumentationCommand = {
        type: "removeDocumentation",
        payload: { documentationId: "/element:person/documentation[0]" },
      };

      const result = validateRemoveDocumentation(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("should accept removeDocumentation for second element in multi-doc annotation", () => {
      const schemaObj = unmarshal(schema, twoDocumentationXml);
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
      const schemaObj = unmarshal(schema, emptySchemaXml);
      const command: ModifyDocumentationCommand = {
        type: "modifyDocumentation",
        payload: { documentationId: "" },
      };

      const result = validateModifyDocumentation(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Documentation ID cannot be empty");
    });

    test("should reject modifyDocumentation with invalid documentationId format", () => {
      const schemaObj = unmarshal(schema, annotatedElementXml);
      const command: ModifyDocumentationCommand = {
        type: "modifyDocumentation",
        payload: { documentationId: "not-a-valid-id" },
      };

      const result = validateModifyDocumentation(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid documentationId format");
    });

    test("should reject modifyDocumentation when documentation index is out of bounds", () => {
      const schemaObj = unmarshal(schema, annotatedElementXml);
      const command: ModifyDocumentationCommand = {
        type: "modifyDocumentation",
        payload: {
          documentationId: "/element:person/documentation[3]",
          content: "Updated",
        },
      };

      const result = validateModifyDocumentation(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("out of bounds");
    });

    test("should accept modifyDocumentation with valid payload", () => {
      const schemaObj = unmarshal(schema, annotatedElementXml);
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
      const schemaObj = unmarshal(schema, annotatedElementXml);
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
