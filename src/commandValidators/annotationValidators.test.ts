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

describe("Annotation Validators", () => {
  let schemaObj: schema;

  beforeEach(() => {
    const simpleSchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
    schemaObj = unmarshal(schema, simpleSchemaXml);
  });

  describe("validateAddAnnotation", () => {
    test("should reject addAnnotation with missing targetId", () => {
      const command: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: {
          targetId: "",
        },
      };

      const result = validateAddAnnotation(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Target ID cannot be empty");
    });
  });

  describe("validateRemoveAnnotation", () => {
    test("should reject removeAnnotation with missing annotationId", () => {
      const command: RemoveAnnotationCommand = {
        type: "removeAnnotation",
        payload: {
          annotationId: "",
        },
      };

      const result = validateRemoveAnnotation(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Annotation ID cannot be empty");
    });
  });

  describe("validateModifyAnnotation", () => {
    test("should reject modifyAnnotation with missing annotationId", () => {
      const command: ModifyAnnotationCommand = {
        type: "modifyAnnotation",
        payload: {
          annotationId: "",
        },
      };

      const result = validateModifyAnnotation(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Annotation ID cannot be empty");
    });
  });
});

describe("Documentation Validators", () => {
  let schemaObj: schema;

  beforeEach(() => {
    const simpleSchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
    schemaObj = unmarshal(schema, simpleSchemaXml);
  });

  describe("validateAddDocumentation", () => {
    test("should reject addDocumentation with missing targetId", () => {
      const command: AddDocumentationCommand = {
        type: "addDocumentation",
        payload: {
          targetId: "",
          content: "test doc",
        },
      };

      const result = validateAddDocumentation(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Target ID cannot be empty");
    });
  });

  describe("validateRemoveDocumentation", () => {
    test("should reject removeDocumentation with missing documentationId", () => {
      const command: RemoveDocumentationCommand = {
        type: "removeDocumentation",
        payload: {
          documentationId: "",
        },
      };

      const result = validateRemoveDocumentation(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Documentation ID cannot be empty");
    });
  });

  describe("validateModifyDocumentation", () => {
    test("should reject modifyDocumentation with missing documentationId", () => {
      const command: ModifyDocumentationCommand = {
        type: "modifyDocumentation",
        payload: {
          documentationId: "",
        },
      };

      const result = validateModifyDocumentation(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Documentation ID cannot be empty");
    });
  });
});
