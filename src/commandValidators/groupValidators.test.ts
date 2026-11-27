/**
 * Unit tests for group validators.
 */

import type { schema } from "../../shared/types.js";
import type { AddGroupCommand, RemoveGroupCommand, ModifyGroupCommand } from "../../shared/types.js";
import { validateAddGroup, validateRemoveGroup, validateModifyGroup } from "./groupValidators.js";
import { expectInvalid } from "../../shared/__tests__/validationTestHelpers.js";
import { localElementPlaces } from "../__tests__/referenceTestHelpers.js";
import { emptySchema, schemaWith } from "../../shared/__tests__/schemaTestHelpers.js";
import { readTestSchema } from "../__tests__/resourceTestHelpers.js";

/** The file with a complexType `PersonType` with the local element `name`. */
const PERSON_TYPE_WITH_NAME_XSD = "person-type-with-name-element.xsd";

/** The file with a complexType `PersonType` with a group reference in its sequence. */
const GROUP_REF_IN_SEQUENCE_XSD = "person-type-with-group-ref-in-sequence.xsd";

/** The file with a complexType `PersonType` with a direct group reference. */
const DIRECT_GROUP_REF_XSD = "person-type-with-group-ref.xsd";

/** A group `PersonGroup` and a complexType `PersonType` with an empty sequence. */
const PERSON_GROUP_AND_EMPTY_PERSON_TYPE = `<xs:group name="PersonGroup"><xs:sequence/></xs:group>
<xs:complexType name="PersonType">
  <xs:sequence/>
</xs:complexType>`;

/** A complexType whose sequence references `CommonGroup` and `OtherGroup`, in this order. */
const TWO_REFS = `<xs:complexType name="T"><xs:sequence><xs:group ref="CommonGroup"/><xs:group ref="OtherGroup"/></xs:sequence></xs:complexType>`;

/**
 * Unmarshals a schema with the groups `CommonGroup` and `OtherGroup` and the given content.
 *
 * @param body - The XSD content after the two group definitions
 * @returns The schema object
 */
function schemaWithGroups(body: string): schema {
  return schemaWith(`<xs:group name="CommonGroup"><xs:sequence/></xs:group>
<xs:group name="OtherGroup"><xs:sequence/></xs:group>
${body}`);
}

/** A local element whose inline complexType references the group `REF`. */
const LOCAL_ELEMENT_WITH_REF = `<xs:element name="child"><xs:complexType><xs:sequence><xs:group ref="REF"/></xs:sequence></xs:complexType></xs:element>`;

/**
 * Places where XML Schema allows a reference to a group, as schema content in which
 * `REF` stands for the referenced group.
 */
