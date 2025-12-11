/**
 * Unit tests for group validators (Group and AttributeGroup).
 */

import { unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../../shared/types";
import {
  AddGroupCommand,
  RemoveGroupCommand,
  ModifyGroupCommand,
  AddAttributeGroupCommand,
  RemoveAttributeGroupCommand,
  ModifyAttributeGroupCommand,
} from "../../shared/types";
import {
  validateAddGroup,
  validateRemoveGroup,
  validateModifyGroup,
  validateAddAttributeGroup,
  validateRemoveAttributeGroup,
  validateModifyAttributeGroup,
} from "./groupValidators";

describe("Group Validators", () => {
  let schemaObj: schema;

  beforeEach(() => {
    const simpleSchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
    schemaObj = unmarshal(schema, simpleSchemaXml);
  });

  describe("validateAddGroup", () => {
    test("should reject addGroup with missing groupName", () => {
      const command: AddGroupCommand = {
        type: "addGroup",
        payload: {
          groupName: "",
          contentModel: "sequence",
        },
      };

      const result = validateAddGroup(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Group name must be a valid XML name");
    });

    test("should reject addGroup with missing contentModel", () => {
      // Using type assertion to test validation of missing content model
      const command = {
        type: "addGroup",
        payload: {
          parentId: "schema",
          groupName: "TestGroup",
          contentModel: undefined,
        },
      } as unknown as AddGroupCommand;

      const result = validateAddGroup(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Content model is required");
    });
  });

  describe("validateRemoveGroup", () => {
    test("should reject removeGroup with missing groupId", () => {
      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: {
          groupId: "",
        },
      };

      const result = validateRemoveGroup(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Group ID cannot be empty");
    });
  });

  describe("validateModifyGroup", () => {
    test("should reject modifyGroup with missing groupId", () => {
      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: {
          groupId: "",
        },
      };

      const result = validateModifyGroup(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Group ID cannot be empty");
    });
  });
});

describe("AttributeGroup Validators", () => {
  let schemaObj: schema;

  beforeEach(() => {
    const simpleSchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
    schemaObj = unmarshal(schema, simpleSchemaXml);
  });

  describe("validateAddAttributeGroup", () => {
    test("should reject addAttributeGroup with missing groupName", () => {
      const command: AddAttributeGroupCommand = {
        type: "addAttributeGroup",
        payload: {
          groupName: "",
        },
      };

      const result = validateAddAttributeGroup(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Attribute group name must be a valid XML name");
    });
  });

  describe("validateRemoveAttributeGroup", () => {
    test("should reject removeAttributeGroup with missing groupId", () => {
      const command: RemoveAttributeGroupCommand = {
        type: "removeAttributeGroup",
        payload: {
          groupId: "",
        },
      };

      const result = validateRemoveAttributeGroup(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Attribute group ID cannot be empty");
    });
  });

  describe("validateModifyAttributeGroup", () => {
    test("should reject modifyAttributeGroup with missing groupId", () => {
      const command: ModifyAttributeGroupCommand = {
        type: "modifyAttributeGroup",
        payload: {
          groupId: "",
        },
      };

      const result = validateModifyAttributeGroup(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Attribute group ID cannot be empty");
    });

    test("should accept modifyAttributeGroup with valid payload", () => {
      const command: ModifyAttributeGroupCommand = {
        type: "modifyAttributeGroup",
        payload: {
          groupId: "group1",
          groupName: "validGroupName",
        },
      };

      const result = validateModifyAttributeGroup(command, schemaObj);
      expect(result.valid).toBe(true);
    });
  });
});
