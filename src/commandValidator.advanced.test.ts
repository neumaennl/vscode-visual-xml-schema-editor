/**
 * Unit tests for CommandValidator - Advanced Commands.
 * Tests validation for group, annotation, documentation, import, and include commands.
 */

import { CommandValidator } from "./commandValidator";
import { unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../shared/types";
import {
  AddGroupCommand,
  RemoveGroupCommand,
  ModifyGroupCommand,
  AddAttributeGroupCommand,
  RemoveAttributeGroupCommand,
  ModifyAttributeGroupCommand,
  AddAnnotationCommand,
  RemoveAnnotationCommand,
  ModifyAnnotationCommand,
  AddDocumentationCommand,
  RemoveDocumentationCommand,
  ModifyDocumentationCommand,
  AddImportCommand,
  RemoveImportCommand,
  ModifyImportCommand,
  AddIncludeCommand,
  RemoveIncludeCommand,
  ModifyIncludeCommand,
} from "../shared/types";

describe("CommandValidator - Advanced Commands", () => {
  let validator: CommandValidator;
  let schemaObj: schema;

  beforeEach(() => {
    validator = new CommandValidator();
    const simpleSchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
    schemaObj = unmarshal(schema, simpleSchemaXml);
  });

  describe("Group Commands", () => {
    test("should reject addGroup with missing groupName", () => {
      const command: AddGroupCommand = {
        type: "addGroup",
        payload: {
          groupName: "",
          contentModel: "sequence",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Group name is required");
    });

    test("should reject addGroup with missing contentModel", () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const command = {
        type: "addGroup",
        payload: {
          groupName: "TestGroup",
          contentModel: "",
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Content model is required");
    });

    test("should reject removeGroup with missing groupId", () => {
      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: {
          groupId: "",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Group ID is required");
    });

    test("should reject modifyGroup with missing groupId", () => {
      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: {
          groupId: "",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Group ID is required");
    });
  });

  describe("AttributeGroup Commands", () => {
    test("should reject addAttributeGroup with missing groupName", () => {
      const command: AddAttributeGroupCommand = {
        type: "addAttributeGroup",
        payload: {
          groupName: "",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Attribute group name is required");
    });

    test("should reject removeAttributeGroup with missing groupId", () => {
      const command: RemoveAttributeGroupCommand = {
        type: "removeAttributeGroup",
        payload: {
          groupId: "",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Attribute group ID is required");
    });

    test("should reject modifyAttributeGroup with missing groupId", () => {
      const command: ModifyAttributeGroupCommand = {
        type: "modifyAttributeGroup",
        payload: {
          groupId: "",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Attribute group ID is required");
    });
  });

  describe("Annotation Commands", () => {
    test("should reject addAnnotation with missing targetId", () => {
      const command: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: {
          targetId: "",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Target ID is required");
    });

    test("should reject removeAnnotation with missing annotationId", () => {
      const command: RemoveAnnotationCommand = {
        type: "removeAnnotation",
        payload: {
          annotationId: "",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Annotation ID is required");
    });

    test("should reject modifyAnnotation with missing annotationId", () => {
      const command: ModifyAnnotationCommand = {
        type: "modifyAnnotation",
        payload: {
          annotationId: "",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Annotation ID is required");
    });
  });

  describe("Documentation Commands", () => {
    test("should reject addDocumentation with missing targetId", () => {
      const command: AddDocumentationCommand = {
        type: "addDocumentation",
        payload: {
          targetId: "",
          content: "test doc",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Target ID is required");
    });

    test("should reject removeDocumentation with missing documentationId", () => {
      const command: RemoveDocumentationCommand = {
        type: "removeDocumentation",
        payload: {
          documentationId: "",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Documentation ID is required");
    });

    test("should reject modifyDocumentation with missing documentationId", () => {
      const command: ModifyDocumentationCommand = {
        type: "modifyDocumentation",
        payload: {
          documentationId: "",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Documentation ID is required");
    });
  });

  describe("Import Commands", () => {
    test("should accept addImport with both namespace and schemaLocation", () => {
      const command: AddImportCommand = {
        type: "addImport",
        payload: {
          namespace: "http://example.com/schema",
          schemaLocation: "schema.xsd",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("should reject addImport with missing namespace", () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const command = {
        type: "addImport",
        payload: {
          namespace: "",
          schemaLocation: "schema.xsd",
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Namespace is required");
    });

    test("should reject addImport with missing schemaLocation", () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const command = {
        type: "addImport",
        payload: {
          namespace: "http://example.com/schema",
          schemaLocation: "",
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Schema location is required");
    });

    test("should reject removeImport with missing importId", () => {
      const command: RemoveImportCommand = {
        type: "removeImport",
        payload: {
          importId: "",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Import ID is required");
    });

    test("should reject modifyImport with missing importId", () => {
      const command: ModifyImportCommand = {
        type: "modifyImport",
        payload: {
          importId: "",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Import ID is required");
    });
  });

  describe("Include Commands", () => {
    test("should reject addInclude with missing schemaLocation", () => {
      const command: AddIncludeCommand = {
        type: "addInclude",
        payload: {
          schemaLocation: "",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Schema location is required");
    });

    test("should reject removeInclude with missing includeId", () => {
      const command: RemoveIncludeCommand = {
        type: "removeInclude",
        payload: {
          includeId: "",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Include ID is required");
    });

    test("should reject modifyInclude with missing includeId", () => {
      const command: ModifyIncludeCommand = {
        type: "modifyInclude",
        payload: {
          includeId: "",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Include ID is required");
    });
  });
});