const REFERENCE_PLACES: Array<[string, string]> = [
  [
    "the sequence of a complexType",
    `<xs:complexType name="T"><xs:sequence><xs:group ref="REF"/></xs:sequence></xs:complexType>`,
  ],
  [
    "the choice of a complexType",
    `<xs:complexType name="T"><xs:choice><xs:group ref="REF"/></xs:choice></xs:complexType>`,
  ],
  ["a complexType itself", `<xs:complexType name="T"><xs:group ref="REF"/></xs:complexType>`],
  [
    "the inline complexType of a top-level element",
    `<xs:element name="root"><xs:complexType><xs:sequence><xs:group ref="REF"/></xs:sequence></xs:complexType></xs:element>`,
  ],
  [
    "the sequence of another group",
    `<xs:group name="Combined"><xs:sequence><xs:group ref="REF"/></xs:sequence></xs:group>`,
  ],
  [
    "a choice nested in the sequence of a complexType",
    `<xs:complexType name="T"><xs:sequence><xs:choice><xs:group ref="REF"/></xs:choice></xs:sequence></xs:complexType>`,
  ],
  [
    "a sequence nested in the choice of a complexType",
    `<xs:complexType name="T"><xs:choice><xs:sequence><xs:group ref="REF"/></xs:sequence></xs:choice></xs:complexType>`,
  ],
  [
    "a complexContent extension",
    `<xs:complexType name="Base"/>
     <xs:complexType name="Derived"><xs:complexContent><xs:extension base="Base"><xs:group ref="REF"/></xs:extension></xs:complexContent></xs:complexType>`,
  ],
  [
    "the sequence of a complexContent extension",
    `<xs:complexType name="Base"/>
     <xs:complexType name="Derived"><xs:complexContent><xs:extension base="Base"><xs:sequence><xs:group ref="REF"/></xs:sequence></xs:extension></xs:complexContent></xs:complexType>`,
  ],
  [
    "the choice of a complexContent extension",
    `<xs:complexType name="Base"/>
     <xs:complexType name="Derived"><xs:complexContent><xs:extension base="Base"><xs:choice><xs:group ref="REF"/></xs:choice></xs:extension></xs:complexContent></xs:complexType>`,
  ],
  [
    "a complexContent restriction",
    `<xs:complexType name="Derived"><xs:complexContent><xs:restriction base="xs:anyType"><xs:group ref="REF"/></xs:restriction></xs:complexContent></xs:complexType>`,
  ],
  [
    "the sequence of a complexContent restriction",
    `<xs:complexType name="Derived"><xs:complexContent><xs:restriction base="xs:anyType"><xs:sequence><xs:group ref="REF"/></xs:sequence></xs:restriction></xs:complexContent></xs:complexType>`,
  ],
  [
    "the choice of a complexContent restriction",
    `<xs:complexType name="Derived"><xs:complexContent><xs:restriction base="xs:anyType"><xs:choice><xs:group ref="REF"/></xs:choice></xs:restriction></xs:complexContent></xs:complexType>`,
  ],
  ["the choice of another group", `<xs:group name="Combined"><xs:choice><xs:group ref="REF"/></xs:choice></xs:group>`],
  ...localElementPlaces(LOCAL_ELEMENT_WITH_REF),
];

