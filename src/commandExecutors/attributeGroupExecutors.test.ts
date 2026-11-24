/**
 * Unit tests for attributeGroup executors.
 * Tests the implementation of add, remove, and modify execution logic for
 * attribute group definitions and attribute group references.
 */

import { unmarshal, marshal } from "@neumaennl/xmlbind-ts";
import type {
  topLevelComplexType,
  AddAttributeGroupCommand,
  RemoveAttributeGroupCommand,
  ModifyAttributeGroupCommand,
} from "../../shared/types.js";
import { schema } from "../../shared/types.js";
import {
  executeAddAttributeGroup,
  executeRemoveAttributeGroup,
  executeModifyAttributeGroup,
} from "./attributeGroupExecutors.js";
import {
  emptySchema,
  schemaWith,
  schemaWithAttrGroups,
  DERIVATIONS,
  derivedComplexTypeT,
} from "../../shared/__tests__/schemaTestHelpers.js";
import { readTestSchema } from "../__tests__/resourceTestHelpers.js";

/**
 * Executes an `addAttributeGroup` command.
 *
 * @param schemaObj - The schema to change
 * @param payload - The payload of the command
 */
function addAttributeGroup(schemaObj: schema, payload: AddAttributeGroupCommand["payload"]): void {
  executeAddAttributeGroup({ type: "addAttributeGroup", payload }, schemaObj);
}

/**
 * Executes a `modifyAttributeGroup` command.
 *
 * @param schemaObj - The schema to change
 * @param payload - The payload of the command
 */
function modifyAttributeGroup(schemaObj: schema, payload: ModifyAttributeGroupCommand["payload"]): void {
  executeModifyAttributeGroup({ type: "modifyAttributeGroup", payload }, schemaObj);
}

/**
 * Executes a `removeAttributeGroup` command.
 *
 * @param schemaObj - The schema to change
 * @param payload - The payload of the command
 */
function removeAttributeGroup(schemaObj: schema, payload: RemoveAttributeGroupCommand["payload"]): void {
  executeRemoveAttributeGroup({ type: "removeAttributeGroup", payload }, schemaObj);
}

/** The file with a complexType `PersonType` that references the attribute group `CommonAttrs`. */
const PERSON_TYPE_WITH_REF_XSD = "person-type-with-attribute-group-ref.xsd";

/** A complexType `T` with references to `CommonAttrs` and `OtherAttrs`, in this order. */
const TWO_REFS = `<xs:complexType name="T">
    <xs:attributeGroup ref="CommonAttrs"/>
    <xs:attributeGroup ref="OtherAttrs"/>
  </xs:complexType>`;

/**
 * Returns the names that the attribute group references of the complexType `T` refer to.
 *
 * @param schemaObj - The schema object
 * @returns The referenced names, in document order
 */
function refsOfT(schemaObj: schema): Array<string | undefined> {
  const t = (schemaObj.complexType ?? []).find((ct) => ct.name === "T");
  return (t?.attributeGroup ?? []).map((r) => r.ref);
}

/** A reference to the attribute group `CommonAttrs`. */
const COMMON_ATTRS_REF = `<xs:attributeGroup ref="CommonAttrs"/>`;

/**
 * Returns the complexType `T`.
 *
 * @param schemaObj - The schema object
 * @returns The complexType `T`
 */
function complexTypeT(schemaObj: schema): topLevelComplexType {
  return (schemaObj.complexType ?? []).find((ct) => ct.name === "T")!;
}

