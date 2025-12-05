/**
 * Unit tests for group and attribute group command types.
 */

import {
  AddGroupCommand,
  RemoveGroupCommand,
  ModifyGroupCommand,
  AddAttributeGroupCommand,
  RemoveAttributeGroupCommand,
  ModifyAttributeGroupCommand,
} from "../../commands/group";

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
