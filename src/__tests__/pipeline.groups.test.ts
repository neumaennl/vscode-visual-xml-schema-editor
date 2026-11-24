/**
 * Integration tests: group and attributeGroup add / remove / modify pipeline.
 *
 * Covers named model groups and attribute groups, both definitions and references.
 * Success-path assertions are made against the unmarshalled schema object.
 */

import {
  COMPLEX_TYPES_WITH_ANY_ATTRIBUTE,
  SCHEMA_WITH_GROUP,
  SCHEMA_WITH_ATTRIBUTEGROUP,
  runCommandExpectSuccess,
  runCommandExpectSuccessSchema,
  runCommandExpectValidationFailure,
} from "./pipelineTestHelpers.js";
import { expectLinesInOrder } from "./textTestHelpers.js";
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

/** A schema with a target namespace, declared with the prefix `tns`, and the group `G`, which `T` references. */
const NAMESPACED_GROUP = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:tns="urn:t" targetNamespace="urn:t">
  <xs:group name="G"><xs:sequence/></xs:group>
  <xs:complexType name="T"><xs:group ref="tns:G"/></xs:complexType>
  <xs:complexType name="Empty"/>
</xs:schema>`;

/** The ID of the group reference in the anonymous complex type of `person`. */
const PERSON_GROUP_REF_ID = "/element:person/anonymousComplexType[0]/groupRef:Contact[0]";

describe("Integration: Group pipeline", () => {
  // ─── addGroup ──────────────────────────────────────────────────────────────

  describe("addGroup", () => {
    test("should add a top-level named group with a sequence content model", () => {
      const result = runCommandExpectSuccessSchema(emptySchemaXml(), {
        type: "addGroup",
        payload: { groupName: "AddressGroup", contentModel: "sequence" },
      });
      const groups = result.group ?? [];
      const addressGroup = groups.find((g) => g.name === "AddressGroup");

      expect(addressGroup).toBeDefined();
      expect(addressGroup!.sequence).toBeDefined();
      expect(addressGroup!.choice).toBeUndefined();
    });

    test("should add a group with a choice content model", () => {
      const result = runCommandExpectSuccessSchema(emptySchemaXml(), {
        type: "addGroup",
        payload: { groupName: "ChoiceGroup", contentModel: "choice" },
      });
      const choiceGroup = (result.group ?? []).find((g) => g.name === "ChoiceGroup");

      expect(choiceGroup).toBeDefined();
      expect(choiceGroup!.choice).toBeDefined();
      expect(choiceGroup!.sequence).toBeUndefined();
    });

    test("should return validation error for duplicate group name", () => {
      runCommandExpectValidationFailure(
        SCHEMA_WITH_GROUP,
        {
          type: "addGroup",
          payload: { groupName: "ContactGroup", contentModel: "sequence" },
        },
        "Group name already exists: ContactGroup"
      );
    });

    test("should return validation error when group name is invalid", () => {
      runCommandExpectValidationFailure(
        emptySchemaXml(),
        {
          type: "addGroup",
          payload: { groupName: "bad group", contentModel: "sequence" },
        },
        "Group name must be a valid XML name"
      );
    });
  });

  // ─── removeGroup ───────────────────────────────────────────────────────────

  describe("removeGroup", () => {
    test("should remove an existing top-level group", () => {
      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_GROUP, {
        type: "removeGroup",
        payload: { groupId: "/group:ContactGroup" },
      });
      const groups = result.group ?? [];

      expect(groups.some((g) => g.name === "ContactGroup")).toBe(false);
    });

    test("should return validation error when group ID does not exist", () => {
      runCommandExpectValidationFailure(
        SCHEMA_WITH_GROUP,
        {
          type: "removeGroup",
          payload: { groupId: "/group:NoSuchGroup" },
        },
        "Group not found: /group:NoSuchGroup"
      );
    });

    test("should reject the removal of a group that a reference with the prefix of the target namespace uses", () => {
      runCommandExpectValidationFailure(
        NAMESPACED_GROUP,
        { type: "removeGroup", payload: { groupId: "/group:G" } },
        "Group is still referenced and cannot be removed: G"
      );
    });

    test("should remove a compositor nested in another compositor", () => {
      const result = runCommandExpectSuccessSchema(
        schemaXmlWith(`<xs:complexType name="T">
  <xs:sequence><xs:choice><xs:element name="a" type="xs:string"/></xs:choice></xs:sequence>
