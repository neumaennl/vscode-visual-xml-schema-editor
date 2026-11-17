/**
 * Unit tests for group executors.
 * Tests the implementation of add, remove, and modify group execution logic.
 */

import { unmarshal, marshal } from "@neumaennl/xmlbind-ts";
import type { AddGroupCommand, RemoveGroupCommand, ModifyGroupCommand } from "../../shared/types.js";
import { schema } from "../../shared/types.js";
import { executeAddGroup, executeRemoveGroup, executeModifyGroup } from "./groupExecutors.js";
import { emptySchema, schemaWith } from "../../shared/__tests__/schemaTestHelpers.js";
import { readTestSchema } from "../__tests__/resourceTestHelpers.js";

/**
 * Executes an `addGroup` command.
 *
 * @param schemaObj - The schema to change
 * @param payload - The payload of the command
 */
function addGroup(schemaObj: schema, payload: AddGroupCommand["payload"]): void {
  executeAddGroup({ type: "addGroup", payload }, schemaObj);
}

/**
 * Executes a `modifyGroup` command.
 *
 * @param schemaObj - The schema to change
 * @param payload - The payload of the command
 */
function modifyGroup(schemaObj: schema, payload: ModifyGroupCommand["payload"]): void {
  executeModifyGroup({ type: "modifyGroup", payload }, schemaObj);
}

/**
 * Executes a `removeGroup` command.
 *
 * @param schemaObj - The schema to change
 * @param payload - The payload of the command
 */
function removeGroup(schemaObj: schema, payload: RemoveGroupCommand["payload"]): void {
  executeRemoveGroup({ type: "removeGroup", payload }, schemaObj);
}

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

/**
 * Returns the documentation texts of the first group reference in the sequence of the first complexType.
 *
 * @param schemaObj - The schema object
 * @returns The texts
 */
function firstGroupRefDocumentation(schemaObj: schema): Array<string | undefined> {
  const ref = schemaObj.complexType?.[0]!.sequence?.group?.[0];
  return (ref?.annotation?.documentation ?? []).map((d) => d.value);
}

