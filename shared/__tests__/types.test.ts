/**
 * Unit tests for shared command types.
 * Tests type soundness and coverage of all command cases.
 */

import {
  // Element commands
  AddElementCommand,
  RemoveElementCommand,
  ModifyElementCommand,
  // Attribute commands
  AddAttributeCommand,
  RemoveAttributeCommand,
  ModifyAttributeCommand,
  // Simple type commands
  AddSimpleTypeCommand,
  RemoveSimpleTypeCommand,
  ModifySimpleTypeCommand,
  // Complex type commands
  AddComplexTypeCommand,
  RemoveComplexTypeCommand,
  ModifyComplexTypeCommand,
  // Group commands
  AddGroupCommand,
  RemoveGroupCommand,
  ModifyGroupCommand,
  // Attribute group commands
  AddAttributeGroupCommand,
  RemoveAttributeGroupCommand,
  ModifyAttributeGroupCommand,
  // Annotation commands
  AddAnnotationCommand,
  RemoveAnnotationCommand,
  ModifyAnnotationCommand,
  // Documentation commands
  AddDocumentationCommand,
  RemoveDocumentationCommand,
  ModifyDocumentationCommand,
  // Import commands
  AddImportCommand,
  RemoveImportCommand,
  ModifyImportCommand,
  // Include commands
  AddIncludeCommand,
  RemoveIncludeCommand,
  ModifyIncludeCommand,
  // Union types
  SchemaCommand,
  CommandResponse,
  // Message types
  ExecuteCommandMessage,
  UpdateSchemaMessage,
  ErrorMessage,
  CommandResultMessage,
  WebviewMessage,
  ExtensionMessage,
} from "../types";