</xs:complexType>`),
        { type: "removeGroup", payload: { groupId: "/complexType:T/group:sequence[0]/group:choice[0]" } }
      );
      const sequence = (result.complexType ?? [])[0]!.sequence;

      expect(sequence).toBeDefined();
      expect(sequence?.choice ?? []).toHaveLength(0);
    });
  });

  // ─── modifyGroup ───────────────────────────────────────────────────────────

  describe("modifyGroup", () => {
    test("should rename an existing group", () => {
      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_GROUP, {
        type: "modifyGroup",
        payload: { groupId: "/group:ContactGroup", groupName: "CommunicationGroup" },
      });
      const groups = result.group ?? [];

      expect(groups.some((g) => g.name === "CommunicationGroup")).toBe(true);
      expect(groups.some((g) => g.name === "ContactGroup")).toBe(false);
    });

    test("should rename the references to a group in the anonymous complex type of an element", () => {
      const xml = schemaXmlWith(`<xs:group name="ContactGroup"><xs:sequence/></xs:group>
<xs:element name="person"><xs:complexType><xs:sequence><xs:group ref="ContactGroup"/></xs:sequence></xs:complexType></xs:element>`);
      const result = runCommandExpectSuccessSchema(xml, {
        type: "modifyGroup",
        payload: { groupId: "/group:ContactGroup", groupName: "CommunicationGroup" },
      });
      const person = (result.element ?? []).find((el) => el.name === "person");

      expect(person?.complexType?.sequence?.group?.[0]?.ref).toBe("CommunicationGroup");
    });

    test("should return validation error when group ID does not exist", () => {
      runCommandExpectValidationFailure(
        SCHEMA_WITH_GROUP,
        {
          type: "modifyGroup",
          payload: { groupId: "/group:Ghost", groupName: "Other" },
        },
        "Group not found: /group:Ghost"
      );
    });

    test("should return validation error for occurrences on the compositor of a group definition", () => {
      runCommandExpectValidationFailure(
        SCHEMA_WITH_GROUP,
        { type: "modifyGroup", payload: { groupId: "/group:ContactGroup/group:sequence[0]", minOccurs: 0 } },
        "The compositor of a group definition cannot have minOccurs or maxOccurs"
      );
    });
  });
});

describe("Integration: AttributeGroup pipeline", () => {
  // ─── addAttributeGroup ─────────────────────────────────────────────────────

  describe("addAttributeGroup", () => {
    test("should add a top-level named attributeGroup", () => {
      const result = runCommandExpectSuccessSchema(emptySchemaXml(), {
        type: "addAttributeGroup",
        payload: { groupName: "AuditAttributes" },
      });
      const groups = result.attributeGroup ?? [];

      expect(groups.some((g) => g.name === "AuditAttributes")).toBe(true);
    });

    test("should return validation error for duplicate attributeGroup name", () => {
      runCommandExpectValidationFailure(
        SCHEMA_WITH_ATTRIBUTEGROUP,
        {
          type: "addAttributeGroup",
          payload: { groupName: "CommonAttrs" },
        },
        "Attribute group name already exists: CommonAttrs"
      );
    });

    test("should return validation error when group name is invalid", () => {
      runCommandExpectValidationFailure(
        emptySchemaXml(),
        {
          type: "addAttributeGroup",
          payload: { groupName: "bad name" },
        },
        "Attribute group name must be a valid XML name"
      );
    });

    test.each(COMPLEX_TYPES_WITH_ANY_ATTRIBUTE)(
      "should write a new reference of %s before xs:anyAttribute",
      (_, complexType) => {
        const updatedXml = runCommandExpectSuccess(
          schemaXmlWith(`<xs:attributeGroup name="CommonAttrs"/>\n${complexType}`),
          {
            type: "addAttributeGroup",
            payload: { ref: "CommonAttrs", parentId: "/complexType:T" },
          }
        );
        expectLinesInOrder(updatedXml, [`<xs:attributeGroup ref="CommonAttrs"/>`, "<xs:anyAttribute/>"]);
      }
    );
  });

  describe("removeAttributeGroup", () => {
    test("should remove an existing top-level attributeGroup", () => {
      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_ATTRIBUTEGROUP, {
        type: "removeAttributeGroup",
        payload: { groupId: "/attributeGroup:CommonAttrs" },
      });
      const groups = result.attributeGroup ?? [];

      expect(groups.some((g) => g.name === "CommonAttrs")).toBe(false);
    });

    test("should return validation error when group ID does not exist", () => {
      runCommandExpectValidationFailure(
        SCHEMA_WITH_ATTRIBUTEGROUP,
        {
          type: "removeAttributeGroup",
          payload: { groupId: "/attributeGroup:Missing" },
        },
        "Attribute group not found: /attributeGroup:Missing"
      );
    });
  });

  // ─── modifyAttributeGroup ──────────────────────────────────────────────────

  describe("modifyAttributeGroup", () => {
    test("should rename an existing attributeGroup", () => {
      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_ATTRIBUTEGROUP, {
        type: "modifyAttributeGroup",
        payload: { groupId: "/attributeGroup:CommonAttrs", groupName: "SharedAttrs" },
      });
      const groups = result.attributeGroup ?? [];

      expect(groups.some((g) => g.name === "SharedAttrs")).toBe(true);
      expect(groups.some((g) => g.name === "CommonAttrs")).toBe(false);
    });

    test("should return validation error when group ID does not exist", () => {
      runCommandExpectValidationFailure(
        SCHEMA_WITH_ATTRIBUTEGROUP,
        {
          type: "modifyAttributeGroup",
          payload: { groupId: "/attributeGroup:NoSuch", groupName: "Other" },
        },
        "Attribute group not found: /attributeGroup:NoSuch"
      );
    });
  });

  // ─── particles ─────────────────────────────────────────────────────────────

  describe("group particles", () => {
    test("should add a group reference to an anonymous complex type", () => {
      const result = runCommandExpectSuccessSchema(GROUP_PARTICLES, {
        type: "addGroup",
        payload: { parentId: "/element:empty/anonymousComplexType[0]", ref: "Contact" },
      });

      expect(result.element?.find((el) => el.name === "empty")?.complexType?.group?.ref).toBe("Contact");
    });

    test("should add a group reference with the prefix of the target namespace", () => {
      const result = runCommandExpectSuccessSchema(NAMESPACED_GROUP, {
        type: "addGroup",
        payload: { parentId: "/complexType:Empty", ref: "tns:G" },
      });

      expect(result.complexType?.find((ct) => ct.name === "Empty")?.group?.ref).toBe("tns:G");
    });

    test("should remove a group reference from an anonymous complex type", () => {
      const result = runCommandExpectSuccessSchema(GROUP_PARTICLES, {
        type: "removeGroup",
        payload: { groupId: PERSON_GROUP_REF_ID },
      });

      expect(result.element?.find((el) => el.name === "person")?.complexType?.group).toBeUndefined();
    });

    test("should remove one of two compositors nested in a sequence", () => {
      const result = runCommandExpectSuccessSchema(GROUP_PARTICLES, {
        type: "removeGroup",
        payload: { groupId: "/complexType:Choices/group:sequence[0]/group:choice[1]" },
      });

      expect(result.complexType?.[0]?.sequence?.choice).toHaveLength(1);
    });

    test("should remove the compositor of a complexContent restriction", () => {
      const result = runCommandExpectSuccessSchema(GROUP_PARTICLES, {
        type: "removeGroup",
        payload: { groupId: "/complexType:Restricted/group:sequence[0]" },
      });

      expect(result.complexType?.[1]?.complexContent?.restriction?.sequence).toBeUndefined();
    });
  });
});
