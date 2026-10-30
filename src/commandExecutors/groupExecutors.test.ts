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
} from "../../shared/types.js";
import {
  executeAddGroup,
  executeRemoveGroup,
  executeModifyGroup,
} from "./groupExecutors.js";
import { toArray } from "../../shared/schemaUtils.js";
import { emptySchema, readTestSchema, schemaWith } from "../__tests__/schemaTestHelpers.js";

/** The file with a complexType `PersonType` with the local element `name`. */
const PERSON_TYPE_WITH_NAME_XSD = "person-type-with-name-element.xsd";

/** The file with two groups and an empty complexType `PersonType`. */
const TWO_GROUPS_AND_PERSON_XSD = "two-groups-and-empty-person-type.xsd";

/** A group `PersonGroup` and a complexType `PersonType` that references it in its sequence. */
const PERSON_TYPE_WITH_GROUP_REF = `<xs:group name="PersonGroup"><xs:sequence/></xs:group>
<xs:complexType name="PersonType">
  <xs:sequence>
    <xs:group ref="PersonGroup"/>
  </xs:sequence>
</xs:complexType>`;

describe("Group Executors", () => {
  describe("executeAddGroup", () => {
    test("should add a group with a sequence content model", () => {
      const schemaObj = emptySchema();

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

    test("should add a group with a choice content model", () => {
      const schemaObj = emptySchema();

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

    test("should add a group with an all content model", () => {
      const schemaObj = emptySchema();

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

    test("should add a group with documentation", () => {
      const schemaObj = emptySchema();

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

    test("should append to existing groups", () => {
      const schemaObj = schemaWith(`<xs:group name="ExistingGroup">
  <xs:sequence/>
</xs:group>`);

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

    test("should produce valid XSD output (round-trip)", () => {
      const schemaObj = emptySchema();

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
    test("should remove a group by ID", () => {
      const schemaObj = schemaWith(`<xs:group name="PersonGroup">
  <xs:sequence/>
</xs:group>`);

      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: {
          groupId: "/group:PersonGroup",
        },
      };

      executeRemoveGroup(command, schemaObj);

      expect(schemaObj.group).toBeUndefined();
    });

    test("should remove one group while leaving others intact", () => {
      const schemaObj = schemaWith(`<xs:group name="GroupA">
  <xs:sequence/>
</xs:group>
<xs:group name="GroupB">
  <xs:choice/>
</xs:group>`);

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

    test("should remove a compositor group from a complexType", () => {
      const schemaObj = readTestSchema(PERSON_TYPE_WITH_NAME_XSD);

      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: {
          groupId: "/complexType:PersonType/group:sequence[0]",
        },
      };

      executeRemoveGroup(command, schemaObj);

      expect(toArray(schemaObj.complexType)[0].sequence).toBeUndefined();
    });

  });

  describe("executeModifyGroup", () => {
    test("should rename a group", () => {
      const schemaObj = schemaWith(`<xs:group name="OldName">
  <xs:sequence/>
</xs:group>`);

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

    test("should rename group refs when a top-level group is renamed", () => {
      const schemaObj = schemaWith(`<xs:group name="OldName">
  <xs:sequence/>
</xs:group>
<xs:complexType name="Wrapper">
  <xs:group ref="OldName"/>
</xs:complexType>`);

      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: {
          groupId: "/group:OldName",
          groupName: "NewName",
        },
      };

      executeModifyGroup(command, schemaObj);

      expect(toArray(schemaObj.group)[0].name).toBe("NewName");
      expect(toArray(schemaObj.complexType)[0].group!.ref).toBe("NewName");
    });

    test("should change the content model of a group", () => {
      const schemaObj = schemaWith(`<xs:group name="MyGroup">
  <xs:sequence/>
</xs:group>`);

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

    test("should update the documentation of a group", () => {
      const schemaObj = schemaWith(`<xs:group name="DocGroup">
  <xs:sequence/>
</xs:group>`);

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

    test("should update name, content model, and documentation together", () => {
      const schemaObj = schemaWith(`<xs:group name="OriginalGroup">
  <xs:sequence/>
</xs:group>`);

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

    test("should leave unchanged properties untouched", () => {
      const schemaObj = schemaWith(`<xs:group name="StableGroup">
  <xs:sequence/>
</xs:group>`);

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

    test("should modify occurrence constraints on a compositor group", () => {
      const schemaObj = readTestSchema(PERSON_TYPE_WITH_NAME_XSD);

      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: {
          groupId: "/complexType:PersonType/group:sequence[0]",
          minOccurs: 0,
          maxOccurs: "unbounded",
        },
      };

      executeModifyGroup(command, schemaObj);

      const sequence = toArray(schemaObj.complexType)[0].sequence;
      expect(sequence?.minOccurs).toBe(0);
      expect(sequence?.maxOccurs).toBe("unbounded");
    });
  });

  describe("Group References (via addGroup/removeGroup/modifyGroup)", () => {
    describe("executeAddGroup (reference mode)", () => {
      test("should add a group reference to a sequence", () => {
        const schemaObj = readTestSchema(TWO_GROUPS_AND_PERSON_XSD);

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

      test("should add a group reference with minOccurs and maxOccurs", () => {
        const schemaObj = readTestSchema(TWO_GROUPS_AND_PERSON_XSD);

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

      test("should add multiple group references to the same sequence", () => {
        const schemaObj = readTestSchema(TWO_GROUPS_AND_PERSON_XSD);

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

      test("should add a direct group reference on a complexType", () => {
        const schemaObj = readTestSchema(TWO_GROUPS_AND_PERSON_XSD);

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

      test("should add a group reference with documentation annotation", () => {
        const schemaObj = readTestSchema(TWO_GROUPS_AND_PERSON_XSD);

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
      test("should remove a group reference from a sequence", () => {
        const schemaObj = schemaWith(PERSON_TYPE_WITH_GROUP_REF);

        const command: RemoveGroupCommand = {
          type: "removeGroup",
          payload: { groupId: "/complexType:PersonType/sequence[0]/groupRef:PersonGroup[0]" },
        };

        executeRemoveGroup(command, schemaObj);

        const refs = toArray(toArray(schemaObj.complexType)[0].sequence?.group);
        expect(refs).toHaveLength(0);
      });

      test("should remove only the matching group reference, leaving others intact", () => {
        const schemaObj = readTestSchema("person-type-with-two-group-refs-in-sequence.xsd");

        const command: RemoveGroupCommand = {
          type: "removeGroup",
          payload: { groupId: "/complexType:PersonType/sequence[0]/groupRef:PersonGroup[0]" },
        };

        executeRemoveGroup(command, schemaObj);

        const refs = toArray(toArray(schemaObj.complexType)[0].sequence!.group);
        expect(refs).toHaveLength(1);
        expect(refs[0].ref).toBe("AddressGroup");
      });

      test("should remove a direct group ref from a complexType", () => {
        const schemaObj = readTestSchema("person-type-with-group-ref.xsd");

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
      test("should change the ref target of a group reference", () => {
        const schemaObj = schemaWith(PERSON_TYPE_WITH_GROUP_REF);

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

      test("should update minOccurs and maxOccurs on a group reference", () => {
        const schemaObj = schemaWith(PERSON_TYPE_WITH_GROUP_REF);

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

      test("should set documentation annotation on a group reference", () => {
        const schemaObj = schemaWith(PERSON_TYPE_WITH_GROUP_REF);

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

      test("should modify a direct group ref on a complexType", () => {
        const schemaObj = readTestSchema("person-type-with-one-of-two-groups.xsd");

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
