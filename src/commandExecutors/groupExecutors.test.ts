/**
 * Unit tests for group executors.
 * Tests the implementation of add, remove, and modify group execution logic.
 */

import { unmarshal, marshal } from "@neumaennl/xmlbind-ts";
import {
  schema,
  AddGroupCommand,
  RemoveGroupCommand,
  ModifyGroupCommand,
} from "../../shared/types";
import {
  executeAddGroup,
  executeRemoveGroup,
  executeModifyGroup,
} from "./groupExecutors";
import { toArray } from "../../shared/schemaUtils";

describe("Group Executors", () => {
  describe("executeAddGroup", () => {
    it("should add a group with a sequence content model", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddGroupCommand = {
        type: "addGroup",
        payload: {
          groupName: "PersonGroup",
          contentModel: "sequence",
        },
      };

      executeAddGroup(command, schemaObj);

      expect(schemaObj.group).toHaveLength(1);
      const grp = schemaObj.group![0];
      expect(grp.name).toBe("PersonGroup");
      expect(grp.sequence).toBeDefined();
      expect(grp.choice).toBeUndefined();
      expect(grp.all).toBeUndefined();
    });

    it("should add a group with a choice content model", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddGroupCommand = {
        type: "addGroup",
        payload: {
          groupName: "ShapeGroup",
          contentModel: "choice",
        },
      };

      executeAddGroup(command, schemaObj);

      const grp = schemaObj.group![0];
      expect(grp.choice).toBeDefined();
      expect(grp.sequence).toBeUndefined();
      expect(grp.all).toBeUndefined();
    });

    it("should add a group with an all content model", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddGroupCommand = {
        type: "addGroup",
        payload: {
          groupName: "AddressGroup",
          contentModel: "all",
        },
      };

      executeAddGroup(command, schemaObj);

      const grp = schemaObj.group![0];
      expect(grp.all).toBeDefined();
      expect(grp.sequence).toBeUndefined();
      expect(grp.choice).toBeUndefined();
    });

    it("should add a group with documentation", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddGroupCommand = {
        type: "addGroup",
        payload: {
          groupName: "DocGroup",
          contentModel: "sequence",
          documentation: "A documented group",
        },
      };

      executeAddGroup(command, schemaObj);

      const grp = schemaObj.group![0];
      expect(grp.annotation).toBeDefined();
      expect(grp.annotation!.documentation![0].value).toBe("A documented group");
    });

    it("should append to existing groups", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="ExistingGroup">
    <xs:sequence/>
  </xs:group>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddGroupCommand = {
        type: "addGroup",
        payload: {
          groupName: "NewGroup",
          contentModel: "choice",
        },
      };

      executeAddGroup(command, schemaObj);

      expect(toArray(schemaObj.group)).toHaveLength(2);
      expect(toArray(schemaObj.group)[1].name).toBe("NewGroup");
    });

    it("should produce valid XSD output (round-trip)", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddGroupCommand = {
        type: "addGroup",
        payload: {
          groupName: "MyGroup",
          contentModel: "sequence",
        },
      };

      executeAddGroup(command, schemaObj);

      const xml = marshal(schemaObj);
      const reparsed = unmarshal(schema, xml);
      const groups = toArray(reparsed.group);
      expect(groups).toHaveLength(1);
      expect(groups[0].name).toBe("MyGroup");
      expect(groups[0].sequence).toBeDefined();
    });
  });

  describe("executeRemoveGroup", () => {
    it("should remove a group by ID", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="PersonGroup">
    <xs:sequence/>
  </xs:group>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: {
          groupId: "/group:PersonGroup",
        },
      };

      executeRemoveGroup(command, schemaObj);

      expect(schemaObj.group).toBeUndefined();
    });

    it("should remove one group while leaving others intact", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="GroupA">
    <xs:sequence/>
  </xs:group>
  <xs:group name="GroupB">
    <xs:choice/>
  </xs:group>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: {
          groupId: "/group:GroupA",
        },
      };

      executeRemoveGroup(command, schemaObj);

      expect(toArray(schemaObj.group)).toHaveLength(1);
      expect(toArray(schemaObj.group)[0].name).toBe("GroupB");
    });

  });

  describe("executeModifyGroup", () => {
    it("should rename a group", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="OldName">
    <xs:sequence/>
  </xs:group>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: {
          groupId: "/group:OldName",
          groupName: "NewName",
        },
      };

      executeModifyGroup(command, schemaObj);

      const grp = toArray(schemaObj.group)[0];
      expect(grp.name).toBe("NewName");
    });

    it("should change the content model of a group", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="MyGroup">
    <xs:sequence/>
  </xs:group>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: {
          groupId: "/group:MyGroup",
          contentModel: "choice",
        },
      };

      executeModifyGroup(command, schemaObj);

      const grp = toArray(schemaObj.group)[0];
      expect(grp.choice).toBeDefined();
      expect(grp.sequence).toBeUndefined();
      expect(grp.all).toBeUndefined();
    });

    it("should update the documentation of a group", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="DocGroup">
    <xs:sequence/>
  </xs:group>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: {
          groupId: "/group:DocGroup",
          documentation: "Updated documentation",
        },
      };

      executeModifyGroup(command, schemaObj);

      const grp = toArray(schemaObj.group)[0];
      expect(grp.annotation).toBeDefined();
      expect(grp.annotation!.documentation![0].value).toBe(
        "Updated documentation"
      );
    });

    it("should update name, content model, and documentation together", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="OriginalGroup">
    <xs:sequence/>
  </xs:group>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: {
          groupId: "/group:OriginalGroup",
          groupName: "UpdatedGroup",
          contentModel: "all",
          documentation: "New doc",
        },
      };

      executeModifyGroup(command, schemaObj);

      const grp = toArray(schemaObj.group)[0];
      expect(grp.name).toBe("UpdatedGroup");
      expect(grp.all).toBeDefined();
      expect(grp.sequence).toBeUndefined();
      expect(grp.annotation!.documentation![0].value).toBe("New doc");
    });

    it("should leave unchanged properties untouched", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="StableGroup">
    <xs:sequence/>
  </xs:group>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: {
          groupId: "/group:StableGroup",
          // No changes provided
        },
      };

      executeModifyGroup(command, schemaObj);

      const grp = toArray(schemaObj.group)[0];
      expect(grp.name).toBe("StableGroup");
      expect(grp.sequence).toBeDefined();
    });
  });

  describe("Group References (via addGroup/removeGroup/modifyGroup)", () => {
    const schemaWithGroupAndType = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="PersonGroup">
    <xs:sequence/>
  </xs:group>
  <xs:group name="AddressGroup">
    <xs:sequence/>
  </xs:group>
  <xs:complexType name="PersonType">
    <xs:sequence/>
  </xs:complexType>
</xs:schema>`;

    describe("executeAddGroup (reference mode)", () => {
      it("should add a group reference to a sequence", () => {
        const schemaObj = unmarshal(schema, schemaWithGroupAndType);

        const command: AddGroupCommand = {
          type: "addGroup",
          payload: {
            ref: "PersonGroup",
            parentId: "/complexType:PersonType/sequence",
          },
        };

        executeAddGroup(command, schemaObj);

        const ct = toArray(schemaObj.complexType)[0];
        const refs = toArray(ct.sequence!.group);
        expect(refs).toHaveLength(1);
        expect(refs[0].ref).toBe("PersonGroup");
      });

      it("should add a group reference with minOccurs and maxOccurs", () => {
        const schemaObj = unmarshal(schema, schemaWithGroupAndType);

        const command: AddGroupCommand = {
          type: "addGroup",
          payload: {
            ref: "PersonGroup",
            parentId: "/complexType:PersonType/sequence",
            minOccurs: 0,
            maxOccurs: "unbounded",
          },
        };

        executeAddGroup(command, schemaObj);

        const ref = toArray(toArray(schemaObj.complexType)[0].sequence!.group)[0];
        expect(ref.ref).toBe("PersonGroup");
        expect(ref.minOccurs).toBe(0);
        expect(ref.maxOccurs).toBe("unbounded");
      });

      it("should add multiple group references to the same sequence", () => {
        const schemaObj = unmarshal(schema, schemaWithGroupAndType);

        executeAddGroup(
          { type: "addGroup", payload: { ref: "PersonGroup", parentId: "/complexType:PersonType/sequence" } },
          schemaObj
        );
        executeAddGroup(
          { type: "addGroup", payload: { ref: "AddressGroup", parentId: "/complexType:PersonType/sequence" } },
          schemaObj
        );

        const refs = toArray(toArray(schemaObj.complexType)[0].sequence!.group);
        expect(refs).toHaveLength(2);
        expect(refs[0].ref).toBe("PersonGroup");
        expect(refs[1].ref).toBe("AddressGroup");
      });

      it("should add a direct group reference on a complexType", () => {
        const schemaObj = unmarshal(schema, schemaWithGroupAndType);

        const command: AddGroupCommand = {
          type: "addGroup",
          payload: {
            ref: "PersonGroup",
            parentId: "/complexType:PersonType",
          },
        };

        executeAddGroup(command, schemaObj);

        const ct = toArray(schemaObj.complexType)[0];
        expect(ct.group).toBeDefined();
        expect(ct.group!.ref).toBe("PersonGroup");
      });

      it("should add a group reference with documentation annotation", () => {
        const schemaObj = unmarshal(schema, schemaWithGroupAndType);

        const command: AddGroupCommand = {
          type: "addGroup",
          payload: {
            ref: "PersonGroup",
            parentId: "/complexType:PersonType/sequence",
            documentation: "A person group ref annotation",
          },
        };

        executeAddGroup(command, schemaObj);

        const ref = toArray(toArray(schemaObj.complexType)[0].sequence!.group)[0];
        expect(ref.annotation).toBeDefined();
        expect(ref.annotation!.documentation![0].value).toBe("A person group ref annotation");
      });

    });

    describe("executeRemoveGroup (reference mode)", () => {
      it("should remove a group reference from a sequence", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="PersonGroup"><xs:sequence/></xs:group>
  <xs:complexType name="PersonType">
    <xs:sequence>
      <xs:group ref="PersonGroup"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: RemoveGroupCommand = {
          type: "removeGroup",
          payload: { groupId: "/complexType:PersonType/sequence[0]/groupRef:PersonGroup[0]" },
        };

        executeRemoveGroup(command, schemaObj);

        const refs = toArray(toArray(schemaObj.complexType)[0].sequence?.group);
        expect(refs).toHaveLength(0);
      });

      it("should remove only the matching group reference, leaving others intact", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="PersonGroup"><xs:sequence/></xs:group>
  <xs:group name="AddressGroup"><xs:sequence/></xs:group>
  <xs:complexType name="PersonType">
    <xs:sequence>
      <xs:group ref="PersonGroup"/>
      <xs:group ref="AddressGroup"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: RemoveGroupCommand = {
          type: "removeGroup",
          payload: { groupId: "/complexType:PersonType/sequence[0]/groupRef:PersonGroup[0]" },
        };

        executeRemoveGroup(command, schemaObj);

        const refs = toArray(toArray(schemaObj.complexType)[0].sequence!.group);
        expect(refs).toHaveLength(1);
        expect(refs[0].ref).toBe("AddressGroup");
      });

      it("should remove a direct group ref from a complexType", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="PersonGroup"><xs:sequence/></xs:group>
  <xs:complexType name="PersonType">
    <xs:group ref="PersonGroup"/>
  </xs:complexType>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: RemoveGroupCommand = {
          type: "removeGroup",
          payload: { groupId: "/complexType:PersonType/groupRef:PersonGroup[0]" },
        };

        executeRemoveGroup(command, schemaObj);

        const ct = toArray(schemaObj.complexType)[0];
        expect(ct.group).toBeUndefined();
      });
    });

    describe("executeModifyGroup (reference mode)", () => {
      it("should change the ref target of a group reference", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="PersonGroup"><xs:sequence/></xs:group>
  <xs:complexType name="PersonType">
    <xs:sequence>
      <xs:group ref="PersonGroup"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: ModifyGroupCommand = {
          type: "modifyGroup",
          payload: {
            groupId: "/complexType:PersonType/sequence[0]/groupRef:PersonGroup[0]",
            ref: "AddressGroup",
          },
        };

        executeModifyGroup(command, schemaObj);

        const refs = toArray(toArray(schemaObj.complexType)[0].sequence!.group);
        expect(refs[0].ref).toBe("AddressGroup");
      });

      it("should update minOccurs and maxOccurs on a group reference", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="PersonGroup"><xs:sequence/></xs:group>
  <xs:complexType name="PersonType">
    <xs:sequence>
      <xs:group ref="PersonGroup"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: ModifyGroupCommand = {
          type: "modifyGroup",
          payload: {
            groupId: "/complexType:PersonType/sequence[0]/groupRef:PersonGroup[0]",
            minOccurs: 0,
            maxOccurs: "unbounded",
          },
        };

        executeModifyGroup(command, schemaObj);

        const ref = toArray(toArray(schemaObj.complexType)[0].sequence!.group)[0];
        expect(ref.minOccurs).toBe(0);
        expect(ref.maxOccurs).toBe("unbounded");
      });

      it("should set documentation annotation on a group reference", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="PersonGroup"><xs:sequence/></xs:group>
  <xs:complexType name="PersonType">
    <xs:sequence>
      <xs:group ref="PersonGroup"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: ModifyGroupCommand = {
          type: "modifyGroup",
          payload: {
            groupId: "/complexType:PersonType/sequence[0]/groupRef:PersonGroup[0]",
            documentation: "Updated ref annotation",
          },
        };

        executeModifyGroup(command, schemaObj);

        const ref = toArray(toArray(schemaObj.complexType)[0].sequence!.group)[0];
        expect(ref.annotation).toBeDefined();
        expect(ref.annotation!.documentation![0].value).toBe("Updated ref annotation");
      });

      it("should modify a direct group ref on a complexType", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="PersonGroup"><xs:sequence/></xs:group>
  <xs:group name="AddressGroup"><xs:sequence/></xs:group>
  <xs:complexType name="PersonType">
    <xs:group ref="PersonGroup"/>
  </xs:complexType>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: ModifyGroupCommand = {
          type: "modifyGroup",
          payload: {
            groupId: "/complexType:PersonType/groupRef:PersonGroup[0]",
            ref: "AddressGroup",
          },
        };

        executeModifyGroup(command, schemaObj);

        const ct = toArray(schemaObj.complexType)[0];
        expect(ct.group!.ref).toBe("AddressGroup");
      });
    });
  });
});