describe("AttributeGroup Executors", () => {
  describe("executeAddAttributeGroup", () => {
    describe("definition mode", () => {
      test("should add a named attribute group", () => {
        const schemaObj = emptySchema();

        addAttributeGroup(schemaObj, { groupName: "CommonAttrs" });

        expect(schemaObj.attributeGroup).toHaveLength(1);
        expect(schemaObj.attributeGroup![0]!.name).toBe("CommonAttrs");
        expect(schemaObj.attributeGroup![0]!.annotation).toBeUndefined();
      });

      test("should add an attribute group with documentation", () => {
        const schemaObj = emptySchema();

        addAttributeGroup(schemaObj, { groupName: "DocAttrs", documentation: "Documented group" });

        const ag = schemaObj.attributeGroup![0]!;
        expect(ag.name).toBe("DocAttrs");
        expect(ag.annotation?.documentation?.[0]!.value).toBe("Documented group");
      });

      test("should append to existing attribute groups", () => {
        const schemaObj = schemaWith(`<xs:attributeGroup name="FirstAttrs"/>`);

        addAttributeGroup(schemaObj, { groupName: "SecondAttrs" });

        expect(schemaObj.attributeGroup).toHaveLength(2);
        expect(schemaObj.attributeGroup![1]!.name).toBe("SecondAttrs");
      });

      test("should produce valid XSD output (round-trip)", () => {
        const schemaObj = emptySchema();

        addAttributeGroup(schemaObj, { groupName: "RoundTripAttrs" });

        const xml = marshal(schemaObj);
        const reparsed = unmarshal(schema, xml);
        expect(reparsed.attributeGroup ?? []).toHaveLength(1);
        expect((reparsed.attributeGroup ?? [])[0]!.name).toBe("RoundTripAttrs");
      });
    });

    describe("reference mode", () => {
      test("should add an attribute group ref to a complexType", () => {
        const schemaObj = schemaWith(`<xs:attributeGroup name="CommonAttrs"/>
<xs:complexType name="PersonType"/>`);

        addAttributeGroup(schemaObj, { ref: "CommonAttrs", parentId: "/complexType:PersonType" });

        const ct = (schemaObj.complexType ?? [])[0]!;
        expect(ct.attributeGroup ?? []).toHaveLength(1);
        expect((ct.attributeGroup ?? [])[0]!.ref).toBe("CommonAttrs");
      });

      test("should add an attribute group ref with documentation", () => {
        const schemaObj = schemaWith(`<xs:attributeGroup name="CommonAttrs"/>
<xs:complexType name="PersonType"/>`);

        addAttributeGroup(schemaObj, {
          ref: "CommonAttrs",
          parentId: "/complexType:PersonType",
          documentation: "Ref docs",
        });

        const ct = (schemaObj.complexType ?? [])[0]!;
        const agRef = (ct.attributeGroup ?? [])[0]!;
        expect(agRef.ref).toBe("CommonAttrs");
        expect(agRef.annotation?.documentation?.[0]!.value).toBe("Ref docs");
      });

      test("should add multiple attribute group refs to the same complexType", () => {
        const schemaObj = schemaWith(`<xs:attributeGroup name="AttrsA"/>
<xs:attributeGroup name="AttrsB"/>
<xs:complexType name="PersonType"/>`);

        executeAddAttributeGroup(
          { type: "addAttributeGroup", payload: { ref: "AttrsA", parentId: "/complexType:PersonType" } },
          schemaObj
        );
        executeAddAttributeGroup(
          { type: "addAttributeGroup", payload: { ref: "AttrsB", parentId: "/complexType:PersonType" } },
          schemaObj
        );

        const ct = (schemaObj.complexType ?? [])[0]!;
        expect(ct.attributeGroup ?? []).toHaveLength(2);
        expect((ct.attributeGroup ?? [])[1]!.ref).toBe("AttrsB");
      });

      test("should add an attribute group ref to a namedAttributeGroup", () => {
        const schemaObj = schemaWith(`<xs:attributeGroup name="BaseAttrs"/>
<xs:attributeGroup name="ExtendedAttrs"/>`);

        addAttributeGroup(schemaObj, { ref: "BaseAttrs", parentId: "/attributeGroup:ExtendedAttrs" });

        const extGroup = (schemaObj.attributeGroup ?? []).find((g) => g.name === "ExtendedAttrs");
        expect(extGroup?.attributeGroup ?? []).toHaveLength(1);
        expect((extGroup?.attributeGroup ?? [])[0]!.ref).toBe("BaseAttrs");
      });
    });
  });

  describe("executeRemoveAttributeGroup", () => {
    describe("definition mode", () => {
      test("should remove an attribute group by ID", () => {
        const schemaObj = schemaWith(`<xs:attributeGroup name="RemovableAttrs"/>`);

        removeAttributeGroup(schemaObj, { groupId: "/attributeGroup:RemovableAttrs" });

        expect(schemaObj.attributeGroup).toBeUndefined();
      });

      test("should remove one attribute group while leaving others intact", () => {
        const schemaObj = schemaWith(`<xs:attributeGroup name="GroupA"/>
<xs:attributeGroup name="GroupB"/>`);

        removeAttributeGroup(schemaObj, { groupId: "/attributeGroup:GroupA" });

        expect(schemaObj.attributeGroup ?? []).toHaveLength(1);
        expect((schemaObj.attributeGroup ?? [])[0]!.name).toBe("GroupB");
      });
    });

    describe("reference mode", () => {
      test("should remove an attribute group ref from a complexType", () => {
        const schemaObj = readTestSchema(PERSON_TYPE_WITH_REF_XSD);

        removeAttributeGroup(schemaObj, { groupId: "/complexType:PersonType/attributeGroupRef:CommonAttrs[0]" });

        const ct = (schemaObj.complexType ?? [])[0]!;
        expect(ct.attributeGroup).toBeUndefined();
      });

      test("should remove only the matching ref while leaving others intact", () => {
        const schemaObj = schemaWith(`<xs:attributeGroup name="AttrsA"/>
<xs:attributeGroup name="AttrsB"/>
<xs:complexType name="PersonType">
  <xs:attributeGroup ref="AttrsA"/>
  <xs:attributeGroup ref="AttrsB"/>
</xs:complexType>`);

        removeAttributeGroup(schemaObj, { groupId: "/complexType:PersonType/attributeGroupRef:AttrsA[0]" });

        const ct = (schemaObj.complexType ?? [])[0]!;
        expect(ct.attributeGroup ?? []).toHaveLength(1);
        expect((ct.attributeGroup ?? [])[0]!.ref).toBe("AttrsB");
      });

      test("should remove an attribute group ref from a namedAttributeGroup", () => {
        const schemaObj = schemaWith(`<xs:attributeGroup name="BaseAttrs"/>
<xs:attributeGroup name="ExtendedAttrs">
  <xs:attributeGroup ref="BaseAttrs"/>
</xs:attributeGroup>`);

        removeAttributeGroup(schemaObj, { groupId: "/attributeGroup:ExtendedAttrs/attributeGroupRef:BaseAttrs[0]" });

        const extGroup = (schemaObj.attributeGroup ?? []).find((g) => g.name === "ExtendedAttrs");
        expect(extGroup?.attributeGroup).toBeUndefined();
      });
    });
  });

  describe("executeModifyAttributeGroup", () => {
    describe("definition mode", () => {
      test("should rename an attribute group", () => {
        const schemaObj = schemaWith(`<xs:attributeGroup name="OldName"/>`);

        modifyAttributeGroup(schemaObj, { groupId: "/attributeGroup:OldName", groupName: "NewName" });

        expect((schemaObj.attributeGroup ?? [])[0]!.name).toBe("NewName");
      });

      test("should leave unchanged properties untouched", () => {
        const schemaObj = schemaWith(`<xs:attributeGroup name="StableGroup"/>`);

        modifyAttributeGroup(schemaObj, { groupId: "/attributeGroup:StableGroup" });

        expect((schemaObj.attributeGroup ?? [])[0]!.name).toBe("StableGroup");
      });
    });

    describe("reference mode", () => {
      test("should change the ref target of an attribute group reference", () => {
        const schemaObj = readTestSchema("person-type-with-one-of-two-attribute-groups.xsd");

        modifyAttributeGroup(schemaObj, {
          groupId: "/complexType:PersonType/attributeGroupRef:AttrsA[0]",
          ref: "AttrsB",
        });

        const ct = (schemaObj.complexType ?? [])[0]!;
        expect((ct.attributeGroup ?? [])[0]!.ref).toBe("AttrsB");
      });
    });
  });
  describe("identifying references", () => {
    test("should remove a reference identified by name only", () => {
      const schemaObj = schemaWithAttrGroups(TWO_REFS);

      removeAttributeGroup(schemaObj, { groupId: "/complexType:T/attributeGroupRef:OtherAttrs" });

      expect(refsOfT(schemaObj)).toEqual(["CommonAttrs"]);
    });

    test("should remove a reference identified by position only", () => {
      const schemaObj = schemaWithAttrGroups(TWO_REFS);

      removeAttributeGroup(schemaObj, { groupId: "/complexType:T/attributeGroupRef[0]" });

      expect(refsOfT(schemaObj)).toEqual(["OtherAttrs"]);
    });

    test("should change a reference identified by name only", () => {
      const schemaObj = schemaWithAttrGroups(TWO_REFS);

      modifyAttributeGroup(schemaObj, { groupId: "/complexType:T/attributeGroupRef:OtherAttrs", ref: "CommonAttrs" });

      expect(refsOfT(schemaObj)).toEqual(["CommonAttrs", "CommonAttrs"]);
    });

    test("should change a reference identified by position only", () => {
      const schemaObj = schemaWithAttrGroups(TWO_REFS);

      modifyAttributeGroup(schemaObj, { groupId: "/complexType:T/attributeGroupRef[0]", ref: "OtherAttrs" });

      expect(refsOfT(schemaObj)).toEqual(["OtherAttrs", "OtherAttrs"]);
    });
  });

  describe("references in derived complex types", () => {
    test.each(DERIVATIONS)("should add a reference to the %s %s", (content, derivation) => {
      const schemaObj = schemaWithAttrGroups(derivedComplexTypeT(content, derivation, COMMON_ATTRS_REF));

      executeAddAttributeGroup(
        { type: "addAttributeGroup", payload: { ref: "OtherAttrs", parentId: "/complexType:T" } },
        schemaObj
      );

      const ct = complexTypeT(schemaObj);
      expect(ct[content]?.[derivation]?.attributeGroup?.map((r) => r.ref)).toEqual(["CommonAttrs", "OtherAttrs"]);
      expect(ct.attributeGroup ?? []).toEqual([]);
    });

    test.each(DERIVATIONS)("should remove a reference from the %s %s", (content, derivation) => {
      const schemaObj = schemaWithAttrGroups(derivedComplexTypeT(content, derivation, COMMON_ATTRS_REF));

      executeRemoveAttributeGroup(
        { type: "removeAttributeGroup", payload: { groupId: "/complexType:T/attributeGroupRef:CommonAttrs[0]" } },
        schemaObj
      );

      expect(complexTypeT(schemaObj)[content]?.[derivation]?.attributeGroup).toBeUndefined();
    });

    test.each(DERIVATIONS)("should change a reference in the %s %s", (content, derivation) => {
      const schemaObj = schemaWithAttrGroups(derivedComplexTypeT(content, derivation, COMMON_ATTRS_REF));

      executeModifyAttributeGroup(
        {
          type: "modifyAttributeGroup",
          payload: { groupId: "/complexType:T/attributeGroupRef:CommonAttrs[0]", ref: "OtherAttrs" },
        },
        schemaObj
      );

      expect(complexTypeT(schemaObj)[content]?.[derivation]?.attributeGroup?.map((r) => r.ref)).toEqual(["OtherAttrs"]);
    });

    test("should serialize a reference added to a derived anonymous complex type inside the extension", () => {
      const schemaObj = schemaWithAttrGroups(`<xs:element name="person"><xs:complexType><xs:complexContent>
  <xs:extension base="B"><xs:sequence/></xs:extension>
</xs:complexContent></xs:complexType></xs:element>`);

      executeAddAttributeGroup(
        {
          type: "addAttributeGroup",
          payload: { ref: "CommonAttrs", parentId: "/element:person/anonymousComplexType[0]" },
        },
        schemaObj
      );

      const complexType = unmarshal(schema, marshal(schemaObj)).element![0]!.complexType!;
      expect(complexType.complexContent?.extension?.attributeGroup?.map((r) => r.ref)).toEqual(["CommonAttrs"]);
      expect(complexType.attributeGroup ?? []).toEqual([]);
    });
  });
});
