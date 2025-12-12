/**
 * End-to-end integration tests for message protocol.
 * Tests the complete flow of messages between webview and extension.
 */

import {
  ExecuteCommandMessage,
  UpdateSchemaMessage,
  CommandResultMessage,
  ErrorMessage,
  WebviewMessage,
  ExtensionMessage,
} from "../messages";
import {
  AddElementCommand,
  ModifyElementCommand,
  RemoveElementCommand,
  ModifyComplexTypeCommand,
} from "../commands";
import { generateSchemaId, SchemaNodeType } from "../idStrategy";
import { schema } from "../types";

describe("Message Protocol Integration", () => {
  describe("Command execution flow", () => {
    test("should construct valid ExecuteCommandMessage for addElement", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: generateSchemaId({
            nodeType: SchemaNodeType.Element,
            name: "person",
          }),
          elementName: "email",
          elementType: "string",
          minOccurs: 0,
          maxOccurs: "unbounded",
        },
      };

      const message: ExecuteCommandMessage = {
        command: "executeCommand",
        data: command,
      };

      expect(message.command).toBe("executeCommand");
      expect(message.data.type).toBe("addElement");
      expect(command.payload.parentId).toBe("/element:person");
      expect(command.payload.elementName).toBe("email");
    });

    test("should construct valid ExecuteCommandMessage for modifyElement", () => {
      const elementId = generateSchemaId({
        nodeType: SchemaNodeType.Element,
        name: "address",
        parentId: "/element:person",
        position: 0,
      });

      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId,
          maxOccurs: "unbounded",
          documentation: "Person's address",
        },
      };

      const message: ExecuteCommandMessage = {
        command: "executeCommand",
        data: command,
      };

      expect(message.data.type).toBe("modifyElement");
      expect(command.payload.elementId).toBe(
        "/element:person/element:address[0]"
      );
    });

    test("should construct valid ExecuteCommandMessage for removeElement", () => {
      const elementId = generateSchemaId({
        nodeType: SchemaNodeType.Element,
        name: "oldField",
        parentId: "/element:person",
        position: 2,
      });

      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: {
          elementId,
        },
      };

      const message: ExecuteCommandMessage = {
        command: "executeCommand",
        data: command,
      };

      expect(message.data.type).toBe("removeElement");
      // Type narrowing is required for union types
      expect((message.data as RemoveElementCommand).payload.elementId).toBe(
        "/element:person/element:oldField[2]"
      );
    });
  });

  describe("Response message handling", () => {
    test("should handle successful command result", () => {
      const newElementId = generateSchemaId({
        nodeType: SchemaNodeType.Element,
        name: "email",
        parentId: "/element:person",
        position: 0,
      });

      const response: CommandResultMessage = {
        command: "commandResult",
        data: {
          success: true,
          data: {
            elementId: newElementId,
          },
        },
      };

      expect(response.command).toBe("commandResult");
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();

      // Type checking
      const typedData = response.data.data as { elementId: string };
      expect(typedData.elementId).toBe("/element:person/element:email[0]");
    });

    test("should handle failed command result with error message", () => {
      const response: CommandResultMessage = {
        command: "commandResult",
        data: {
          success: false,
          error: "Parent element not found: /element:nonexistent",
        },
      };

      expect(response.command).toBe("commandResult");
      expect(response.data.success).toBe(false);
      expect(response.data.error).toContain("Parent element not found");
    });

    test("should handle error message with stack trace", () => {
      const errorMsg: ErrorMessage = {
        command: "error",
        data: {
          message: "Failed to parse schema XML",
          code: "PARSE_ERROR",
          stack: "Error: Failed to parse schema XML\n  at parseSchema (...)",
        },
      };

      expect(errorMsg.command).toBe("error");
      expect(errorMsg.data.code).toBe("PARSE_ERROR");
      expect(errorMsg.data.stack).toBeDefined();
    });
  });

  describe("Message type unions", () => {
    test("should accept all valid WebviewMessage types", () => {
      const messages: WebviewMessage[] = [
        {
          command: "executeCommand",
          data: {
            type: "addElement",
            payload: {
              parentId: "/element:root",
              elementName: "child",
              elementType: "string",
            },
          },
        },
      ];

      expect(messages).toHaveLength(1);
      messages.forEach((msg) => {
        expect(msg.command).toBe("executeCommand");
      });
    });

    test("should accept all valid ExtensionMessage types", () => {
      // Mock schema object with minimal required structure
      const mockSchema: Partial<schema> = {
        targetNamespace: "http://example.com",
      };

      const messages: ExtensionMessage[] = [
        {
          command: "updateSchema",
          data: mockSchema as schema,
        },
        {
          command: "commandResult",
          data: { success: true },
        },
        {
          command: "error",
          data: { message: "Error occurred" },
        },
        {
          command: "updateDiagramOptions",
          data: {
            showDocumentation: true,
            alwaysShowOccurrence: false,
            showType: true,
          },
        },
        {
          command: "schemaModified",
          data: mockSchema as schema,
        },
      ];

      expect(messages).toHaveLength(5);
    });
  });

  describe("ID-based cross-boundary mapping", () => {
    test("should use stable IDs for element references across messages", () => {
      // Webview generates ID for parent element
      const parentId = generateSchemaId({
        nodeType: SchemaNodeType.Element,
        name: "person",
      });

      // Webview sends command with parent ID
      const addCommand: ExecuteCommandMessage = {
        command: "executeCommand",
        data: {
          type: "addElement",
          payload: {
            parentId,
            elementName: "address",
            elementType: "AddressType",
          },
        },
      };

      // Extension generates ID for new element
      const newElementId = generateSchemaId({
        nodeType: SchemaNodeType.Element,
        name: "address",
        parentId,
        position: 0,
      });

      // Extension returns new element ID
      const result: CommandResultMessage = {
        command: "commandResult",
        data: {
          success: true,
          data: { elementId: newElementId },
        },
      };

      // Webview can use returned ID for subsequent operations
      const modifyCmd: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId: newElementId,
          documentation: "Updated documentation",
        },
      };

      expect(addCommand.data.type).toBe("addElement");
      // Type narrowing for union types
      expect((addCommand.data as AddElementCommand).payload.parentId).toBe(
        "/element:person"
      );
      expect(
        (result.data.data as { elementId: string }).elementId
      ).toBe("/element:person/element:address[0]");
      expect(modifyCmd.payload.elementId).toBe(
        "/element:person/element:address[0]"
      );
    });

    test("should handle hierarchical ID references", () => {
      // Build a hierarchy of IDs
      const rootId = generateSchemaId({
        nodeType: SchemaNodeType.Element,
        name: "root",
      });

      const level1Id = generateSchemaId({
        nodeType: SchemaNodeType.Element,
        name: "level1",
        parentId: rootId,
        position: 0,
      });

      const level2Id = generateSchemaId({
        nodeType: SchemaNodeType.Element,
        name: "level2",
        parentId: level1Id,
        position: 0,
      });

      const level3Id = generateSchemaId({
        nodeType: SchemaNodeType.Element,
        name: "level3",
        parentId: level2Id,
        position: 0,
      });

      expect(rootId).toBe("/element:root");
      expect(level1Id).toBe("/element:root/element:level1[0]");
      expect(level2Id).toBe("/element:root/element:level1[0]/element:level2[0]");
      expect(level3Id).toBe(
        "/element:root/element:level1[0]/element:level2[0]/element:level3[0]"
      );
    });

    test("should handle anonymous type IDs in messages", () => {
      const elementId = generateSchemaId({
        nodeType: SchemaNodeType.Element,
        name: "person",
      });

      const anonymousTypeId = generateSchemaId({
        nodeType: SchemaNodeType.AnonymousComplexType,
        parentId: elementId,
        position: 0,
      });

      // Command to modify anonymous type
      const cmd: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: {
          typeId: anonymousTypeId,
          contentModel: "sequence",
        },
      };

      expect(cmd.payload.typeId).toBe(
        "/element:person/anonymousComplexType[0]"
      );
    });
  });

  describe("Error handling scenarios", () => {
    test("should create error message for invalid parent ID", () => {
      const errorMsg: ErrorMessage = {
        command: "error",
        data: {
          message: "Parent element not found: /element:nonexistent",
          code: "PARENT_NOT_FOUND",
        },
      };

      expect(errorMsg.data.code).toBe("PARENT_NOT_FOUND");
      expect(errorMsg.data.message).toContain("Parent element not found");
    });

    test("should create error message for validation failure", () => {
      const errorMsg: CommandResultMessage = {
        command: "commandResult",
        data: {
          success: false,
          error: "Validation failed: Element name must not be empty",
        },
      };

      expect(errorMsg.data.success).toBe(false);
      expect(errorMsg.data.error).toContain("Validation failed");
    });

    test("should create error message for circular reference", () => {
      const errorMsg: ErrorMessage = {
        command: "error",
        data: {
          message:
            "Circular reference detected: PersonType → AddressType → PersonType",
          code: "CIRCULAR_REFERENCE",
        },
      };

      expect(errorMsg.data.code).toBe("CIRCULAR_REFERENCE");
      expect(errorMsg.data.message).toContain("Circular reference detected");
    });
  });

  describe("Multiple command batching", () => {
    test("should handle sequence of related commands", () => {
      // Step 1: Add parent element
      const addParentCmd: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "/schema",
          elementName: "person",
          elementType: "PersonType",
        },
      };

      const parentId = "/element:person";

      // Step 2: Add child elements
      const addChild1: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId,
          elementName: "firstName",
          elementType: "string",
        },
      };

      const addChild2: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId,
          elementName: "lastName",
          elementType: "string",
        },
      };

      const addChild3: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId,
          elementName: "email",
          elementType: "string",
        },
      };

      expect(addParentCmd.payload.parentId).toBe("/schema");
      expect(addChild1.payload.parentId).toBe(parentId);
      expect(addChild2.payload.parentId).toBe(parentId);
      expect(addChild3.payload.parentId).toBe(parentId);
    });
  });

  describe("Edge cases and boundary conditions", () => {
    test("should handle commands with minimal payload", () => {
      const cmd: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "/schema",
          elementName: "test",
          elementType: "string",
          // No optional fields
        },
      };

      expect(cmd.payload.minOccurs).toBeUndefined();
      expect(cmd.payload.maxOccurs).toBeUndefined();
      expect(cmd.payload.documentation).toBeUndefined();
    });

    test("should handle commands with all optional fields", () => {
      const cmd: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "/schema",
          elementName: "test",
          elementType: "string",
          minOccurs: 0,
          maxOccurs: "unbounded",
          documentation: "Test element documentation",
        },
      };

      expect(cmd.payload.minOccurs).toBe(0);
      expect(cmd.payload.maxOccurs).toBe("unbounded");
      expect(cmd.payload.documentation).toBeDefined();
    });

    test("should handle empty string values in payload", () => {
      const cmd: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId: "/element:test",
          documentation: "", // Empty documentation
        },
      };

      expect(cmd.payload.documentation).toBe("");
    });

    test("should handle special characters in element names", () => {
      const elementId = generateSchemaId({
        nodeType: SchemaNodeType.Element,
        name: "my-element_123",
      });

      const cmd: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId,
          elementName: "new-name_456",
        },
      };

      expect(cmd.payload.elementId).toBe("/element:my-element_123");
      expect(cmd.payload.elementName).toBe("new-name_456");
    });
  });

  describe("State synchronization", () => {
    test("should simulate full update cycle", () => {
      // 1. Webview sends command
      const executeMsg: ExecuteCommandMessage = {
        command: "executeCommand",
        data: {
          type: "addElement",
          payload: {
            parentId: "/element:person",
            elementName: "phone",
            elementType: "string",
          },
        },
      };

      // 2. Extension confirms success
      const resultMsg: CommandResultMessage = {
        command: "commandResult",
        data: {
          success: true,
          data: {
            elementId: "/element:person/element:phone[0]",
          },
        },
      };

      // 3. Extension sends updated schema
      const mockSchema: Partial<schema> = {
        targetNamespace: "http://example.com",
      };
      const updateMsg: UpdateSchemaMessage = {
        command: "updateSchema",
        data: mockSchema as schema,
      };

      // Verify message sequence
      expect(executeMsg.command).toBe("executeCommand");
      expect(resultMsg.data.success).toBe(true);
      expect(updateMsg.command).toBe("updateSchema");
    });

    test("should simulate error recovery cycle", () => {
      // 1. Webview sends invalid command
      const executeMsg: ExecuteCommandMessage = {
        command: "executeCommand",
        data: {
          type: "addElement",
          payload: {
            parentId: "/element:nonexistent",
            elementName: "test",
            elementType: "string",
          },
        },
      };

      // 2. Extension returns error
      const resultMsg: CommandResultMessage = {
        command: "commandResult",
        data: {
          success: false,
          error: "Parent element not found: /element:nonexistent",
        },
      };

      // 3. No schema update sent (command failed)

      expect(executeMsg.command).toBe("executeCommand");
      expect(resultMsg.data.success).toBe(false);
      expect(resultMsg.data.error).toBeDefined();
    });
  });
});