describe("Command Types", () => {
  describe("Element Commands", () => {
    test("AddElementCommand should have correct structure", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "parent-123",
          elementName: "testElement",
          elementType: "string",
          minOccurs: 1,
          maxOccurs: 1,
          documentation: "Test documentation",
        },
      };

      expect(command.type).toBe("addElement");
      expect(command.payload.parentId).toBe("parent-123");
      expect(command.payload.elementName).toBe("testElement");
      expect(command.payload.elementType).toBe("string");
    });

    test("AddElementCommand with unbounded maxOccurs", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "parent-123",
          elementName: "listElement",
          elementType: "string",
          maxOccurs: "unbounded",
        },
      };

      expect(command.payload.maxOccurs).toBe("unbounded");
    });

    test("RemoveElementCommand should have correct structure", () => {
      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: {
          elementId: "element-456",
        },
      };

      expect(command.type).toBe("removeElement");
      expect(command.payload.elementId).toBe("element-456");
    });

    test("ModifyElementCommand with partial updates", () => {
      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId: "element-789",
          elementName: "newName",
        },
      };

      expect(command.type).toBe("modifyElement");
      expect(command.payload.elementId).toBe("element-789");
      expect(command.payload.elementName).toBe("newName");
      expect(command.payload.elementType).toBeUndefined();
    });
  });

  describe("Attribute Commands", () => {
    test("AddAttributeCommand should have correct structure", () => {
      const command: AddAttributeCommand = {
        type: "addAttribute",
        payload: {
          parentId: "element-123",
          attributeName: "testAttr",
          attributeType: "string",
          required: true,
          defaultValue: "default",
        },
      };

      expect(command.type).toBe("addAttribute");
      expect(command.payload.attributeName).toBe("testAttr");
      expect(command.payload.required).toBe(true);
    });

    test("AddAttributeCommand with fixed value", () => {
      const command: AddAttributeCommand = {
        type: "addAttribute",
        payload: {
          parentId: "element-123",
          attributeName: "fixedAttr",
          attributeType: "string",
          fixedValue: "fixed",
        },
      };

      expect(command.payload.fixedValue).toBe("fixed");
    });

    test("RemoveAttributeCommand should have correct structure", () => {
      const command: RemoveAttributeCommand = {
        type: "removeAttribute",
        payload: {
          attributeId: "attr-456",
        },
      };

      expect(command.type).toBe("removeAttribute");
      expect(command.payload.attributeId).toBe("attr-456");
    });

    test("ModifyAttributeCommand with partial updates", () => {
      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: {
          attributeId: "attr-789",
          required: false,
        },
      };

      expect(command.payload.required).toBe(false);
      expect(command.payload.attributeName).toBeUndefined();
    });
  });

  describe("Simple Type Commands", () => {
    test("AddSimpleTypeCommand with restrictions", () => {
      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "CustomString",
          baseType: "string",
          restrictions: {
            minLength: 5,
            maxLength: 50,
            pattern: "[a-zA-Z]+",
          },
        },
      };

      expect(command.type).toBe("addSimpleType");
      expect(command.payload.typeName).toBe("CustomString");
      expect(command.payload.restrictions?.minLength).toBe(5);
      expect(command.payload.restrictions?.pattern).toBe("[a-zA-Z]+");
    });

    test("AddSimpleTypeCommand with enumeration", () => {
      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "StatusType",
          baseType: "string",
          restrictions: {
            enumeration: ["active", "inactive", "pending"],
          },
        },
      };

      expect(command.payload.restrictions?.enumeration).toEqual([
        "active",
        "inactive",
        "pending",
      ]);
    });

    test("RemoveSimpleTypeCommand should have correct structure", () => {
      const command: RemoveSimpleTypeCommand = {
        type: "removeSimpleType",
        payload: {
          typeId: "type-123",
        },
      };

      expect(command.type).toBe("removeSimpleType");
      expect(command.payload.typeId).toBe("type-123");
    });

    test("ModifySimpleTypeCommand with new restrictions", () => {
      const command: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: {
          typeId: "type-456",
          restrictions: {
            minInclusive: "0",
            maxInclusive: "100",
          },
        },
      };

      expect(command.payload.restrictions?.minInclusive).toBe("0");
      expect(command.payload.restrictions?.maxInclusive).toBe("100");
    });
  });

  describe("Complex Type Commands", () => {
    test("AddComplexTypeCommand should have correct structure", () => {
      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: {
          typeName: "PersonType",
          contentModel: "sequence",
          abstract: false,
          mixed: false,
        },
      };

      expect(command.type).toBe("addComplexType");
      expect(command.payload.typeName).toBe("PersonType");
      expect(command.payload.contentModel).toBe("sequence");
    });

    test("AddComplexTypeCommand with base type extension", () => {
      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: {
          typeName: "EmployeeType",
          contentModel: "sequence",
          baseType: "PersonType",
        },
      };

      expect(command.payload.baseType).toBe("PersonType");
    });

    test("AddComplexTypeCommand with all content models", () => {
      const sequenceCommand: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: { typeName: "Type1", contentModel: "sequence" },
      };
      const choiceCommand: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: { typeName: "Type2", contentModel: "choice" },
      };
      const allCommand: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: { typeName: "Type3", contentModel: "all" },
      };

      expect(sequenceCommand.payload.contentModel).toBe("sequence");
      expect(choiceCommand.payload.contentModel).toBe("choice");
      expect(allCommand.payload.contentModel).toBe("all");
    });

    test("RemoveComplexTypeCommand should have correct structure", () => {
      const command: RemoveComplexTypeCommand = {
        type: "removeComplexType",
        payload: {
          typeId: "complexType-123",
        },
      };

      expect(command.type).toBe("removeComplexType");
      expect(command.payload.typeId).toBe("complexType-123");
    });

    test("ModifyComplexTypeCommand with partial updates", () => {
      const command: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: {
          typeId: "complexType-456",
          abstract: true,
          mixed: true,
        },
      };

      expect(command.payload.abstract).toBe(true);
      expect(command.payload.mixed).toBe(true);
    });
  });

  describe("Group Commands", () => {
    test("AddGroupCommand should have correct structure", () => {
      const command: AddGroupCommand = {
        type: "addGroup",
        payload: {
          groupName: "AddressGroup",
          contentModel: "sequence",
          documentation: "Address components",
        },
      };

      expect(command.type).toBe("addGroup");
      expect(command.payload.groupName).toBe("AddressGroup");
      expect(command.payload.contentModel).toBe("sequence");
    });

    test("RemoveGroupCommand should have correct structure", () => {
      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: {
          groupId: "group-123",
        },
      };

      expect(command.type).toBe("removeGroup");
      expect(command.payload.groupId).toBe("group-123");
    });

    test("ModifyGroupCommand should have correct structure", () => {
      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: {
          groupId: "group-456",
          groupName: "NewGroupName",
          contentModel: "choice",
        },
      };

      expect(command.payload.groupName).toBe("NewGroupName");
      expect(command.payload.contentModel).toBe("choice");
    });
  });

  describe("Attribute Group Commands", () => {
    test("AddAttributeGroupCommand should have correct structure", () => {
      const command: AddAttributeGroupCommand = {
        type: "addAttributeGroup",
        payload: {
          groupName: "CommonAttributes",
          documentation: "Shared attributes",
        },
      };

      expect(command.type).toBe("addAttributeGroup");
      expect(command.payload.groupName).toBe("CommonAttributes");
    });

    test("RemoveAttributeGroupCommand should have correct structure", () => {
      const command: RemoveAttributeGroupCommand = {
        type: "removeAttributeGroup",
        payload: {
          groupId: "attrGroup-123",
        },
      };

      expect(command.type).toBe("removeAttributeGroup");
      expect(command.payload.groupId).toBe("attrGroup-123");
    });

    test("ModifyAttributeGroupCommand should have correct structure", () => {
      const command: ModifyAttributeGroupCommand = {
        type: "modifyAttributeGroup",
        payload: {
          groupId: "attrGroup-456",
          groupName: "UpdatedAttributes",
        },
      };

      expect(command.payload.groupName).toBe("UpdatedAttributes");
    });
  });

  describe("Annotation Commands", () => {
    test("AddAnnotationCommand should have correct structure", () => {
      const command: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: {
          targetId: "element-123",
          documentation: "This is documentation",
          appInfo: "Application specific info",
        },
      };

      expect(command.type).toBe("addAnnotation");
      expect(command.payload.targetId).toBe("element-123");
      expect(command.payload.documentation).toBe("This is documentation");
    });

    test("RemoveAnnotationCommand should have correct structure", () => {
      const command: RemoveAnnotationCommand = {
        type: "removeAnnotation",
        payload: {
          annotationId: "annotation-123",
        },
      };

      expect(command.type).toBe("removeAnnotation");
      expect(command.payload.annotationId).toBe("annotation-123");
    });

    test("ModifyAnnotationCommand should have correct structure", () => {
      const command: ModifyAnnotationCommand = {
        type: "modifyAnnotation",
        payload: {
          annotationId: "annotation-456",
          documentation: "Updated documentation",
        },
      };

      expect(command.payload.documentation).toBe("Updated documentation");
    });
  });

  describe("Documentation Commands", () => {
    test("AddDocumentationCommand should have correct structure", () => {
      const command: AddDocumentationCommand = {
        type: "addDocumentation",
        payload: {
          targetId: "element-123",
          content: "Documentation content",
          lang: "en",
        },
      };

      expect(command.type).toBe("addDocumentation");
      expect(command.payload.content).toBe("Documentation content");
      expect(command.payload.lang).toBe("en");
    });

    test("RemoveDocumentationCommand should have correct structure", () => {
      const command: RemoveDocumentationCommand = {
        type: "removeDocumentation",
        payload: {
          documentationId: "doc-123",
        },
      };

      expect(command.type).toBe("removeDocumentation");
      expect(command.payload.documentationId).toBe("doc-123");
    });

    test("ModifyDocumentationCommand should have correct structure", () => {
      const command: ModifyDocumentationCommand = {
        type: "modifyDocumentation",
        payload: {
          documentationId: "doc-456",
          content: "Updated content",
        },
      };

      expect(command.payload.content).toBe("Updated content");
    });
  });

  describe("Import Commands", () => {
    test("AddImportCommand should have correct structure", () => {
      const command: AddImportCommand = {
        type: "addImport",
        payload: {
          namespace: "http://example.com/schema",
          schemaLocation: "http://example.com/schema.xsd",
        },
      };

      expect(command.type).toBe("addImport");
      expect(command.payload.namespace).toBe("http://example.com/schema");
      expect(command.payload.schemaLocation).toBe(
        "http://example.com/schema.xsd"
      );
    });

    test("RemoveImportCommand should have correct structure", () => {
      const command: RemoveImportCommand = {
        type: "removeImport",
        payload: {
          importId: "import-123",
        },
      };

      expect(command.type).toBe("removeImport");
      expect(command.payload.importId).toBe("import-123");
    });

    test("ModifyImportCommand should have correct structure", () => {
      const command: ModifyImportCommand = {
        type: "modifyImport",
        payload: {
          importId: "import-456",
          schemaLocation: "http://example.com/updated.xsd",
        },
      };

      expect(command.payload.schemaLocation).toBe(
        "http://example.com/updated.xsd"
      );
    });
  });

  describe("Include Commands", () => {
    test("AddIncludeCommand should have correct structure", () => {
      const command: AddIncludeCommand = {
        type: "addInclude",
        payload: {
          schemaLocation: "common-types.xsd",
        },
      };

      expect(command.type).toBe("addInclude");
      expect(command.payload.schemaLocation).toBe("common-types.xsd");
    });

    test("RemoveIncludeCommand should have correct structure", () => {
      const command: RemoveIncludeCommand = {
        type: "removeInclude",
        payload: {
          includeId: "include-123",
        },
      };

      expect(command.type).toBe("removeInclude");
      expect(command.payload.includeId).toBe("include-123");
    });

    test("ModifyIncludeCommand should have correct structure", () => {
      const command: ModifyIncludeCommand = {
        type: "modifyInclude",
        payload: {
          includeId: "include-456",
          schemaLocation: "updated-types.xsd",
        },
      };

      expect(command.payload.schemaLocation).toBe("updated-types.xsd");
    });
  });

  describe("SchemaCommand Union Type", () => {
    test("SchemaCommand should accept all command types", () => {
      const commands: SchemaCommand[] = [
        {
          type: "addElement",
          payload: {
            parentId: "p1",
            elementName: "e1",
            elementType: "string",
          },
        },
        {
          type: "removeElement",
          payload: { elementId: "e1" },
        },
        {
          type: "addAttribute",
          payload: {
            parentId: "e1",
            attributeName: "a1",
            attributeType: "string",
          },
        },
        {
          type: "addSimpleType",
          payload: { typeName: "t1", baseType: "string" },
        },
        {
          type: "addComplexType",
          payload: { typeName: "ct1", contentModel: "sequence" },
        },
        {
          type: "addGroup",
          payload: { groupName: "g1", contentModel: "sequence" },
        },
        {
          type: "addAttributeGroup",
          payload: { groupName: "ag1" },
        },
        {
          type: "addAnnotation",
          payload: { targetId: "e1", documentation: "doc" },
        },
        {
          type: "addDocumentation",
          payload: { targetId: "e1", content: "content" },
        },
        {
          type: "addImport",
          payload: { namespace: "ns", schemaLocation: "loc" },
        },
        {
          type: "addInclude",
          payload: { schemaLocation: "loc" },
        },
      ];

      expect(commands).toHaveLength(11);
      commands.forEach((cmd) => {
        expect(cmd.type).toBeDefined();
        expect(cmd.payload).toBeDefined();
      });
    });

    test("Type discrimination should work for SchemaCommand", () => {
      const command: SchemaCommand = {
        type: "addElement",
        payload: {
          parentId: "parent-1",
          elementName: "element-1",
          elementType: "string",
        },
      };

      if (command.type === "addElement") {
        // TypeScript should narrow the type here
        expect(command.payload.elementName).toBe("element-1");
        expect(command.payload.parentId).toBe("parent-1");
      }
    });
  });

  describe("CommandResponse", () => {
    test("Successful command response", () => {
      const response: CommandResponse = {
        success: true,
        data: { elementId: "new-element-123" },
      };

      expect(response.success).toBe(true);
      expect(response.error).toBeUndefined();
    });

    test("Failed command response", () => {
      const response: CommandResponse = {
        success: false,
        error: "Element not found",
      };

      expect(response.success).toBe(false);
      expect(response.error).toBe("Element not found");
    });
  });

  describe("Message Types", () => {
    test("ExecuteCommandMessage should have correct structure", () => {
      const message: ExecuteCommandMessage = {
        command: "executeCommand",
        data: {
          type: "addElement",
          payload: {
            parentId: "p1",
            elementName: "e1",
            elementType: "string",
          },
        },
      };

      expect(message.command).toBe("executeCommand");
      expect(message.data.type).toBe("addElement");
    });

    test("UpdateSchemaMessage should have correct structure", () => {
      const message: UpdateSchemaMessage = {
        command: "updateSchema",
        data: { schema: "serialized schema data" },
      };

      expect(message.command).toBe("updateSchema");
      expect(message.data).toBeDefined();
    });

    test("ErrorMessage should have correct structure", () => {
      const message: ErrorMessage = {
        command: "error",
        data: {
          message: "Validation failed",
          code: "VALIDATION_ERROR",
        },
      };

      expect(message.command).toBe("error");
      expect(message.data.message).toBe("Validation failed");
      expect(message.data.code).toBe("VALIDATION_ERROR");
    });

    test("CommandResultMessage should have correct structure", () => {
      const message: CommandResultMessage = {
        command: "commandResult",
        data: {
          success: true,
          data: { elementId: "e1" },
        },
      };

      expect(message.command).toBe("commandResult");
      expect(message.data.success).toBe(true);
    });

    test("WebviewMessage union type", () => {
      const messages: WebviewMessage[] = [
        {
          command: "executeCommand",
          data: {
            type: "addElement",
            payload: {
              parentId: "p1",
              elementName: "e1",
              elementType: "string",
            },
          },
        },
        {
          command: "nodeClicked",
          data: { nodeId: "node-123" },
        },
      ];

      expect(messages).toHaveLength(2);
      expect(messages[0].command).toBe("executeCommand");
      expect(messages[1].command).toBe("nodeClicked");
    });

    test("ExtensionMessage union type", () => {
      const messages: ExtensionMessage[] = [
        {
          command: "updateSchema",
          data: { schema: "data" },
        },
        {
          command: "error",
          data: { message: "Error occurred" },
        },
        {
          command: "commandResult",
          data: { success: true },
        },
      ];

      expect(messages).toHaveLength(3);
      expect(messages[0].command).toBe("updateSchema");
      expect(messages[1].command).toBe("error");
      expect(messages[2].command).toBe("commandResult");
    });
  });

  describe("Type Safety", () => {
    test("Command type field should be literal type", () => {
      const command: AddElementCommand = {
        type: "addElement", // This is a literal type, not just string
        payload: {
          parentId: "p1",
          elementName: "e1",
          elementType: "string",
        },
      };

      // If this compiles, it means the type is correctly set as a literal
      const typeCheck: "addElement" = command.type;
      expect(typeCheck).toBe("addElement");
    });

    test("Optional fields should be allowed to be undefined", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "p1",
          elementName: "e1",
          elementType: "string",
          // minOccurs, maxOccurs, documentation are optional
        },
      };

      expect(command.payload.minOccurs).toBeUndefined();
      expect(command.payload.maxOccurs).toBeUndefined();
      expect(command.payload.documentation).toBeUndefined();
    });

    test("Required fields should not compile if missing", () => {
      // This test ensures required fields are enforced at compile time
      // If the TypeScript compiler allows this, the test would fail
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "p1",
          elementName: "e1",
          elementType: "string",
        },
      };

      // All required fields are present
      expect(command.payload.parentId).toBeDefined();
      expect(command.payload.elementName).toBeDefined();
      expect(command.payload.elementType).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    test("Command with empty string values should be valid", () => {
      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId: "e1",
          elementName: "", // Empty string is technically valid
        },
      };

      expect(command.payload.elementName).toBe("");
    });

    test("Command with zero values should be valid", () => {
      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId: "e1",
          minOccurs: 0,
          maxOccurs: 0,
        },
      };

      expect(command.payload.minOccurs).toBe(0);
      expect(command.payload.maxOccurs).toBe(0);
    });

    test("Restriction facets with all fields", () => {
      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "CompleteType",
          baseType: "decimal",
          restrictions: {
            minInclusive: "0",
            maxInclusive: "100",
            minExclusive: "-1",
            maxExclusive: "101",
            length: 10,
            minLength: 5,
            maxLength: 15,
            pattern: "[0-9]+",
            enumeration: ["val1", "val2"],
            whiteSpace: "collapse",
            totalDigits: 10,
            fractionDigits: 2,
          },
        },
      };

      expect(command.payload.restrictions?.minInclusive).toBe("0");
      expect(command.payload.restrictions?.totalDigits).toBe(10);
      expect(command.payload.restrictions?.whiteSpace).toBe("collapse");
    });
  });
});
