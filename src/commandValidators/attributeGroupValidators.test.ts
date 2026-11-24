/**
 * Unit tests for attributeGroup validators.
 * Tests validation of add, remove, and modify commands for attribute group
 * definitions and attribute group references.
 */

import type { schema } from "../../shared/types.js";
import type {
  AddAttributeGroupCommand,
  RemoveAttributeGroupCommand,
  ModifyAttributeGroupCommand,
} from "../../shared/types.js";
import {
  validateAddAttributeGroup,
  validateRemoveAttributeGroup,
  validateModifyAttributeGroup,
} from "./attributeGroupValidators.js";
import { expectInvalid } from "../../shared/__tests__/validationTestHelpers.js";
import { localElementPlaces } from "../__tests__/referenceTestHelpers.js";
import { emptySchema, schemaWith, schemaWithAttrGroups } from "../../shared/__tests__/schemaTestHelpers.js";
import { readTestSchema } from "../__tests__/resourceTestHelpers.js";

/** The file with a complexType `PersonType` that references the attribute group `CommonAttrs`. */
const PERSON_TYPE_WITH_REF_XSD = "person-type-with-attribute-group-ref.xsd";

/** The file with two attribute groups and a complexType `PersonType` that references one of them. */
const ONE_OF_TWO_GROUPS_XSD = "person-type-with-one-of-two-attribute-groups.xsd";

/** The attribute group `CommonAttrs` and an empty complexType `PersonType`. */
const COMMON_ATTRS_AND_PERSON_TYPE = `<xs:attributeGroup name="CommonAttrs"/>
<xs:complexType name="PersonType"/>`;

/** A complexType `PersonType` that references the attribute group `CommonAttrs`. */
const PERSON_TYPE_WITH_COMMON_ATTRS_REF = `<xs:complexType name="PersonType"><xs:attributeGroup ref="CommonAttrs"/></xs:complexType>`;

/** An inline complexType with a reference to the attribute group `REF`, for a local element. */
const LOCAL_ELEMENT_WITH_REF = `<xs:element name="child"><xs:complexType><xs:attributeGroup ref="REF"/></xs:complexType></xs:element>`;

/** A complexType with references to `CommonAttrs` and `OtherAttrs`, in this order. */
const TWO_REFS = `<xs:complexType name="PersonType">
  <xs:attributeGroup ref="CommonAttrs"/>
  <xs:attributeGroup ref="OtherAttrs"/>
</xs:complexType>`;

/**
 * Places where XML Schema allows a reference to an attribute group, as schema content in
 * which `REF` stands for the referenced group.
 */
const REFERENCE_PLACES: Array<[string, string]> = [
  [
    "a complexContent extension",
    `<xs:complexType name="Base"/>
     <xs:complexType name="Derived"><xs:complexContent><xs:extension base="Base"><xs:attributeGroup ref="REF"/></xs:extension></xs:complexContent></xs:complexType>`,
  ],
  [
    "a complexContent restriction",
    `<xs:complexType name="Derived"><xs:complexContent><xs:restriction base="xs:anyType"><xs:attributeGroup ref="REF"/></xs:restriction></xs:complexContent></xs:complexType>`,
  ],
  [
    "a simpleContent extension",
    `<xs:complexType name="Text"><xs:simpleContent><xs:extension base="xs:string"><xs:attributeGroup ref="REF"/></xs:extension></xs:simpleContent></xs:complexType>`,
  ],
  [
    "a simpleContent restriction",
    `<xs:complexType name="Base"><xs:simpleContent><xs:extension base="xs:string"/></xs:simpleContent></xs:complexType>
     <xs:complexType name="Text"><xs:simpleContent><xs:restriction base="Base"><xs:attributeGroup ref="REF"/></xs:restriction></xs:simpleContent></xs:complexType>`,
  ],
  [
    "the inline complexType of a top-level element",
    `<xs:element name="root"><xs:complexType><xs:attributeGroup ref="REF"/></xs:complexType></xs:element>`,
  ],
  [
    "a local element whose inline complexType extends another type",
    `<xs:complexType name="Base"/>
     <xs:complexType name="T"><xs:sequence><xs:element name="child"><xs:complexType><xs:complexContent><xs:extension base="Base"><xs:attributeGroup ref="REF"/></xs:extension></xs:complexContent></xs:complexType></xs:element></xs:sequence></xs:complexType>`,
  ],
  ["another attribute group", `<xs:attributeGroup name="Combined"><xs:attributeGroup ref="REF"/></xs:attributeGroup>`],
  ...localElementPlaces(LOCAL_ELEMENT_WITH_REF),
];