describe("Group Validators", () => {
  let schemaObj: schema;

  beforeEach(() => {
    schemaObj = emptySchema();
  });

  describe("validateAddGroup", () => {
    test("should reject addGroup with missing groupName", () => {
      const command: AddGroupCommand = {
        type: "addGroup",
        payload: {
          groupName: "",
          compositor: "sequence",
        },
      };

      const result = validateAddGroup(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Group name must be a valid XML name");
    });

    test("should reject addGroup with missing compositor", () => {
      const command = { type: "addGroup", payload: { groupName: "TestGroup" } } as AddGroupCommand;

      const result = validateAddGroup(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Compositor is required");
    });

    test("should reject addGroup when group name already exists", () => {
      const schemaWithGroup = schemaWith(`<xs:group name="ExistingGroup">
  <xs:sequence/>
</xs:group>`);

      const command: AddGroupCommand = {
        type: "addGroup",
        payload: {
          groupName: "ExistingGroup",
          compositor: "sequence",
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
          compositor: "sequence",
        },
      };

      const result = validateAddGroup(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test.each([
      {
        case: "both ref and groupName are provided",
        payload: { ref: "SomeGroup", groupName: "AlsoAGroup", parentId: "/complexType:PersonType/sequence[0]" },
        error: "Cannot combine ref with groupName or compositor",
      },
      {
        case: "both ref and compositor are provided",
        payload: { ref: "SomeGroup", compositor: "sequence", parentId: "/complexType:PersonType/sequence[0]" },
        error: "Cannot combine ref with groupName or compositor",
      },
      {
        case: "a definition has a parentId",
        payload: { groupName: "SomeGroup", compositor: "sequence", parentId: "/complexType:PersonType/sequence[0]" },
        error: "Cannot combine groupName/compositor with parentId",
      },
      {
        case: "a definition has minOccurs",
        payload: { groupName: "SomeGroup", compositor: "sequence", minOccurs: 0 },
        error: "Cannot combine groupName/compositor with parentId",
      },
    ])("should reject addGroup when $case", ({ payload, error }) => {
      const command = { type: "addGroup", payload } as AddGroupCommand;

      const result = validateAddGroup(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain(error);
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
      const schemaWithGroup = schemaWith(`<xs:group name="MyGroup">
  <xs:sequence/>
</xs:group>`);

      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: {
          groupId: "/group:MyGroup",
        },
      };

      const result = validateRemoveGroup(command, schemaWithGroup);
      expect(result.valid).toBe(true);
    });

    test("should reject a compositor, which has commands of its own", () => {
      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: {
          groupId: "/complexType:PersonType/sequence[0]",
        },
      };

      const result = validateRemoveGroup(command, readTestSchema(PERSON_TYPE_WITH_NAME_XSD));
      expectInvalid(result);
      expect(result.error).toBe("'/complexType:PersonType/sequence[0]' is a compositor, which has commands of its own");
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
      const schemaWithGroup = schemaWith(`<xs:group name="MyGroup">
  <xs:sequence/>
</xs:group>`);

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

    test("should reject stale group rename replay after a successful rename", () => {
      const renamedSchema = schemaWith(`<xs:group name="UpdatedGroup">
  <xs:sequence/>
</xs:group>`);
      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: {
          groupId: "/group:MyGroup",
          groupName: "UpdatedGroup",
        },
      };

      const result = validateModifyGroup(command, renamedSchema);
      expectInvalid(result);
      expect(result.error).toBe("Group not found: /group:MyGroup");
    });

    test("should reject a compositor, which has commands of its own", () => {
      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: {
          groupId: "/complexType:PersonType/sequence[0]",
          minOccurs: 0,
        },
      };

      const result = validateModifyGroup(command, readTestSchema(PERSON_TYPE_WITH_NAME_XSD));
      expectInvalid(result);
      expect(result.error).toBe("'/complexType:PersonType/sequence[0]' is a compositor, which has commands of its own");
    });
  });

  describe("validateAddGroup (reference mode)", () => {
    let schemaWithGroup: schema;

    beforeEach(() => {
      schemaWithGroup = schemaWith(`<xs:group name="PersonGroup">
  <xs:sequence/>
</xs:group>
<xs:complexType name="PersonType">
  <xs:sequence/>
</xs:complexType>`);
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
        payload: { ref: "123-invalid", parentId: "/complexType:PersonType/sequence[0]" },
      };
      const result = validateAddGroup(command, schemaWithGroup);
      expectInvalid(result);
      expect(result.error).toBe("Group ref must be a valid QName");
    });

    test("should reject when referenced group does not exist", () => {
      const command: AddGroupCommand = {
        type: "addGroup",
        payload: { ref: "NoSuchGroup", parentId: "/complexType:PersonType/sequence[0]" },
      };
      const result = validateAddGroup(command, schemaWithGroup);
      expectInvalid(result);
      expect(result.error).toBe("Referenced group does not exist: NoSuchGroup");
    });

    test("should reject when parent node does not exist", () => {
      const command: AddGroupCommand = {
        type: "addGroup",
        payload: { ref: "PersonGroup", parentId: "/complexType:NoSuchType/sequence[0]" },
      };
      const result = validateAddGroup(command, schemaWithGroup);
      expectInvalid(result);
      expect(result.error).toContain("Parent node not found");
    });

    test("should accept a valid group reference", () => {
      const command: AddGroupCommand = {
        type: "addGroup",
        payload: { ref: "PersonGroup", parentId: "/complexType:PersonType/sequence[0]" },
      };
      const result = validateAddGroup(command, schemaWithGroup);
      expect(result.valid).toBe(true);
    });

    test("should accept a group reference with documentation", () => {
      const command: AddGroupCommand = {
        type: "addGroup",
        payload: {
          ref: "PersonGroup",
          parentId: "/complexType:PersonType/sequence[0]",
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
          parentId: "/complexType:PersonType/sequence[0]",
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
          parentId: "/complexType:PersonType/sequence[0]",
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
          parentId: "/complexType:PersonType/sequence[0]",
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
      const emptySchema = schemaWith(`<xs:group name="PersonGroup"><xs:sequence/></xs:group>
<xs:complexType name="EmptyType"/>`);
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
      schemaWithRef = readTestSchema(GROUP_REF_IN_SEQUENCE_XSD);
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
      const schemaWithDirectRef = readTestSchema(DIRECT_GROUP_REF_XSD);
      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: { groupId: "/complexType:PersonType/groupRef:PersonGroup[0]" },
      };
      const result = validateRemoveGroup(command, schemaWithDirectRef);
      expect(result.valid).toBe(true);
    });

    test("should reject removing a direct group ref from a complexType when the ref name does not match", () => {
      const schemaWithDirectRef = readTestSchema(DIRECT_GROUP_REF_XSD);
      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: { groupId: "/complexType:PersonType/groupRef:OtherGroup[0]" },
      };
      const result = validateRemoveGroup(command, schemaWithDirectRef);
      expectInvalid(result);
      expect(result.error).toContain("GroupRef name mismatch");
    });

    test("should reject removing a direct group ref from a complexType that has no group", () => {
      const schemaNoDirectGroup = schemaWith(PERSON_GROUP_AND_EMPTY_PERSON_TYPE);
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
      schemaWithRef = readTestSchema("person-type-with-one-of-two-groups-in-sequence.xsd");
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
      const command = {
        type: "modifyGroup",
        payload: {
          groupId: "/complexType:PersonType/sequence[0]/groupRef:PersonGroup[0]",
          groupName: "RenamedGroup",
        },
      } as ModifyGroupCommand;
      const result = validateModifyGroup(command, schemaWithRef);
      expectInvalid(result);
      expect(result.error).toContain("Cannot use groupName or compositor when modifying a group reference");
    });

    test("should reject when compositor is used with a group reference ID", () => {
      const command = {
        type: "modifyGroup",
        payload: {
          groupId: "/complexType:PersonType/sequence[0]/groupRef:PersonGroup[0]",
          compositor: "choice",
        },
      } as ModifyGroupCommand;
      const result = validateModifyGroup(command, schemaWithRef);
      expectInvalid(result);
      expect(result.error).toContain("Cannot use groupName or compositor when modifying a group reference");
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
      schemaWithDirectRef = readTestSchema("person-type-with-one-of-two-groups.xsd");
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
      const noGroupSchema = schemaWith(PERSON_GROUP_AND_EMPTY_PERSON_TYPE);
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
      schemaWithGroup = schemaWith(`<xs:group name="PersonGroup">
  <xs:sequence/>
</xs:group>`);
    });

    test("should reject when ref is used with a definition ID", () => {
      const command = {
        type: "modifyGroup",
        payload: { groupId: "/group:PersonGroup", ref: "OtherGroup" },
      } as ModifyGroupCommand;
      const result = validateModifyGroup(command, schemaWithGroup);
      expectInvalid(result);
      expect(result.error).toContain("Cannot use ref, minOccurs, or maxOccurs when modifying a group definition");
    });

    test("should reject when minOccurs is used with a definition ID", () => {
      const command = {
        type: "modifyGroup",
        payload: { groupId: "/group:PersonGroup", minOccurs: 0 },
      } as ModifyGroupCommand;
      const result = validateModifyGroup(command, schemaWithGroup);
      expectInvalid(result);
      expect(result.error).toContain("Cannot use ref, minOccurs, or maxOccurs when modifying a group definition");
    });
  });
  describe("validateRemoveGroup (references in all places of the schema)", () => {
    test.each(REFERENCE_PLACES)("should reject removing a group that is referenced in %s", (_, body) => {
      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: { groupId: "/group:CommonGroup" },
      };

      const result = validateRemoveGroup(command, schemaWithGroups(body.replace(/REF/g, "CommonGroup")));
      expectInvalid(result);
      expect(result.error).toBe("Group is still referenced and cannot be removed: CommonGroup");
    });

    test.each(REFERENCE_PLACES)(
      "should accept removing a group when only another group is referenced in %s",
      (_, body) => {
        const command: RemoveGroupCommand = {
          type: "removeGroup",
          payload: { groupId: "/group:CommonGroup" },
        };

        const result = validateRemoveGroup(command, schemaWithGroups(body.replace(/REF/g, "OtherGroup")));
        expect(result.valid).toBe(true);
      }
    );
  });

  describe("group references in compositors", () => {
    test("should accept removing a reference identified by name and position", () => {
      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: { groupId: "/complexType:T/sequence[0]/groupRef:OtherGroup[1]" },
      };

      const result = validateRemoveGroup(command, schemaWithGroups(TWO_REFS));
      expect(result.valid).toBe(true);
    });

    // The diagram builder always generates groupRef IDs with name and position
    test.each([
      "/complexType:T/sequence[0]/groupRef:OtherGroup",
      "/complexType:T/sequence[0]/groupRef[1]",
      "/complexType:T/sequence[0]/groupRef",
    ])("should reject removing a reference whose ID %s lacks the name or the position", (groupId) => {
      const result = validateRemoveGroup({ type: "removeGroup", payload: { groupId } }, schemaWithGroups(TWO_REFS));

      expect(result).toEqual({ valid: false, error: `Invalid groupRef ID: ${groupId}` });
    });

    test("should reject removing a reference whose name is at another position", () => {
      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: { groupId: "/complexType:T/sequence[0]/groupRef:OtherGroup[0]" },
      };

      const result = validateRemoveGroup(command, schemaWithGroups(TWO_REFS));
      expectInvalid(result);
      expect(result.error).toBe("GroupRef not found: /complexType:T/sequence[0]/groupRef:OtherGroup[0]");
    });

    test("should reject removing a reference ID without a parent", () => {
      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: { groupId: "/groupRef:CommonGroup[0]" },
      };

      const result = validateRemoveGroup(command, schemaWithGroups(TWO_REFS));
      expectInvalid(result);
      expect(result.error).toBe("Invalid groupRef ID: /groupRef:CommonGroup[0]");
    });

    test("should reject modifying a reference that is not in the sequence", () => {
      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: { groupId: "/complexType:T/sequence[0]/groupRef:Missing[0]", ref: "OtherGroup" },
      };

      const result = validateModifyGroup(command, schemaWithGroups(TWO_REFS));
      expectInvalid(result);
      expect(result.error).toBe("GroupRef not found: /complexType:T/sequence[0]/groupRef:Missing[0]");
    });

    test("should reject modifying a reference ID without a parent", () => {
      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: { groupId: "/groupRef:CommonGroup[0]", ref: "OtherGroup" },
      };

      const result = validateModifyGroup(command, schemaWithGroups(TWO_REFS));
      expectInvalid(result);
      expect(result.error).toBe("Invalid groupRef ID: /groupRef:CommonGroup[0]");
    });

    test("should reject modifying a reference whose parent does not exist", () => {
      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: { groupId: "/complexType:Missing/sequence[0]/groupRef:CommonGroup[0]", ref: "OtherGroup" },
      };

      const result = validateModifyGroup(command, schemaWithGroups(TWO_REFS));
      expectInvalid(result);
      expect(result.error).toBe("Parent node not found: /complexType:Missing/sequence[0]");
    });

    test("should reject a new ref that is not a valid XML name", () => {
      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: { groupId: "/complexType:T/sequence[0]/groupRef:CommonGroup[0]", ref: "123-invalid" },
      };

      const result = validateModifyGroup(command, schemaWithGroups(TWO_REFS));
      expectInvalid(result);
      expect(result.error).toBe("Group ref must be a valid QName");
    });
  });

  describe("parents and compositors", () => {
    test("should reject a group reference directly in an element", () => {
      const command: AddGroupCommand = {
        type: "addGroup",
        payload: { ref: "CommonGroup", parentId: "/element:root" },
      };

      const result = validateAddGroup(command, schemaWithGroups(`<xs:element name="root" type="xs:string"/>`));
      expectInvalid(result);
      expect(result.error).toBe("Cannot add group ref to parent type: topLevelElement");
    });

    test("should reject a group reference in an all, which XML Schema 1.0 does not allow", () => {
      const command: AddGroupCommand = {
        type: "addGroup",
        payload: { ref: "CommonGroup", parentId: "/complexType:T/all[0]" },
      };

      const result = validateAddGroup(command, schemaWithGroups(`<xs:complexType name="T"><xs:all/></xs:complexType>`));
      expectInvalid(result);
      expect(result.error).toBe("Cannot add group ref to parent type: all");
    });

    test("should reject a definition without groupName and ref", () => {
      const command: AddGroupCommand = {
        type: "addGroup",
        payload: { compositor: "sequence" },
      };

      const result = validateAddGroup(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Group name must be a valid XML name");
    });

    test("should reject a definition with a compositor other than sequence, choice or all", () => {
      // eslint-disable-next-line no-restricted-syntax -- an invalid compositor, as the webview could send it, which TypeScript does not allow
      const command = {
        type: "addGroup",
        payload: { groupName: "NewGroup", compositor: "simpleContent" },
      } as unknown as AddGroupCommand;

      const result = validateAddGroup(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Compositor must be one of: sequence, choice, all");
    });

    test("should reject renaming a definition to an invalid XML name", () => {
      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: { groupId: "/group:CommonGroup", groupName: "123 bad" },
      };

      const result = validateModifyGroup(command, schemaWithGroups(""));
      expectInvalid(result);
      expect(result.error).toBe("Group name must be a valid XML name");
    });

    test("should reject changing a definition to a compositor other than sequence, choice or all", () => {
      // eslint-disable-next-line no-restricted-syntax -- an invalid compositor, as the webview could send it, which TypeScript does not allow
      const command = {
        type: "modifyGroup",
        payload: { groupId: "/group:CommonGroup", compositor: "simpleContent" },
      } as unknown as ModifyGroupCommand;

      const result = validateModifyGroup(command, schemaWithGroups(""));
      expectInvalid(result);
      expect(result.error).toBe("Compositor must be one of: sequence, choice, all");
    });
  });
});

