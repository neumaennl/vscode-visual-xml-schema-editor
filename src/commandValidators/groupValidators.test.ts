/**
 * Unit tests for group validators.
 */

import { describe, test, expect, beforeEach } from "vitest";
import { unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../../shared/types";
import {
  AddGroupCommand,
  RemoveGroupCommand,
  ModifyGroupCommand,
} from "../../shared/types";
import {
  validateAddGroup,
  validateRemoveGroup,
  validateModifyGroup,
} from "./groupValidators";
import { expectInvalid } from "./validationTestHelpers";

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
      expectInvalid(result);
      expect(result.error).toBe("Group name must be a valid XML name");
    });

    test("should reject addGroup with missing contentModel", () => {
      const command = { type: "addGroup", payload: { groupName: "TestGroup" } } as AddGroupCommand;

      const result = validateAddGroup(command, schemaObj);
      expectInvalid(result);
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
      expectInvalid(result);
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

    test("should reject addGroup when both ref and groupName are provided", () => {
      const command = { type: "addGroup", payload: { ref: "SomeGroup", groupName: "AlsoAGroup", parentId: "/complexType:PersonType/sequence" } } as AddGroupCommand;

      const result = validateAddGroup(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("Cannot combine ref with groupName or contentModel");
    });

    test("should reject addGroup when both ref and contentModel are provided", () => {
      const command = { type: "addGroup", payload: { ref: "SomeGroup", contentModel: "sequence", parentId: "/complexType:PersonType/sequence" } } as AddGroupCommand;

      const result = validateAddGroup(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("Cannot combine ref with groupName or contentModel");
    });

    test("should reject addGroup definition when parentId is provided alongside groupName", () => {
      const command = { type: "addGroup", payload: { groupName: "SomeGroup", contentModel: "sequence", parentId: "/complexType:PersonType/sequence" } } as AddGroupCommand;

      const result = validateAddGroup(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("Cannot combine groupName/contentModel with parentId");
    });

    test("should reject addGroup definition when minOccurs is provided alongside groupName", () => {
      const command = { type: "addGroup", payload: { groupName: "SomeGroup", contentModel: "sequence", minOccurs: 0 } } as AddGroupCommand;

      const result = validateAddGroup(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("Cannot combine groupName/contentModel with parentId");
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
      expectInvalid(result);
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
      expectInvalid(result);
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
      expectInvalid(result);
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
      expectInvalid(result);
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
      expectInvalid(result);
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
      expectInvalid(result);
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
      expectInvalid(result);
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
      expectInvalid(result);
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

  describe("validateAddGroup (reference mode)", () => {
    let schemaWithGroup: schema;

    beforeEach(() => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="PersonGroup">
    <xs:sequence/>
  </xs:group>
  <xs:complexType name="PersonType">
    <xs:sequence/>
  </xs:complexType>
</xs:schema>`;
      schemaWithGroup = unmarshal(schema, schemaXml);
    });

    test("should reject when ref is provided without parentId", () => {
      const command: AddGroupCommand = {
        type: "addGroup",
        payload: { ref: "PersonGroup" },
      };
      const result = validateAddGroup(command, schemaWithGroup);
      expectInvalid(result);
      expect(result.error).toBe("Parent ID is required for group references");
    });

    test("should reject when ref is not a valid XML name", () => {
      const command: AddGroupCommand = {
        type: "addGroup",
        payload: { ref: "123-invalid", parentId: "/complexType:PersonType/sequence" },
      };
      const result = validateAddGroup(command, schemaWithGroup);
      expectInvalid(result);
      expect(result.error).toBe("Group ref must be a valid XML name");
    });

    test("should reject when referenced group does not exist", () => {
      const command: AddGroupCommand = {
        type: "addGroup",
        payload: { ref: "NoSuchGroup", parentId: "/complexType:PersonType/sequence" },
      };
      const result = validateAddGroup(command, schemaWithGroup);
      expectInvalid(result);
      expect(result.error).toBe("Referenced group does not exist: NoSuchGroup");
    });

    test("should reject when parent node does not exist", () => {
      const command: AddGroupCommand = {
        type: "addGroup",
        payload: { ref: "PersonGroup", parentId: "/complexType:NoSuchType/sequence" },
      };
      const result = validateAddGroup(command, schemaWithGroup);
      expectInvalid(result);
      expect(result.error).toContain("Parent node not found");
    });

    test("should accept a valid group reference", () => {
      const command: AddGroupCommand = {
        type: "addGroup",
        payload: { ref: "PersonGroup", parentId: "/complexType:PersonType/sequence" },
      };
      const result = validateAddGroup(command, schemaWithGroup);
      expect(result.valid).toBe(true);
    });

    test("should accept a group reference with documentation", () => {
      const command: AddGroupCommand = {
        type: "addGroup",
        payload: {
          ref: "PersonGroup",
          parentId: "/complexType:PersonType/sequence",
          documentation: "This is a group ref annotation",
        },
      };
      const result = validateAddGroup(command, schemaWithGroup);
      expect(result.valid).toBe(true);
    });

    test("should accept a group reference with valid minOccurs and maxOccurs", () => {
      const command: AddGroupCommand = {
        type: "addGroup",
        payload: {
          ref: "PersonGroup",
          parentId: "/complexType:PersonType/sequence",
          minOccurs: 0,
          maxOccurs: "unbounded",
        },
      };
      const result = validateAddGroup(command, schemaWithGroup);
      expect(result.valid).toBe(true);
    });

    test("should reject when minOccurs is negative", () => {
      const command: AddGroupCommand = {
        type: "addGroup",
        payload: {
          ref: "PersonGroup",
          parentId: "/complexType:PersonType/sequence",
          minOccurs: -1,
        },
      };
      const result = validateAddGroup(command, schemaWithGroup);
      expect(result.valid).toBe(false);
    });

    test("should reject when minOccurs exceeds maxOccurs", () => {
      const command: AddGroupCommand = {
        type: "addGroup",
        payload: {
          ref: "PersonGroup",
          parentId: "/complexType:PersonType/sequence",
          minOccurs: 5,
          maxOccurs: 2,
        },
      };
      const result = validateAddGroup(command, schemaWithGroup);
      expect(result.valid).toBe(false);
    });

    test("should reject adding group ref directly to a complexType that already has a sequence", () => {
      const command: AddGroupCommand = {
        type: "addGroup",
        payload: {
          ref: "PersonGroup",
          parentId: "/complexType:PersonType",
        },
      };
      // schemaWithGroup has PersonType with a sequence — adding a direct group ref should be rejected
      const result = validateAddGroup(command, schemaWithGroup);
      expectInvalid(result);
      expect(result.error).toContain("already has a particle");
    });

    test("should accept adding group ref directly to a complexType with no existing particle", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="PersonGroup"><xs:sequence/></xs:group>
  <xs:complexType name="EmptyType"/>
</xs:schema>`;
      const emptySchema = unmarshal(schema, schemaXml);
      const command: AddGroupCommand = {
        type: "addGroup",
        payload: {
          ref: "PersonGroup",
          parentId: "/complexType:EmptyType",
        },
      };
      const result = validateAddGroup(command, emptySchema);
      expect(result.valid).toBe(true);
    });
  });

  describe("validateRemoveGroup (reference mode)", () => {
    let schemaWithRef: schema;

    beforeEach(() => {
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
      schemaWithRef = unmarshal(schema, schemaXml);
    });

    test("should accept removing a group reference when parent exists", () => {
      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: { groupId: "/complexType:PersonType/sequence[0]/groupRef:PersonGroup[0]" },
      };
      const result = validateRemoveGroup(command, schemaWithRef);
      expect(result.valid).toBe(true);
    });

    test("should reject when parent of group reference does not exist", () => {
      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: { groupId: "/complexType:NoSuchType/sequence[0]/groupRef:PersonGroup[0]" },
      };
      const result = validateRemoveGroup(command, schemaWithRef);
      expectInvalid(result);
      expect(result.error).toContain("Parent node not found");
    });

    test("should accept removing a direct group ref from a complexType parent", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="PersonGroup"><xs:sequence/></xs:group>
  <xs:complexType name="PersonType">
    <xs:group ref="PersonGroup"/>
  </xs:complexType>
</xs:schema>`;
      const schemaWithDirectRef = unmarshal(schema, schemaXml);
      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: { groupId: "/complexType:PersonType/groupRef:PersonGroup[0]" },
      };
      const result = validateRemoveGroup(command, schemaWithDirectRef);
      expect(result.valid).toBe(true);
    });

    test("should reject removing a direct group ref from a complexType when the ref name does not match", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="PersonGroup"><xs:sequence/></xs:group>
  <xs:complexType name="PersonType">
    <xs:group ref="PersonGroup"/>
  </xs:complexType>
</xs:schema>`;
      const schemaWithDirectRef = unmarshal(schema, schemaXml);
      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: { groupId: "/complexType:PersonType/groupRef:OtherGroup[0]" },
      };
      const result = validateRemoveGroup(command, schemaWithDirectRef);
      expectInvalid(result);
      expect(result.error).toContain("GroupRef name mismatch");
    });

    test("should reject removing a direct group ref from a complexType that has no group", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="PersonGroup"><xs:sequence/></xs:group>
  <xs:complexType name="PersonType">
    <xs:sequence/>
  </xs:complexType>
</xs:schema>`;
      const schemaNoDirectGroup = unmarshal(schema, schemaXml);
      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: { groupId: "/complexType:PersonType/groupRef:PersonGroup[0]" },
      };
      const result = validateRemoveGroup(command, schemaNoDirectGroup);
      expectInvalid(result);
      expect(result.error).toContain("GroupRef not found");
    });
  });

  describe("validateModifyGroup (reference mode)", () => {
    let schemaWithRef: schema;

    beforeEach(() => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="PersonGroup">
    <xs:sequence/>
  </xs:group>
  <xs:group name="AddressGroup">
    <xs:sequence/>
  </xs:group>
  <xs:complexType name="PersonType">
    <xs:sequence>
      <xs:group ref="PersonGroup"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;
      schemaWithRef = unmarshal(schema, schemaXml);
    });

    test("should accept modifying a group reference without changing the ref", () => {
      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: {
          groupId: "/complexType:PersonType/sequence[0]/groupRef:PersonGroup[0]",
          minOccurs: 0,
        },
      };
      const result = validateModifyGroup(command, schemaWithRef);
      expect(result.valid).toBe(true);
    });

    test("should accept modifying a group reference to a different existing group", () => {
      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: {
          groupId: "/complexType:PersonType/sequence[0]/groupRef:PersonGroup[0]",
          ref: "AddressGroup",
        },
      };
      const result = validateModifyGroup(command, schemaWithRef);
      expect(result.valid).toBe(true);
    });

    test("should reject when new ref target does not exist", () => {
      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: {
          groupId: "/complexType:PersonType/sequence[0]/groupRef:PersonGroup[0]",
          ref: "NonExistentGroup",
        },
      };
      const result = validateModifyGroup(command, schemaWithRef);
      expectInvalid(result);
      expect(result.error).toBe("Referenced group does not exist: NonExistentGroup");
    });

    test("should reject when definition-mode fields are used with a group reference ID", () => {
      const command = { type: "modifyGroup", payload: { groupId: "/complexType:PersonType/sequence[0]/groupRef:PersonGroup[0]", groupName: "RenamedGroup" } } as ModifyGroupCommand;
      const result = validateModifyGroup(command, schemaWithRef);
      expectInvalid(result);
      expect(result.error).toContain("Cannot use groupName or contentModel when modifying a group reference");
    });

    test("should reject when contentModel is used with a group reference ID", () => {
      const command = { type: "modifyGroup", payload: { groupId: "/complexType:PersonType/sequence[0]/groupRef:PersonGroup[0]", contentModel: "choice" } } as ModifyGroupCommand;
      const result = validateModifyGroup(command, schemaWithRef);
      expectInvalid(result);
      expect(result.error).toContain("Cannot use groupName or contentModel when modifying a group reference");
    });

    test("should accept documentation when modifying a group reference", () => {
      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: {
          groupId: "/complexType:PersonType/sequence[0]/groupRef:PersonGroup[0]",
          documentation: "Updated documentation on the ref",
        },
      };
      const result = validateModifyGroup(command, schemaWithRef);
      expect(result.valid).toBe(true);
    });

    test("should reject invalid minOccurs when modifying a group reference", () => {
      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: {
          groupId: "/complexType:PersonType/sequence[0]/groupRef:PersonGroup[0]",
          minOccurs: -1,
        },
      };
      const result = validateModifyGroup(command, schemaWithRef);
      expect(result.valid).toBe(false);
    });
  });

  describe("validateModifyGroup (reference mode — complexType parent)", () => {
    let schemaWithDirectRef: schema;

    beforeEach(() => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="PersonGroup"><xs:sequence/></xs:group>
  <xs:group name="AddressGroup"><xs:sequence/></xs:group>
  <xs:complexType name="PersonType">
    <xs:group ref="PersonGroup"/>
  </xs:complexType>
</xs:schema>`;
      schemaWithDirectRef = unmarshal(schema, schemaXml);
    });

    test("should accept modifying a group ref directly on a complexType", () => {
      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: {
          groupId: "/complexType:PersonType/groupRef:PersonGroup[0]",
          ref: "AddressGroup",
        },
      };
      const result = validateModifyGroup(command, schemaWithDirectRef);
      expect(result.valid).toBe(true);
    });

    test("should reject when complexType has no group ref at all", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="PersonGroup"><xs:sequence/></xs:group>
  <xs:complexType name="PersonType">
    <xs:sequence/>
  </xs:complexType>
</xs:schema>`;
      const noGroupSchema = unmarshal(schema, schemaXml);
      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: {
          groupId: "/complexType:PersonType/groupRef:PersonGroup[0]",
          minOccurs: 0,
        },
      };
      const result = validateModifyGroup(command, noGroupSchema);
      expectInvalid(result);
      expect(result.error).toContain("GroupRef not found");
    });

    test("should reject when group ref name on complexType does not match the ID", () => {
      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: {
          groupId: "/complexType:PersonType/groupRef:OtherGroup[0]",
          minOccurs: 0,
        },
      };
      const result = validateModifyGroup(command, schemaWithDirectRef);
      expectInvalid(result);
      expect(result.error).toContain("GroupRef name mismatch");
    });
  });

  describe("validateModifyGroup (intermingled — definition ID with reference fields)", () => {
    let schemaWithGroup: schema;

    beforeEach(() => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="PersonGroup">
    <xs:sequence/>
  </xs:group>
</xs:schema>`;
      schemaWithGroup = unmarshal(schema, schemaXml);
    });

    test("should reject when ref is used with a definition ID", () => {
      const command = { type: "modifyGroup", payload: { groupId: "/group:PersonGroup", ref: "OtherGroup" } } as ModifyGroupCommand;
      const result = validateModifyGroup(command, schemaWithGroup);
      expectInvalid(result);
      expect(result.error).toContain("Cannot use ref, minOccurs, or maxOccurs when modifying a group definition");
    });

    test("should reject when minOccurs is used with a definition ID", () => {
      const command = { type: "modifyGroup", payload: { groupId: "/group:PersonGroup", minOccurs: 0 } } as ModifyGroupCommand;
      const result = validateModifyGroup(command, schemaWithGroup);
      expectInvalid(result);
      expect(result.error).toContain("Cannot use ref, minOccurs, or maxOccurs when modifying a group definition");
    });
  });
});

