/**
 * Unit tests for attribute command types.
 */

import {
  AddAttributeCommand,
  RemoveAttributeCommand,
  ModifyAttributeCommand,
} from "../../commands/attribute";

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

  test("AddAttributeCommand with all optional fields", () => {
    const command: AddAttributeCommand = {
      type: "addAttribute",
      payload: {
        parentId: "element-123",
        attributeName: "fullAttr",
        attributeType: "string",
        required: true,
        defaultValue: "default",
        fixedValue: "fixed",
        documentation: "Test documentation",
      },
    };

    expect(command.payload.documentation).toBe("Test documentation");
    expect(command.payload.defaultValue).toBe("default");
    expect(command.payload.fixedValue).toBe("fixed");
  });
});