describe("names of group definitions that another group has", () => {
  test("should reject renaming a group definition to the name of another one", () => {
    const command: ModifyGroupCommand = {
      type: "modifyGroup",
      payload: { groupId: "/group:CommonGroup", groupName: "OtherGroup" },
    };

    const result = validateModifyGroup(command, schemaWithGroups(""));
    expectInvalid(result);
    expect(result.error).toBe("Group name already exists: OtherGroup");
  });

  test("should accept the unchanged name", () => {
    const command: ModifyGroupCommand = {
      type: "modifyGroup",
      payload: { groupId: "/group:CommonGroup", groupName: "CommonGroup" },
    };

    expect(validateModifyGroup(command, schemaWithGroups(""))).toEqual({ valid: true });
  });
});

describe("compositors of group definitions that cannot become an all", () => {
  test("should reject an all for a group definition with a repeated element", () => {
    const schemaObj = schemaWith(
      `<xs:group name="G"><xs:sequence><xs:element name="a" type="xs:string" maxOccurs="2"/></xs:sequence></xs:group>`
    );

    const result = validateModifyGroup(
      { type: "modifyGroup", payload: { groupId: "/group:G", compositor: "all" } },
      schemaObj
    );

    expectInvalid(result);
    expect(result.error).toBe("Element 'a': maxOccurs of an element in an all must be 0 or 1");
  });
});
