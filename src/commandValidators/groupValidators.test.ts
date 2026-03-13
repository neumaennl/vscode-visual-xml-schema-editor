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

    test("should reject addGroup when group name already exists", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="ExistingGroup">
    <xs:sequence/>
  </xs:group>
</xs:schema>`;
      const schemaWithGroup = unmarshal(schema, schemaXml);

      const command: AddGroupCommand = {
        type: "addGroup",
        payload: {
          groupName: "ExistingGroup",
          contentModel: "sequence",
        },
      };

      const result = validateAddGroup(command, schemaWithGroup);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Group name already exists: ExistingGroup");
    });

    test("should accept addGroup with valid new group name", () => {
      const command: AddGroupCommand = {
        type: "addGroup",
        payload: {
          groupName: "NewGroup",
          contentModel: "sequence",
        },
      };

      const result = validateAddGroup(command, schemaObj);
      expect(result.valid).toBe(true);
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

    test("should reject removeGroup when group does not exist", () => {
      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: {
          groupId: "/group:NonExistent",
        },
      };

      const result = validateRemoveGroup(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Group not found: /group:NonExistent");
    });

    test("should accept removeGroup when group exists", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="MyGroup">
    <xs:sequence/>
  </xs:group>
</xs:schema>`;
      const schemaWithGroup = unmarshal(schema, schemaXml);

      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: {
          groupId: "/group:MyGroup",
        },
      };

      const result = validateRemoveGroup(command, schemaWithGroup);
      expect(result.valid).toBe(true);
    });

    test("should reject removeGroup when group is referenced by a complexType sequence", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="PersonGroup">
    <xs:sequence/>
  </xs:group>
  <xs:complexType name="PersonType">
    <xs:sequence>
      <xs:group ref="PersonGroup"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;
      const schemaWithRef = unmarshal(schema, schemaXml);

      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: {
          groupId: "/group:PersonGroup",
        },
      };

      const result = validateRemoveGroup(command, schemaWithRef);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        "Group is still referenced and cannot be removed: PersonGroup"
      );
    });

    test("should reject removeGroup when group is referenced by a complexType choice", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="ShapeGroup">
    <xs:choice/>
  </xs:group>
  <xs:complexType name="ShapeContainer">
    <xs:choice>
      <xs:group ref="ShapeGroup"/>
    </xs:choice>
  </xs:complexType>
</xs:schema>`;
      const schemaWithRef = unmarshal(schema, schemaXml);

      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: {
          groupId: "/group:ShapeGroup",
        },
      };

      const result = validateRemoveGroup(command, schemaWithRef);
      expect(result.valid).toBe(false);
    });

    test("should reject removeGroup when group is referenced directly in a complexType", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="AddressGroup">
    <xs:sequence/>
  </xs:group>
  <xs:complexType name="OrderType">
    <xs:group ref="AddressGroup"/>
  </xs:complexType>
</xs:schema>`;
      const schemaWithRef = unmarshal(schema, schemaXml);

      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: {
          groupId: "/group:AddressGroup",
        },
      };

      const result = validateRemoveGroup(command, schemaWithRef);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        "Group is still referenced and cannot be removed: AddressGroup"
      );
    });

    test("should reject removeGroup when group is referenced by an inline element complexType", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="ContactGroup">
    <xs:sequence/>
  </xs:group>
  <xs:element name="person">
    <xs:complexType>
      <xs:sequence>
        <xs:group ref="ContactGroup"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
      const schemaWithRef = unmarshal(schema, schemaXml);

      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: {
          groupId: "/group:ContactGroup",
        },
      };

      const result = validateRemoveGroup(command, schemaWithRef);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        "Group is still referenced and cannot be removed: ContactGroup"
      );
    });

    test("should reject removeGroup when group is referenced inside another group", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="InnerGroup">
    <xs:sequence/>
  </xs:group>
  <xs:group name="OuterGroup">
    <xs:sequence>
      <xs:group ref="InnerGroup"/>
    </xs:sequence>
  </xs:group>
</xs:schema>`;
      const schemaWithRef = unmarshal(schema, schemaXml);

      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: {
          groupId: "/group:InnerGroup",
        },
      };

      const result = validateRemoveGroup(command, schemaWithRef);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        "Group is still referenced and cannot be removed: InnerGroup"
      );
    });

    test("should allow removeGroup when a different group is referenced", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="GroupA">
    <xs:sequence/>
  </xs:group>
  <xs:group name="GroupB">
    <xs:sequence/>
  </xs:group>
  <xs:complexType name="SomeType">
    <xs:sequence>
      <xs:group ref="GroupA"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;
      const schemaWithRef = unmarshal(schema, schemaXml);

      // GroupB is not referenced, so it can be removed
      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: {
          groupId: "/group:GroupB",
        },
      };

      const result = validateRemoveGroup(command, schemaWithRef);
      expect(result.valid).toBe(true);
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

    test("should reject modifyGroup when group does not exist", () => {
      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: {
          groupId: "/group:NonExistent",
        },
      };

      const result = validateModifyGroup(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Group not found: /group:NonExistent");
    });

    test("should accept modifyGroup when group exists", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="MyGroup">
    <xs:sequence/>
  </xs:group>
</xs:schema>`;
      const schemaWithGroup = unmarshal(schema, schemaXml);

      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: {
          groupId: "/group:MyGroup",
          groupName: "UpdatedGroup",
        },
      };

      const result = validateModifyGroup(command, schemaWithGroup);
      expect(result.valid).toBe(true);
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
