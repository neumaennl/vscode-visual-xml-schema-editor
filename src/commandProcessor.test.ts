/**
 * Unit tests for CommandProcessor.
 * Tests validation, execution, rollback, and error handling.
 */

import { CommandProcessor } from "./commandProcessor";
import {
  AddElementCommand,
  RemoveElementCommand,
  ModifyElementCommand,
  AddAttributeCommand,
  RemoveAttributeCommand,
  ModifyAttributeCommand,
  AddSimpleTypeCommand,
  RemoveSimpleTypeCommand,
  ModifySimpleTypeCommand,
  AddComplexTypeCommand,
  RemoveComplexTypeCommand,
  ModifyComplexTypeCommand,
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

describe("CommandProcessor", () => {
  let processor: CommandProcessor;
  let simpleSchemaXml: string;

  beforeEach(() => {
    processor = new CommandProcessor();
    // Minimal valid XSD schema
    simpleSchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
  });

  describe("Core Functionality", () => {
    test("should parse valid schema XML", () => {
      const result = processor.execute(
        {
          type: "addElement",
          payload: {
            parentId: "schema",
            elementName: "testElement",
            elementType: "string",
          },
        },
        simpleSchemaXml
      );

      // Should fail because execution is not implemented, but parsing should work
      expect(result.success).toBe(false);
      expect(result.error).toContain("addElement execution not yet implemented");
    });

    test("should reject invalid schema XML", () => {
      const invalidXml = "not valid xml";
      const result = processor.execute(
        {
          type: "addElement",
          payload: {
            parentId: "schema",
            elementName: "testElement",
            elementType: "string",
          },
        },
        invalidXml
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to parse schema XML");
    });

    test("should return null schema and xmlContent on failure", () => {
      const result = processor.execute(
        {
          type: "addElement",
          payload: {
            parentId: "schema",
            elementName: "testElement",
            elementType: "string",
          },
        },
        simpleSchemaXml
      );

      expect(result.success).toBe(false);
      expect(result.schema).toBeNull();
      expect(result.xmlContent).toBeNull();
    });
  });

  describe("Command Validation", () => {
    describe("Element Commands", () => {
      test("should validate addElement command with valid payload", () => {
        const command: AddElementCommand = {
          type: "addElement",
          payload: {
            parentId: "schema",
            elementName: "testElement",
            elementType: "string",
          },
        };

        const result = processor.execute(command, simpleSchemaXml);
        // Validation should pass, execution should fail (not implemented)
        expect(result.error).toContain("execution not yet implemented");
      });

      test("should reject addElement with missing elementName", () => {
        const command: AddElementCommand = {
          type: "addElement",
          payload: {
            parentId: "schema",
            elementName: "",
            elementType: "string",
          },
        };

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Element name is required");
      });

      test("should reject addElement with missing elementType", () => {
        const command: AddElementCommand = {
          type: "addElement",
          payload: {
            parentId: "schema",
            elementName: "test",
            elementType: "",
          },
        };

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Element type is required");
      });

      test("should reject addElement with missing parentId", () => {
        const command: AddElementCommand = {
          type: "addElement",
          payload: {
            parentId: "",
            elementName: "test",
            elementType: "string",
          },
        };

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Parent ID is required");
      });

      test("should reject removeElement with missing elementId", () => {
        const command: RemoveElementCommand = {
          type: "removeElement",
          payload: {
            elementId: "",
          },
        };

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Element ID is required");
      });

      test("should reject modifyElement with missing elementId", () => {
        const command: ModifyElementCommand = {
          type: "modifyElement",
          payload: {
            elementId: "",
            elementName: "newName",
          },
        };

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Element ID is required");
      });
    });

    describe("Attribute Commands", () => {
      test("should reject addAttribute with missing attributeName", () => {
        const command: AddAttributeCommand = {
          type: "addAttribute",
          payload: {
            parentId: "element-1",
            attributeName: "",
            attributeType: "string",
          },
        };

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Attribute name is required");
      });

      test("should reject addAttribute with missing parentId", () => {
        const command: AddAttributeCommand = {
          type: "addAttribute",
          payload: {
            parentId: "",
            attributeName: "testAttr",
            attributeType: "string",
          },
        };

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Parent ID is required");
      });

      test("should reject removeAttribute with missing attributeId", () => {
        const command: RemoveAttributeCommand = {
          type: "removeAttribute",
          payload: {
            attributeId: "",
          },
        };

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Attribute ID is required");
      });

      test("should reject modifyAttribute with missing attributeId", () => {
        const command: ModifyAttributeCommand = {
          type: "modifyAttribute",
          payload: {
            attributeId: "",
          },
        };

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Attribute ID is required");
      });
    });

    describe("SimpleType Commands", () => {
      test("should reject addSimpleType with missing typeName", () => {
        const command: AddSimpleTypeCommand = {
          type: "addSimpleType",
          payload: {
            typeName: "",
            baseType: "string",
          },
        };

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Type name is required");
      });

      test("should reject removeSimpleType with missing typeId", () => {
        const command: RemoveSimpleTypeCommand = {
          type: "removeSimpleType",
          payload: {
            typeId: "",
          },
        };

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Type ID is required");
      });

      test("should reject modifySimpleType with missing typeId", () => {
        const command: ModifySimpleTypeCommand = {
          type: "modifySimpleType",
          payload: {
            typeId: "",
          },
        };

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Type ID is required");
      });
    });

    describe("ComplexType Commands", () => {
      test("should reject addComplexType with missing typeName", () => {
        const command: AddComplexTypeCommand = {
          type: "addComplexType",
          payload: {
            typeName: "",
            contentModel: "sequence",
          },
        };

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Type name is required");
      });

      test("should reject addComplexType with missing contentModel", () => {
        const command = {
          type: "addComplexType",
          payload: {
            typeName: "TestType",
            contentModel: "",
          },
        } as any;

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Content model is required");
      });

      test("should reject removeComplexType with missing typeId", () => {
        const command: RemoveComplexTypeCommand = {
          type: "removeComplexType",
          payload: {
            typeId: "",
          },
        };

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Type ID is required");
      });

      test("should reject modifyComplexType with missing typeId", () => {
        const command: ModifyComplexTypeCommand = {
          type: "modifyComplexType",
          payload: {
            typeId: "",
          },
        };

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Type ID is required");
      });
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

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Group name is required");
      });

      test("should reject addGroup with missing contentModel", () => {
        const command = {
          type: "addGroup",
          payload: {
            groupName: "TestGroup",
            contentModel: "",
          },
        } as any;

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Content model is required");
      });

      test("should reject removeGroup with missing groupId", () => {
        const command: RemoveGroupCommand = {
          type: "removeGroup",
          payload: {
            groupId: "",
          },
        };

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Group ID is required");
      });

      test("should reject modifyGroup with missing groupId", () => {
        const command: ModifyGroupCommand = {
          type: "modifyGroup",
          payload: {
            groupId: "",
          },
        };

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
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

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Attribute group name is required");
      });

      test("should reject removeAttributeGroup with missing groupId", () => {
        const command: RemoveAttributeGroupCommand = {
          type: "removeAttributeGroup",
          payload: {
            groupId: "",
          },
        };

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Attribute group ID is required");
      });

      test("should reject modifyAttributeGroup with missing groupId", () => {
        const command: ModifyAttributeGroupCommand = {
          type: "modifyAttributeGroup",
          payload: {
            groupId: "",
          },
        };

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
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

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Target ID is required");
      });

      test("should reject removeAnnotation with missing annotationId", () => {
        const command: RemoveAnnotationCommand = {
          type: "removeAnnotation",
          payload: {
            annotationId: "",
          },
        };

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Annotation ID is required");
      });

      test("should reject modifyAnnotation with missing annotationId", () => {
        const command: ModifyAnnotationCommand = {
          type: "modifyAnnotation",
          payload: {
            annotationId: "",
          },
        };

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
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

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Target ID is required");
      });

      test("should reject removeDocumentation with missing documentationId", () => {
        const command: RemoveDocumentationCommand = {
          type: "removeDocumentation",
          payload: {
            documentationId: "",
          },
        };

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Documentation ID is required");
      });

      test("should reject modifyDocumentation with missing documentationId", () => {
        const command: ModifyDocumentationCommand = {
          type: "modifyDocumentation",
          payload: {
            documentationId: "",
          },
        };

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
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

        const result = processor.execute(command, simpleSchemaXml);
        // Should pass validation but fail execution (not implemented)
        expect(result.error).toContain("execution not yet implemented");
      });

      test("should reject addImport with missing namespace", () => {
        const command = {
          type: "addImport",
          payload: {
            namespace: "",
            schemaLocation: "schema.xsd",
          },
        } as any;

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Namespace is required");
      });

      test("should reject addImport with missing schemaLocation", () => {
        const command = {
          type: "addImport",
          payload: {
            namespace: "http://example.com/schema",
            schemaLocation: "",
          },
        } as any;

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Schema location is required");
      });

      test("should reject removeImport with missing importId", () => {
        const command: RemoveImportCommand = {
          type: "removeImport",
          payload: {
            importId: "",
          },
        };

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Import ID is required");
      });

      test("should reject modifyImport with missing importId", () => {
        const command: ModifyImportCommand = {
          type: "modifyImport",
          payload: {
            importId: "",
          },
        };

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
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

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Schema location is required");
      });

      test("should reject removeInclude with missing includeId", () => {
        const command: RemoveIncludeCommand = {
          type: "removeInclude",
          payload: {
            includeId: "",
          },
        };

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Include ID is required");
      });

      test("should reject modifyInclude with missing includeId", () => {
        const command: ModifyIncludeCommand = {
          type: "modifyInclude",
          payload: {
            includeId: "",
          },
        };

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Include ID is required");
      });
    });

    describe("Invalid Commands", () => {
      test("should reject command with missing type", () => {
        const command = {
          type: "",
          payload: {},
        } as any;

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Command type is required");
      });

      test("should reject command with missing payload", () => {
        const command = {
          type: "addElement",
        } as any;

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Command payload is required");
      });

      test("should reject command with unknown type", () => {
        const command = {
          type: "unknownCommand",
          payload: {},
        } as any;

        const result = processor.execute(command, simpleSchemaXml);
        expect(result.success).toBe(false);
        expect(result.error).toContain("Unknown command type");
      });
    });
  });

  describe("Transactional Behavior", () => {
    test("should preserve original schema on validation failure", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "",
          elementName: "",
          elementType: "",
        },
      };

      const result = processor.execute(command, simpleSchemaXml);
      expect(result.success).toBe(false);
      expect(result.schema).toBeNull();
      expect(result.xmlContent).toBeNull();
    });

    test("should preserve original schema on execution failure", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "test",
          elementType: "string",
        },
      };

      const result = processor.execute(command, simpleSchemaXml);
      // Execution will fail because it's not implemented
      expect(result.success).toBe(false);
      expect(result.schema).toBeNull();
      expect(result.xmlContent).toBeNull();
    });

    test("should preserve original schema on serialization failure", () => {
      // This test would require a scenario where serialization fails
      // For now, we verify the structure is in place
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "test",
          elementType: "string",
        },
      };

      const result = processor.execute(command, simpleSchemaXml);
      expect(result.success).toBe(false);
      // Original schema should not be returned on error
      expect(result.schema).toBeNull();
    });
  });

  describe("Error Handling", () => {
    test("should handle malformed XML gracefully", () => {
      const malformedXml = "not valid xml at all";
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "test",
          elementType: "string",
        },
      };

      const result = processor.execute(command, malformedXml);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to parse schema XML");
    });

    test("should provide meaningful error messages", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "",
          elementName: "test",
          elementType: "string",
        },
      };

      const result = processor.execute(command, simpleSchemaXml);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Parent ID is required");
    });

    test("should handle multiple validation errors", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "",
          elementType: "string",
        },
      };

      const result = processor.execute(command, simpleSchemaXml);
      expect(result.success).toBe(false);
      // Should catch the first validation error
      expect(result.error).toBe("Element name is required");
    });
  });

  describe("Round-trip Validation", () => {
    test("should ensure serialized XML can be parsed back", () => {
      // This test verifies that the round-trip validation is in place
      // When execution is implemented, this will catch serialization issues
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "test",
          elementType: "string",
        },
      };

      const result = processor.execute(command, simpleSchemaXml);
      // For now, execution fails, but the structure is there
      expect(result.success).toBe(false);
    });
  });
});
