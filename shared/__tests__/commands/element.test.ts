/**
 * Unit tests for element command types.
 */

import {
  AddElementCommand,
  RemoveElementCommand,
  ModifyElementCommand,
} from "../../commands/element";

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

  test("AddElementCommand with minimal required fields", () => {
    const command: AddElementCommand = {
      type: "addElement",
      payload: {
        parentId: "p1",
        elementName: "e1",
        elementType: "string",
      },
    };

    expect(command.payload.minOccurs).toBeUndefined();
    expect(command.payload.maxOccurs).toBeUndefined();
    expect(command.payload.documentation).toBeUndefined();
  });

  test("ModifyElementCommand with zero values should be valid", () => {
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
});