describe("Group Executors", () => {
  describe("executeAddGroup", () => {
    test.each(["sequence", "choice", "all"] as const)("should add a group with a %s content model", (model) => {
      const schemaObj = emptySchema();

      addGroup(schemaObj, { groupName: "PersonGroup", contentModel: model });

      expect(schemaObj.group).toHaveLength(1);
      const grp = schemaObj.group![0]!;
      expect(grp.name).toBe("PersonGroup");
      expect((["sequence", "choice", "all"] as const).filter((m) => grp[m] !== undefined)).toEqual([model]);
    });

    test("should add a group with documentation", () => {
      const schemaObj = emptySchema();

      addGroup(schemaObj, {
        groupName: "DocGroup",
        contentModel: "sequence",
        documentation: "A documented group",
      });

      const grp = schemaObj.group![0]!;
      expect(grp.annotation).toBeDefined();
      expect(grp.annotation!.documentation![0]!.value).toBe("A documented group");
    });

    test("should append to existing groups", () => {
      const schemaObj = schemaWith(`<xs:group name="ExistingGroup">
  <xs:sequence/>
</xs:group>`);

      addGroup(schemaObj, {
        groupName: "NewGroup",
        contentModel: "choice",
      });

      expect(schemaObj.group ?? []).toHaveLength(2);
      expect((schemaObj.group ?? [])[1]!.name).toBe("NewGroup");
    });

    test("should produce valid XSD output (round-trip)", () => {
      const schemaObj = emptySchema();

      addGroup(schemaObj, {
        groupName: "MyGroup",
        contentModel: "sequence",
      });

      const groups = unmarshal(schema, marshal(schemaObj)).group ?? [];
      expect(groups).toHaveLength(1);
      expect(groups[0]!.name).toBe("MyGroup");
      expect(groups[0]!.sequence).toBeDefined();
    });
  });

  describe("executeRemoveGroup", () => {
    test("should remove a group by ID", () => {
      const schemaObj = schemaWith(`<xs:group name="PersonGroup">
  <xs:sequence/>
</xs:group>`);

      removeGroup(schemaObj, {
        groupId: "/group:PersonGroup",
      });

      expect(schemaObj.group).toBeUndefined();
    });

    test("should remove one group while leaving others intact", () => {
      const schemaObj = schemaWith(`<xs:group name="GroupA">
  <xs:sequence/>
</xs:group>
<xs:group name="GroupB">
  <xs:choice/>
</xs:group>`);

      removeGroup(schemaObj, {
        groupId: "/group:GroupA",
      });

      expect(schemaObj.group ?? []).toHaveLength(1);
      expect((schemaObj.group ?? [])[0]!.name).toBe("GroupB");
    });

    test("should remove a compositor group from a complexType", () => {
      const schemaObj = readTestSchema(PERSON_TYPE_WITH_NAME_XSD);

      removeGroup(schemaObj, {
        groupId: "/complexType:PersonType/group:sequence[0]",
      });

      expect((schemaObj.complexType ?? [])[0]!.sequence).toBeUndefined();
    });
  });

  describe("executeModifyGroup", () => {
    test("should rename a group", () => {
      const schemaObj = schemaWith(`<xs:group name="OldName">
  <xs:sequence/>
</xs:group>`);

      modifyGroup(schemaObj, {
        groupId: "/group:OldName",
        groupName: "NewName",
      });

      const grp = (schemaObj.group ?? [])[0]!;
      expect(grp.name).toBe("NewName");
    });

    test("should rename group refs when a top-level group is renamed", () => {
      const schemaObj = schemaWith(`<xs:group name="OldName">
  <xs:sequence/>
</xs:group>
<xs:complexType name="Wrapper">
  <xs:group ref="OldName"/>
</xs:complexType>`);

      modifyGroup(schemaObj, {
        groupId: "/group:OldName",
        groupName: "NewName",
      });

      expect((schemaObj.group ?? [])[0]!.name).toBe("NewName");
      expect((schemaObj.complexType ?? [])[0]!.group!.ref).toBe("NewName");
    });

    test("should change the content model of a group", () => {
      const schemaObj = schemaWith(`<xs:group name="MyGroup">
  <xs:sequence/>
</xs:group>`);

      modifyGroup(schemaObj, {
        groupId: "/group:MyGroup",
        contentModel: "choice",
      });

      const grp = (schemaObj.group ?? [])[0]!;
      expect(grp.choice).toBeDefined();
      expect(grp.sequence).toBeUndefined();
      expect(grp.all).toBeUndefined();
    });

    test("should update the documentation of a group", () => {
      const schemaObj = schemaWith(`<xs:group name="DocGroup">
  <xs:sequence/>
</xs:group>`);

      modifyGroup(schemaObj, {
        groupId: "/group:DocGroup",
        documentation: "Updated documentation",
      });

      const grp = (schemaObj.group ?? [])[0]!;
      expect(grp.annotation).toBeDefined();
      expect(grp.annotation!.documentation![0]!.value).toBe("Updated documentation");
    });

    test("should update name, content model, and documentation together", () => {
      const schemaObj = schemaWith(`<xs:group name="OriginalGroup">
  <xs:sequence/>
</xs:group>`);

      modifyGroup(schemaObj, {
        groupId: "/group:OriginalGroup",
        groupName: "UpdatedGroup",
        contentModel: "all",
        documentation: "New doc",
      });

      const grp = (schemaObj.group ?? [])[0]!;
      expect(grp.name).toBe("UpdatedGroup");
      expect(grp.all).toBeDefined();
      expect(grp.sequence).toBeUndefined();
      expect(grp.annotation!.documentation![0]!.value).toBe("New doc");
    });

    test("should leave unchanged properties untouched", () => {
      const schemaObj = schemaWith(`<xs:group name="StableGroup">
  <xs:sequence/>
</xs:group>`);

      modifyGroup(schemaObj, {
        groupId: "/group:StableGroup",
        // No changes provided
      });

      const grp = (schemaObj.group ?? [])[0]!;
      expect(grp.name).toBe("StableGroup");
      expect(grp.sequence).toBeDefined();
    });

    test("should modify occurrence constraints on a compositor group", () => {
      const schemaObj = readTestSchema(PERSON_TYPE_WITH_NAME_XSD);

      modifyGroup(schemaObj, {
        groupId: "/complexType:PersonType/group:sequence[0]",
        minOccurs: 0,
        maxOccurs: "unbounded",
      });

      const sequence = (schemaObj.complexType ?? [])[0]!.sequence;
      expect(sequence?.minOccurs).toBe(0);
      expect(sequence?.maxOccurs).toBe("unbounded");
    });
  });

  describe("Group References (via addGroup/removeGroup/modifyGroup)", () => {
    describe("executeAddGroup (reference mode)", () => {
      test("should add a group reference to a sequence", () => {
        const schemaObj = readTestSchema(TWO_GROUPS_AND_PERSON_XSD);

        addGroup(schemaObj, {
          ref: "PersonGroup",
          parentId: "/complexType:PersonType/group:sequence[0]",
        });

        const ct = (schemaObj.complexType ?? [])[0]!;
        const refs = ct.sequence!.group ?? [];
        expect(refs).toHaveLength(1);
        expect(refs[0]!.ref).toBe("PersonGroup");
      });

      test("should add a group reference with minOccurs and maxOccurs", () => {
        const schemaObj = readTestSchema(TWO_GROUPS_AND_PERSON_XSD);

        addGroup(schemaObj, {
          ref: "PersonGroup",
          parentId: "/complexType:PersonType/group:sequence[0]",
          minOccurs: 0,
          maxOccurs: "unbounded",
        });

        const ref = ((schemaObj.complexType ?? [])[0]!.sequence!.group ?? [])[0]!;
        expect(ref.ref).toBe("PersonGroup");
        expect(ref.minOccurs).toBe(0);
        expect(ref.maxOccurs).toBe("unbounded");
      });

      test("should add multiple group references to the same sequence", () => {
        const schemaObj = readTestSchema(TWO_GROUPS_AND_PERSON_XSD);

        executeAddGroup(
          { type: "addGroup", payload: { ref: "PersonGroup", parentId: "/complexType:PersonType/group:sequence[0]" } },
          schemaObj
        );
        executeAddGroup(
          { type: "addGroup", payload: { ref: "AddressGroup", parentId: "/complexType:PersonType/group:sequence[0]" } },
          schemaObj
        );

        const refs = (schemaObj.complexType ?? [])[0]!.sequence!.group ?? [];
        expect(refs).toHaveLength(2);
        expect(refs[0]!.ref).toBe("PersonGroup");
        expect(refs[1]!.ref).toBe("AddressGroup");
      });

      test("should add a direct group reference on a complexType", () => {
        const schemaObj = readTestSchema(TWO_GROUPS_AND_PERSON_XSD);

        addGroup(schemaObj, {
          ref: "PersonGroup",
          parentId: "/complexType:PersonType",
        });

        const ct = (schemaObj.complexType ?? [])[0]!;
        expect(ct.group).toBeDefined();
        expect(ct.group!.ref).toBe("PersonGroup");
      });

      test("should add a group reference with documentation annotation", () => {
        const schemaObj = readTestSchema(TWO_GROUPS_AND_PERSON_XSD);

        addGroup(schemaObj, {
          ref: "PersonGroup",
          parentId: "/complexType:PersonType/group:sequence[0]",
          documentation: "A person group ref annotation",
        });

        expect(firstGroupRefDocumentation(schemaObj)).toEqual(["A person group ref annotation"]);
      });
    });

    describe("executeRemoveGroup (reference mode)", () => {
      test("should remove a group reference from a sequence", () => {
        const schemaObj = schemaWith(PERSON_TYPE_WITH_GROUP_REF);

        removeGroup(schemaObj, { groupId: "/complexType:PersonType/group:sequence[0]/groupRef:PersonGroup[0]" });

        const refs = (schemaObj.complexType ?? [])[0]!.sequence?.group ?? [];
        expect(refs).toHaveLength(0);
      });

      test("should remove only the matching group reference, leaving others intact", () => {
        const schemaObj = readTestSchema("person-type-with-two-group-refs-in-sequence.xsd");

        removeGroup(schemaObj, { groupId: "/complexType:PersonType/group:sequence[0]/groupRef:PersonGroup[0]" });

        const refs = (schemaObj.complexType ?? [])[0]!.sequence!.group ?? [];
        expect(refs).toHaveLength(1);
        expect(refs[0]!.ref).toBe("AddressGroup");
      });

      test("should remove a direct group ref from a complexType", () => {
        const schemaObj = readTestSchema("person-type-with-group-ref.xsd");

        removeGroup(schemaObj, { groupId: "/complexType:PersonType/groupRef:PersonGroup[0]" });

        const ct = (schemaObj.complexType ?? [])[0]!;
        expect(ct.group).toBeUndefined();
      });
    });

    describe("executeModifyGroup (reference mode)", () => {
      test("should change the ref target of a group reference", () => {
        const schemaObj = schemaWith(PERSON_TYPE_WITH_GROUP_REF);

        modifyGroup(schemaObj, {
          groupId: "/complexType:PersonType/group:sequence[0]/groupRef:PersonGroup[0]",
          ref: "AddressGroup",
        });

        const refs = (schemaObj.complexType ?? [])[0]!.sequence!.group ?? [];
        expect(refs[0]!.ref).toBe("AddressGroup");
      });

      test("should update minOccurs and maxOccurs on a group reference", () => {
        const schemaObj = schemaWith(PERSON_TYPE_WITH_GROUP_REF);

        modifyGroup(schemaObj, {
          groupId: "/complexType:PersonType/group:sequence[0]/groupRef:PersonGroup[0]",
          minOccurs: 0,
          maxOccurs: "unbounded",
        });

        const ref = ((schemaObj.complexType ?? [])[0]!.sequence!.group ?? [])[0]!;
        expect(ref.minOccurs).toBe(0);
        expect(ref.maxOccurs).toBe("unbounded");
      });

      test("should set documentation annotation on a group reference", () => {
        const schemaObj = schemaWith(PERSON_TYPE_WITH_GROUP_REF);

        modifyGroup(schemaObj, {
          groupId: "/complexType:PersonType/group:sequence[0]/groupRef:PersonGroup[0]",
          documentation: "Updated ref annotation",
        });

        expect(firstGroupRefDocumentation(schemaObj)).toEqual(["Updated ref annotation"]);
      });

      test("should modify a direct group ref on a complexType", () => {
        const schemaObj = readTestSchema("person-type-with-one-of-two-groups.xsd");

        modifyGroup(schemaObj, {
          groupId: "/complexType:PersonType/groupRef:PersonGroup[0]",
          ref: "AddressGroup",
        });

        const ct = (schemaObj.complexType ?? [])[0]!;
        expect(ct.group!.ref).toBe("AddressGroup");
      });
    });
  });
});
