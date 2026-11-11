/**
 * Integration tests: group and attributeGroup add / remove / modify pipeline.
 *
 * Covers named model groups and attribute groups, both definitions and references.
 * Success-path assertions are made against the unmarshalled schema object.
 */

import type {
  annotationType,
  schema,
  AddGroupCommand,
  RemoveGroupCommand,
  ModifyGroupCommand,
  AddAttributeGroupCommand,
  RemoveAttributeGroupCommand,
  ModifyAttributeGroupCommand,
} from "../../shared/types.js";
import {
  SCHEMA_WITH_GROUP,
  SCHEMA_WITH_ATTRIBUTEGROUP,
  runCommandExpectSuccessSchema,
  runCommandExpectValidationFailure,
} from "./pipelineTestHelpers.js";
import { emptySchemaXml, schemaXmlWith } from "../../shared/__tests__/schemaTestHelpers.js";

/**
 * Group references in anonymous complex types, documented particles, and compositors in
 * complex content and in other compositors.
 */
const GROUP_PARTICLES = schemaXmlWith(`<xs:group name="Contact">
  <xs:annotation><xs:documentation>Old</xs:documentation></xs:annotation>
  <xs:sequence/>
</xs:group>
<xs:element name="person"><xs:complexType>
  <xs:group ref="Contact"><xs:annotation><xs:documentation>Old</xs:documentation></xs:annotation></xs:group>
</xs:complexType></xs:element>
<xs:element name="empty"><xs:complexType/></xs:element>
<xs:complexType name="Choices">
  <xs:sequence><xs:annotation><xs:documentation>Old</xs:documentation></xs:annotation><xs:choice/><xs:choice/></xs:sequence>
</xs:complexType>
<xs:complexType name="Restricted">
  <xs:complexContent><xs:restriction base="xs:anyType"><xs:sequence/></xs:restriction></xs:complexContent>
</xs:complexType>`);

/** The ID of the group reference in the anonymous complex type of `person`. */
const PERSON_GROUP_REF_ID = "/element:person/anonymousComplexType[0]/groupRef:Contact[0]";