/** A complexType `T` that extends `B` and references `CommonAttrs` in its extension. */
const EXTENSION_WITH_REF = `<xs:complexType name="T"><xs:complexContent><xs:extension base="B">
  <xs:attributeGroup ref="CommonAttrs"/>
</xs:extension></xs:complexContent></xs:complexType>`;

describe("AttributeGroup Validators", () => {
  let schemaObj: schema;
  let schemaWithAttrGroup: schema;

  beforeEach(() => {
    schemaObj = emptySchema();

    schemaWithAttrGroup = schemaWith(`<xs:attributeGroup name="CommonAttrs"/>`);
  });

  describe("validateAddAttributeGroup", () => {
    describe("definition mode", () => {
      test("should reject addAttributeGroup with missing groupName", () => {
        const result = validateAddAttributeGroup({ type: "addAttributeGroup", payload: { groupName: "" } }, schemaObj);
        expectInvalid(result);
        expect(result.error).toBe("Attribute group name must be a valid XML name");
      });

      test("should reject addAttributeGroup with an invalid XML name", () => {
        const result = validateAddAttributeGroup(
          { type: "addAttributeGroup", payload: { groupName: "123-invalid" } },
          schemaObj
        );
        expectInvalid(result);
        expect(result.error).toBe("Attribute group name must be a valid XML name");
      });

      test("should reject addAttributeGroup when name already exists", () => {
        const command: AddAttributeGroupCommand = {
          type: "addAttributeGroup",
          payload: { groupName: "CommonAttrs" },
        };

        const result = validateAddAttributeGroup(command, schemaWithAttrGroup);
        expectInvalid(result);
        expect(result.error).toBe("Attribute group name already exists: CommonAttrs");
      });

      test("should accept addAttributeGroup with a valid unique name", () => {
        const result = validateAddAttributeGroup(
          { type: "addAttributeGroup", payload: { groupName: "NewAttrs" } },
          schemaObj
        );
        expect(result.valid).toBe(true);
      });

      test("should reject when both groupName and parentId are provided", () => {
        const command = {
          type: "addAttributeGroup",
          payload: { groupName: "NewAttrs", parentId: "/complexType:PersonType" },
        } as AddAttributeGroupCommand;

        const result = validateAddAttributeGroup(command, schemaObj);
        expectInvalid(result);
        expect(result.error).toContain("Cannot combine groupName with parentId");
      });
    });

    describe("reference mode", () => {
      test("should accept adding a ref to a valid complexType parent", () => {
        const schemaObj2 = schemaWith(COMMON_ATTRS_AND_PERSON_TYPE);
        const command: AddAttributeGroupCommand = {
          type: "addAttributeGroup",
          payload: { ref: "CommonAttrs", parentId: "/complexType:PersonType" },
        };

        const result = validateAddAttributeGroup(command, schemaObj2);
        expect(result.valid).toBe(true);
      });

      test("should reject when parentId is missing", () => {
        const command: AddAttributeGroupCommand = {
          type: "addAttributeGroup",
          payload: { ref: "CommonAttrs" },
        };

        const result = validateAddAttributeGroup(command, schemaWithAttrGroup);
        expectInvalid(result);
        expect(result.error).toContain("Parent ID is required");
      });

      test("should reject when ref is an invalid XML name", () => {
        const schemaObj2 = schemaWith(COMMON_ATTRS_AND_PERSON_TYPE);
        const command: AddAttributeGroupCommand = {
          type: "addAttributeGroup",
          payload: { ref: "123-invalid", parentId: "/complexType:PersonType" },
        };

        const result = validateAddAttributeGroup(command, schemaObj2);
        expectInvalid(result);
        expect(result.error).toBe("Attribute group ref must be a valid QName");
      });

      test("should reject when the referenced group does not exist", () => {
        const schemaObj2 = schemaWith(COMMON_ATTRS_AND_PERSON_TYPE);
        const command: AddAttributeGroupCommand = {
          type: "addAttributeGroup",
          payload: { ref: "NonExistent", parentId: "/complexType:PersonType" },
        };

        const result = validateAddAttributeGroup(command, schemaObj2);
        expectInvalid(result);
        expect(result.error).toContain("Referenced attribute group does not exist");
      });

      test("should reject when parent node does not exist", () => {
        const command: AddAttributeGroupCommand = {
          type: "addAttributeGroup",
          payload: { ref: "CommonAttrs", parentId: "/complexType:NonExistent" },
        };

        const result = validateAddAttributeGroup(command, schemaWithAttrGroup);
        expectInvalid(result);
        expect(result.error).toContain("Parent node not found");
      });

      test("should reject when both ref and groupName are provided", () => {
        const command = {
          type: "addAttributeGroup",
          payload: {
            ref: "CommonAttrs",
            groupName: "SomeName",
            parentId: "/complexType:PersonType",
          },
        } as AddAttributeGroupCommand;

        const result = validateAddAttributeGroup(command, schemaObj);
        expectInvalid(result);
        expect(result.error).toContain("Cannot combine ref with groupName");
      });
    });
    describe("parents of references", () => {
      test("should reject a definition without groupName and ref", () => {
        const result = validateAddAttributeGroup({ type: "addAttributeGroup", payload: {} }, schemaObj);
        expectInvalid(result);
        expect(result.error).toBe("Attribute group name must be a valid XML name");
      });

      test("should accept a reference in the inline complexType of an element", () => {
        const command: AddAttributeGroupCommand = {
          type: "addAttributeGroup",
          payload: { ref: "CommonAttrs", parentId: "/element:root/anonymousComplexType" },
        };

        const result = validateAddAttributeGroup(
          command,
          schemaWithAttrGroups(`<xs:element name="root"><xs:complexType/></xs:element>`)
        );
        expect(result.valid).toBe(true);
      });

      test("should accept a reference in another attribute group", () => {
        const command: AddAttributeGroupCommand = {
          type: "addAttributeGroup",
          payload: { ref: "CommonAttrs", parentId: "/attributeGroup:OtherAttrs" },
        };

        const result = validateAddAttributeGroup(command, schemaWithAttrGroups(""));
        expect(result.valid).toBe(true);
      });

      test("should reject a reference directly in an element, which cannot hold attribute groups", () => {
        const command: AddAttributeGroupCommand = {
          type: "addAttributeGroup",
          payload: { ref: "CommonAttrs", parentId: "/element:root" },
        };

        const result = validateAddAttributeGroup(
          command,
          schemaWithAttrGroups(`<xs:element name="root" type="xs:string"/>`)
        );
        expectInvalid(result);
        expect(result.error).toBe("Cannot add attribute group reference to parent type: topLevelElement");
      });
    });
  });

  describe("validateRemoveAttributeGroup", () => {
    describe("definition mode", () => {
      test("should reject removeAttributeGroup with missing groupId", () => {
        const result = validateRemoveAttributeGroup(
          { type: "removeAttributeGroup", payload: { groupId: "" } },
          schemaObj
        );
        expectInvalid(result);
        expect(result.error).toBe("Attribute group ID cannot be empty");
      });

      test("should reject removeAttributeGroup when group does not exist", () => {
        const command: RemoveAttributeGroupCommand = {
          type: "removeAttributeGroup",
          payload: { groupId: "/attributeGroup:NonExistent" },
        };

        const result = validateRemoveAttributeGroup(command, schemaObj);
        expectInvalid(result);
        expect(result.error).toContain("Attribute group not found");
      });

      test.each([
        ["a complexType", PERSON_TYPE_WITH_REF_XSD],
        [
          "the inline complexType of a local element in a sequence",
          "attribute-group-ref-in-local-element-in-sequence.xsd",
        ],
        ["the inline complexType of a local element in a choice", "attribute-group-ref-in-local-element-in-choice.xsd"],
      ])("should reject removeAttributeGroup when group is referenced in %s", (_place, file) => {
        const result = validateRemoveAttributeGroup(
          { type: "removeAttributeGroup", payload: { groupId: "/attributeGroup:CommonAttrs" } },
          readTestSchema(file)
        );

        expectInvalid(result);
        expect(result.error).toContain("still referenced");
      });

      test("should accept removeAttributeGroup when group exists and is not referenced", () => {
        const command: RemoveAttributeGroupCommand = {
          type: "removeAttributeGroup",
          payload: { groupId: "/attributeGroup:CommonAttrs" },
        };

        const result = validateRemoveAttributeGroup(command, schemaWithAttrGroup);
        expect(result.valid).toBe(true);
      });
    });

    describe("reference mode", () => {
      test("should accept removing an attributeGroupRef when parent exists", () => {
        const schemaWithRef = readTestSchema(PERSON_TYPE_WITH_REF_XSD);
        const command: RemoveAttributeGroupCommand = {
          type: "removeAttributeGroup",
          payload: {
            groupId: "/complexType:PersonType/attributeGroupRef:CommonAttrs[0]",
          },
        };

        const result = validateRemoveAttributeGroup(command, schemaWithRef);
        expect(result.valid).toBe(true);
      });

      test("should reject removing an attributeGroupRef when parent does not exist", () => {
        const command: RemoveAttributeGroupCommand = {
          type: "removeAttributeGroup",
          payload: {
            groupId: "/complexType:NonExistent/attributeGroupRef:CommonAttrs[0]",
          },
        };

        const result = validateRemoveAttributeGroup(command, schemaObj);
        expectInvalid(result);
        expect(result.error).toContain("Parent node not found");
      });

      test("should reject removing an attributeGroupRef when the ref does not exist on the parent", () => {
        const schemaWithRef = readTestSchema(PERSON_TYPE_WITH_REF_XSD);
        const command: RemoveAttributeGroupCommand = {
          type: "removeAttributeGroup",
          payload: {
            groupId: "/complexType:PersonType/attributeGroupRef:NonExistent[0]",
          },
        };

        const result = validateRemoveAttributeGroup(command, schemaWithRef);
        expectInvalid(result);
        expect(result.error).toContain("Attribute group reference not found");
      });
    });
    describe("references in all places of the schema", () => {
      test.each(REFERENCE_PLACES)("should reject removing a group that is referenced in %s", (_, body) => {
        const command: RemoveAttributeGroupCommand = {
          type: "removeAttributeGroup",
          payload: { groupId: "/attributeGroup:CommonAttrs" },
        };

        const result = validateRemoveAttributeGroup(command, schemaWithAttrGroups(body.replace(/REF/g, "CommonAttrs")));
        expectInvalid(result);
        expect(result.error).toBe("Attribute group is still referenced and cannot be removed: CommonAttrs");
      });

      test.each(REFERENCE_PLACES)(
        "should accept removing a group when only another group is referenced in %s",
        (_, body) => {
          const command: RemoveAttributeGroupCommand = {
            type: "removeAttributeGroup",
            payload: { groupId: "/attributeGroup:CommonAttrs" },
          };

          const result = validateRemoveAttributeGroup(
            command,
            schemaWithAttrGroups(body.replace(/REF/g, "OtherAttrs"))
          );
          expect(result.valid).toBe(true);
        }
      );
    });

    describe("identifying a reference", () => {
      test("should accept a reference identified by name only", () => {
        const command: RemoveAttributeGroupCommand = {
          type: "removeAttributeGroup",
          payload: { groupId: "/complexType:PersonType/attributeGroupRef:OtherAttrs" },
        };

        const result = validateRemoveAttributeGroup(command, schemaWithAttrGroups(TWO_REFS));
        expect(result.valid).toBe(true);
      });

      test("should accept a reference identified by position only", () => {
        const command: RemoveAttributeGroupCommand = {
          type: "removeAttributeGroup",
          payload: { groupId: "/complexType:PersonType/attributeGroupRef[1]" },
        };

        const result = validateRemoveAttributeGroup(command, schemaWithAttrGroups(TWO_REFS));
        expect(result.valid).toBe(true);
      });

      test("should reject a position after the last reference", () => {
        const command: RemoveAttributeGroupCommand = {
          type: "removeAttributeGroup",
          payload: { groupId: "/complexType:PersonType/attributeGroupRef[2]" },
        };

        const result = validateRemoveAttributeGroup(command, schemaWithAttrGroups(TWO_REFS));
        expectInvalid(result);
        expect(result.error).toBe("Attribute group reference not found: /complexType:PersonType/attributeGroupRef[2]");
      });

      test("should reject a name that is at another position than given", () => {
        const command: RemoveAttributeGroupCommand = {
          type: "removeAttributeGroup",
          payload: { groupId: "/complexType:PersonType/attributeGroupRef:CommonAttrs[1]" },
        };

        const result = validateRemoveAttributeGroup(command, schemaWithAttrGroups(TWO_REFS));
        expectInvalid(result);
        expect(result.error).toContain("Attribute group reference not found");
      });

      test("should reject an ID with neither name nor position", () => {
        const command: RemoveAttributeGroupCommand = {
          type: "removeAttributeGroup",
          payload: { groupId: "/complexType:PersonType/attributeGroupRef" },
        };

        const result = validateRemoveAttributeGroup(command, schemaWithAttrGroups(TWO_REFS));
        expectInvalid(result);
        expect(result.error).toContain("Attribute group reference not found");
      });

      test("should reject a reference ID without a parent", () => {
        const command: RemoveAttributeGroupCommand = {
          type: "removeAttributeGroup",
          payload: { groupId: "/attributeGroupRef:CommonAttrs[0]" },
        };

        const result = validateRemoveAttributeGroup(command, schemaWithAttrGroups(TWO_REFS));
        expectInvalid(result);
        expect(result.error).toBe("Invalid attributeGroupRef ID: /attributeGroupRef:CommonAttrs[0]");
      });
    });
  });

  describe("validateModifyAttributeGroup", () => {
    describe("definition mode", () => {
      test("should reject modifyAttributeGroup with missing groupId", () => {
        const result = validateModifyAttributeGroup(
          { type: "modifyAttributeGroup", payload: { groupId: "" } },
          schemaObj
        );
        expectInvalid(result);
        expect(result.error).toBe("Attribute group ID cannot be empty");
      });

      test("should reject modifyAttributeGroup when group does not exist", () => {
        const command: ModifyAttributeGroupCommand = {
          type: "modifyAttributeGroup",
          payload: {
            groupId: "/attributeGroup:NonExistent",
            groupName: "NewName",
          },
        };

        const result = validateModifyAttributeGroup(command, schemaObj);
        expectInvalid(result);
        expect(result.error).toContain("Attribute group not found");
      });

      test("should reject modifyAttributeGroup with invalid new name", () => {
        const command: ModifyAttributeGroupCommand = {
          type: "modifyAttributeGroup",
          payload: {
            groupId: "/attributeGroup:CommonAttrs",
            groupName: "123-invalid",
          },
        };

        const result = validateModifyAttributeGroup(command, schemaWithAttrGroup);
        expectInvalid(result);
        expect(result.error).toBe("Attribute group name must be a valid XML name");
      });

      test("should reject modifyAttributeGroup when new name already exists", () => {
        const twoGroups = schemaWith(`<xs:attributeGroup name="GroupA"/>
<xs:attributeGroup name="GroupB"/>`);
        const command: ModifyAttributeGroupCommand = {
          type: "modifyAttributeGroup",
          payload: {
            groupId: "/attributeGroup:GroupA",
            groupName: "GroupB",
          },
        };

        const result = validateModifyAttributeGroup(command, twoGroups);
        expectInvalid(result);
        expect(result.error).toContain("Attribute group name already exists");
      });

      test("should accept modifyAttributeGroup with valid payload", () => {
        const command: ModifyAttributeGroupCommand = {
          type: "modifyAttributeGroup",
          payload: {
            groupId: "/attributeGroup:CommonAttrs",
            groupName: "ValidNewName",
          },
        };

        const result = validateModifyAttributeGroup(command, schemaWithAttrGroup);
        expect(result.valid).toBe(true);
      });

      test("should accept renaming to the same name (no-op)", () => {
        const command: ModifyAttributeGroupCommand = {
          type: "modifyAttributeGroup",
          payload: {
            groupId: "/attributeGroup:CommonAttrs",
            groupName: "CommonAttrs",
          },
        };

        const result = validateModifyAttributeGroup(command, schemaWithAttrGroup);
        expect(result.valid).toBe(true);
      });

      test("should reject using ref field on a definition ID", () => {
        const command = {
          type: "modifyAttributeGroup",
          payload: {
            groupId: "/attributeGroup:CommonAttrs",
            ref: "OtherGroup",
          },
        } as ModifyAttributeGroupCommand;

        const result = validateModifyAttributeGroup(command, schemaWithAttrGroup);
        expectInvalid(result);
        expect(result.error).toContain("Cannot use ref when modifying an attribute group definition");
      });
    });

    describe("reference mode", () => {
      test("should accept modifying the ref target of an attributeGroupRef", () => {
        const schemaWithRef = readTestSchema(ONE_OF_TWO_GROUPS_XSD);
        const command: ModifyAttributeGroupCommand = {
          type: "modifyAttributeGroup",
          payload: {
            groupId: "/complexType:PersonType/attributeGroupRef:AttrsA[0]",
            ref: "AttrsB",
          },
        };

        const result = validateModifyAttributeGroup(command, schemaWithRef);
        expect(result.valid).toBe(true);
      });

      test("should reject modifying an attributeGroupRef when parent does not exist", () => {
        const command: ModifyAttributeGroupCommand = {
          type: "modifyAttributeGroup",
          payload: {
            groupId: "/complexType:NonExistent/attributeGroupRef:AttrsA[0]",
            ref: "AttrsB",
          },
        };

        const result = validateModifyAttributeGroup(command, schemaObj);
        expectInvalid(result);
        expect(result.error).toContain("Parent node not found");
      });

      test("should reject modifying an attributeGroupRef when the ref does not exist on the parent", () => {
        const schemaWithRef = readTestSchema(ONE_OF_TWO_GROUPS_XSD);
        const command: ModifyAttributeGroupCommand = {
          type: "modifyAttributeGroup",
          payload: {
            groupId: "/complexType:PersonType/attributeGroupRef:NonExistent[0]",
            ref: "AttrsB",
          },
        };

        const result = validateModifyAttributeGroup(command, schemaWithRef);
        expectInvalid(result);
        expect(result.error).toContain("Attribute group reference not found");
      });

      test("should reject when new ref target does not exist", () => {
        const schemaWithRef = readTestSchema(ONE_OF_TWO_GROUPS_XSD);
        const command: ModifyAttributeGroupCommand = {
          type: "modifyAttributeGroup",
          payload: {
            groupId: "/complexType:PersonType/attributeGroupRef:AttrsA[0]",
            ref: "NonExistent",
          },
        };

        const result = validateModifyAttributeGroup(command, schemaWithRef);
        expectInvalid(result);
        expect(result.error).toContain("Referenced attribute group does not exist");
      });

      test("should reject using groupName field on a reference ID", () => {
        const schemaWithRef = readTestSchema(ONE_OF_TWO_GROUPS_XSD);
        const command = {
          type: "modifyAttributeGroup",
          payload: {
            groupId: "/complexType:PersonType/attributeGroupRef:AttrsA[0]",
            groupName: "NewName",
          },
        } as ModifyAttributeGroupCommand;

        const result = validateModifyAttributeGroup(command, schemaWithRef);
        expectInvalid(result);
        expect(result.error).toContain("Cannot use groupName when modifying an attribute group reference");
      });
    });

    describe("invalid references", () => {
      test("should reject a reference ID without a parent", () => {
        const command: ModifyAttributeGroupCommand = {
          type: "modifyAttributeGroup",
          payload: { groupId: "/attributeGroupRef:CommonAttrs[0]", ref: "OtherAttrs" },
        };

        const result = validateModifyAttributeGroup(command, schemaWithAttrGroups(""));
        expectInvalid(result);
        expect(result.error).toBe("Invalid attributeGroupRef ID: /attributeGroupRef:CommonAttrs[0]");
      });

      test("should reject a new ref that is not a valid XML name", () => {
        const command: ModifyAttributeGroupCommand = {
          type: "modifyAttributeGroup",
          payload: { groupId: "/complexType:PersonType/attributeGroupRef:CommonAttrs[0]", ref: "123-invalid" },
        };

        const result = validateModifyAttributeGroup(command, schemaWithAttrGroups(PERSON_TYPE_WITH_COMMON_ATTRS_REF));
        expectInvalid(result);
        expect(result.error).toBe("Attribute group ref must be a valid QName");
      });
    });
  });

  describe("references in the extension of a derived complexType", () => {
    test("should accept removing a reference in the extension", () => {
      const command: RemoveAttributeGroupCommand = {
        type: "removeAttributeGroup",
        payload: { groupId: "/complexType:T/attributeGroupRef:CommonAttrs[0]" },
      };

      expect(validateRemoveAttributeGroup(command, schemaWithAttrGroups(EXTENSION_WITH_REF)).valid).toBe(true);
    });

    test("should accept changing a reference in the extension", () => {
      const command: ModifyAttributeGroupCommand = {
        type: "modifyAttributeGroup",
        payload: { groupId: "/complexType:T/attributeGroupRef:CommonAttrs[0]", ref: "OtherAttrs" },
      };

      expect(validateModifyAttributeGroup(command, schemaWithAttrGroups(EXTENSION_WITH_REF)).valid).toBe(true);
    });
  });
});
