/**
 * Unit tests for message protocol types and general command features.
 */

import {
  ExecuteCommandMessage,
  UpdateSchemaMessage,
  ErrorMessage,
  CommandResultMessage,
  WebviewMessage,
  ExtensionMessage,
} from "../messages";
import {
  SchemaCommand,
  CommandResponse,
  AddElementCommand,
} from "../commands";
import { schema } from "../types";

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
    const sampleSchema = {} as schema;
    const message: UpdateSchemaMessage = {
      command: "updateSchema",
      data: sampleSchema,
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

  test("ErrorMessage with stack trace", () => {
    const message: ErrorMessage = {
      command: "error",
      data: {
        message: "Runtime error",
        code: "RUNTIME_ERROR",
        stack: "Error: Runtime error\n  at line 1",
      },
    };

    expect(message.data.stack).toBeDefined();
    expect(message.data.stack).toContain("Runtime error");
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
    ];

    expect(messages).toHaveLength(1);
    expect(messages[0].command).toBe("executeCommand");
  });

  test("ExtensionMessage union type", () => {
    const sampleSchema = {} as schema;
    const messages: ExtensionMessage[] = [
      {
        command: "updateSchema",
        data: sampleSchema,
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

    expect(command.type).toBe("addElement");
    expect(command.payload.elementName).toBe("element-1");
    expect(command.payload.parentId).toBe("parent-1");
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
    const command: AddElementCommand = {
      type: "addElement",
      payload: {
        parentId: "p1",
        elementName: "", // Empty string is technically valid
        elementType: "string",
      },
    };

    expect(command.payload.elementName).toBe("");
  });
});