describe("Integration: Group pipeline", () => {
  // ─── addGroup ──────────────────────────────────────────────────────────────

  describe("addGroup", () => {
    test("adds a top-level named group with a sequence content model", () => {
      const cmd: AddGroupCommand = {
        type: "addGroup",
        payload: { groupName: "AddressGroup", contentModel: "sequence" },
      };

      const result = runCommandExpectSuccessSchema(emptySchemaXml(), cmd);
      const groups = result.group ?? [];
      const addressGroup = groups.find((g) => g.name === "AddressGroup");

      expect(addressGroup).toBeDefined();
      expect(addressGroup!.sequence).toBeDefined();
      expect(addressGroup!.choice).toBeUndefined();
    });

    test("adds a group with a choice content model", () => {
      const cmd: AddGroupCommand = {
        type: "addGroup",
        payload: { groupName: "ChoiceGroup", contentModel: "choice" },
      };

      const result = runCommandExpectSuccessSchema(emptySchemaXml(), cmd);
      const choiceGroup = (result.group ?? []).find((g) => g.name === "ChoiceGroup");

      expect(choiceGroup).toBeDefined();
      expect(choiceGroup!.choice).toBeDefined();
      expect(choiceGroup!.sequence).toBeUndefined();
    });

    test("returns validation error for duplicate group name", () => {
      const cmd: AddGroupCommand = {
        type: "addGroup",
        payload: { groupName: "ContactGroup", contentModel: "sequence" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_GROUP, cmd, "Group name already exists: ContactGroup");
    });

    test("returns validation error when group name is invalid", () => {
      const cmd: AddGroupCommand = {
        type: "addGroup",
        payload: { groupName: "bad group", contentModel: "sequence" },
      };

      runCommandExpectValidationFailure(emptySchemaXml(), cmd, "Group name must be a valid XML name");
    });
  });

  // ─── removeGroup ───────────────────────────────────────────────────────────

  describe("removeGroup", () => {
    test("removes an existing top-level group", () => {
      const cmd: RemoveGroupCommand = {
        type: "removeGroup",
        payload: { groupId: "/group:ContactGroup" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_GROUP, cmd);
      const groups = result.group ?? [];

      expect(groups.some((g) => g.name === "ContactGroup")).toBe(false);
    });

    test("returns validation error when group ID does not exist", () => {
      const cmd: RemoveGroupCommand = {
        type: "removeGroup",
        payload: { groupId: "/group:NoSuchGroup" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_GROUP, cmd, "Group not found: /group:NoSuchGroup");
    });

    test("removes a compositor nested in another compositor", () => {
      const cmd: RemoveGroupCommand = {
        type: "removeGroup",
        payload: { groupId: "/complexType:T/group:sequence[0]/group:choice[0]" },
      };

      const result = runCommandExpectSuccessSchema(
        schemaXmlWith(`<xs:complexType name="T">
  <xs:sequence><xs:choice><xs:element name="a" type="xs:string"/></xs:choice></xs:sequence>
</xs:complexType>`),
        cmd
      );
      const sequence = (result.complexType ?? [])[0].sequence;

      expect(sequence).toBeDefined();
      expect(sequence?.choice ?? []).toHaveLength(0);
    });
  });

  // ─── modifyGroup ───────────────────────────────────────────────────────────

  describe("modifyGroup", () => {
    test("renames an existing group", () => {
      const cmd: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: { groupId: "/group:ContactGroup", groupName: "CommunicationGroup" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_GROUP, cmd);
      const groups = result.group ?? [];

      expect(groups.some((g) => g.name === "CommunicationGroup")).toBe(true);
      expect(groups.some((g) => g.name === "ContactGroup")).toBe(false);
    });

    test("renames the references to a group in the anonymous complex type of an element", () => {
      const xml = schemaXmlWith(`<xs:group name="ContactGroup"><xs:sequence/></xs:group>
<xs:element name="person"><xs:complexType><xs:sequence><xs:group ref="ContactGroup"/></xs:sequence></xs:complexType></xs:element>`);
      const cmd: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: { groupId: "/group:ContactGroup", groupName: "CommunicationGroup" },
      };

      const result = runCommandExpectSuccessSchema(xml, cmd);
      const person = (result.element ?? []).find((el) => el.name === "person");

      expect(person?.complexType?.sequence?.group?.[0]?.ref).toBe("CommunicationGroup");
    });

    test("returns validation error when group ID does not exist", () => {
      const cmd: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: { groupId: "/group:Ghost", groupName: "Other" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_GROUP, cmd, "Group not found: /group:Ghost");
    });

    test("returns validation error for occurrences on the compositor of a group definition", () => {
      const cmd: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: { groupId: "/group:ContactGroup/group:sequence[0]", minOccurs: 0 },
      };

      runCommandExpectValidationFailure(
        SCHEMA_WITH_GROUP,
        cmd,
        "The compositor of a group definition cannot have minOccurs or maxOccurs"
      );
    });
  });
});

describe("Integration: AttributeGroup pipeline", () => {
  // ─── addAttributeGroup ─────────────────────────────────────────────────────

  describe("addAttributeGroup", () => {
    test("adds a top-level named attributeGroup", () => {
      const cmd: AddAttributeGroupCommand = {
        type: "addAttributeGroup",
        payload: { groupName: "AuditAttributes" },
      };

      const result = runCommandExpectSuccessSchema(emptySchemaXml(), cmd);
      const groups = result.attributeGroup ?? [];

      expect(groups.some((g) => g.name === "AuditAttributes")).toBe(true);
    });

    test("returns validation error for duplicate attributeGroup name", () => {
      const cmd: AddAttributeGroupCommand = {
        type: "addAttributeGroup",
        payload: { groupName: "CommonAttrs" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ATTRIBUTEGROUP, cmd, "Attribute group name already exists: CommonAttrs");
    });

    test("returns validation error when group name is invalid", () => {
      const cmd: AddAttributeGroupCommand = {
        type: "addAttributeGroup",
        payload: { groupName: "bad name" },
      };

      runCommandExpectValidationFailure(emptySchemaXml(), cmd, "Attribute group name must be a valid XML name");
    });
  });

  describe("removeAttributeGroup", () => {
    test("removes an existing top-level attributeGroup", () => {
      const cmd: RemoveAttributeGroupCommand = {
        type: "removeAttributeGroup",
        payload: { groupId: "/attributeGroup:CommonAttrs" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_ATTRIBUTEGROUP, cmd);
      const groups = result.attributeGroup ?? [];

      expect(groups.some((g) => g.name === "CommonAttrs")).toBe(false);
    });

    test("returns validation error when group ID does not exist", () => {
      const cmd: RemoveAttributeGroupCommand = {
        type: "removeAttributeGroup",
        payload: { groupId: "/attributeGroup:Missing" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ATTRIBUTEGROUP, cmd, "Attribute group not found: /attributeGroup:Missing");
    });
  });

  // ─── modifyAttributeGroup ──────────────────────────────────────────────────

  describe("modifyAttributeGroup", () => {
    test("renames an existing attributeGroup", () => {
      const cmd: ModifyAttributeGroupCommand = {
        type: "modifyAttributeGroup",
        payload: { groupId: "/attributeGroup:CommonAttrs", groupName: "SharedAttrs" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_ATTRIBUTEGROUP, cmd);
      const groups = result.attributeGroup ?? [];

      expect(groups.some((g) => g.name === "SharedAttrs")).toBe(true);
      expect(groups.some((g) => g.name === "CommonAttrs")).toBe(false);
    });

    test("returns validation error when group ID does not exist", () => {
      const cmd: ModifyAttributeGroupCommand = {
        type: "modifyAttributeGroup",
        payload: { groupId: "/attributeGroup:NoSuch", groupName: "Other" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ATTRIBUTEGROUP, cmd, "Attribute group not found: /attributeGroup:NoSuch");
    });
  });

  // ─── particles ─────────────────────────────────────────────────────────────

  describe("group particles", () => {
    test("adds a group reference to an anonymous complex type", () => {
      const cmd: AddGroupCommand = {
        type: "addGroup",
        payload: { parentId: "/element:empty/anonymousComplexType[0]", ref: "Contact" },
      };

      const result = runCommandExpectSuccessSchema(GROUP_PARTICLES, cmd);

      expect(result.element?.find((el) => el.name === "empty")?.complexType?.group?.ref).toBe("Contact");
    });

    test("removes a group reference from an anonymous complex type", () => {
      const cmd: RemoveGroupCommand = { type: "removeGroup", payload: { groupId: PERSON_GROUP_REF_ID } };

      const result = runCommandExpectSuccessSchema(GROUP_PARTICLES, cmd);

      expect(result.element?.find((el) => el.name === "person")?.complexType?.group).toBeUndefined();
    });

    test.each([
      { node: "a group definition", groupId: "/group:Contact", read: (s: schema): annotationType | undefined => s.group?.[0]?.annotation },
      {
        node: "a group reference in an anonymous complex type",
        groupId: PERSON_GROUP_REF_ID,
        read: (s: schema): annotationType | undefined => s.element?.find((el) => el.name === "person")?.complexType?.group?.annotation,
      },
      {
        node: "a compositor",
        groupId: "/complexType:Choices/group:sequence[0]",
        read: (s: schema): annotationType | undefined => s.complexType?.[0]?.sequence?.annotation,
      },
    ])("replaces the documentation of $node", ({ groupId, read }) => {
      const cmd: ModifyGroupCommand = { type: "modifyGroup", payload: { groupId, documentation: "New" } };

      const result = runCommandExpectSuccessSchema(GROUP_PARTICLES, cmd);

      expect(read(result)?.documentation?.map((doc) => doc.value)).toEqual(["New"]);
    });

    test("removes one of two compositors nested in a sequence", () => {
      const cmd: RemoveGroupCommand = {
        type: "removeGroup",
        payload: { groupId: "/complexType:Choices/group:sequence[0]/group:choice[1]" },
      };

      const result = runCommandExpectSuccessSchema(GROUP_PARTICLES, cmd);

      expect(result.complexType?.[0]?.sequence?.choice).toHaveLength(1);
    });

    test("removes the compositor of a complexContent restriction", () => {
      const cmd: RemoveGroupCommand = { type: "removeGroup", payload: { groupId: "/complexType:Restricted/group:sequence[0]" } };

      const result = runCommandExpectSuccessSchema(GROUP_PARTICLES, cmd);

      expect(result.complexType?.[1]?.complexContent?.restriction?.sequence).toBeUndefined();
    });
  });
});
