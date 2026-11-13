import {
  renameLocalAttributeGroupRefInSchema,
  renameLocalElementRefInSchema,
  renameLocalGroupRefInSchema,
  renameLocalTypeInSchema,
} from "./schemaLocalRenamer.js";
import { schemaWith } from "../../shared/__tests__/schemaTestHelpers.js";
import { readTestSchema } from "../__tests__/resourceTestHelpers.js";
import { localComplexType, schema } from "../../shared/types.js";

/** The schema with a QName in every place where XML Schema allows one. */
const QNAME_IN_EVERY_PLACE = "qname-in-every-place.xsd";

/**
 * Returns the anonymous complex type of the element `anonymous` in {@link QNAME_IN_EVERY_PLACE}.
 *
 * @param schemaObj - The schema
 * @returns The anonymous complex type
 */
function anonymousType(schemaObj: schema): localComplexType | undefined {
  return schemaObj.element?.find((el) => el.name === "anonymous")?.complexType;
}

describe("schemaLocalRenamer", () => {
  test.each([
    {
      rename: renameLocalGroupRefInSchema,
      oldName: "groupRef",
      read: (s: schema): string | undefined => anonymousType(s)?.sequence?.group?.[0]?.ref,
    },
    {
      rename: renameLocalGroupRefInSchema,
      oldName: "groupRefInGroup",
      read: (s: schema): string | undefined => s.group?.[0]?.sequence?.element?.[0]?.complexType?.sequence?.group?.[0]?.ref,
    },
    {
      rename: renameLocalAttributeGroupRefInSchema,
      oldName: "attributeGroupRef",
      read: (s: schema): string | undefined => anonymousType(s)?.attributeGroup?.[0]?.ref,
    },
    {
      rename: renameLocalElementRefInSchema,
      oldName: "elementRef",
      read: (s: schema): string | undefined => anonymousType(s)?.sequence?.element?.[0]?.ref,
    },
  ])("$rename.name renames the reference to $oldName in an anonymous complex type", ({ rename, oldName, read }) => {
    const schemaObj = readTestSchema(QNAME_IN_EVERY_PLACE);

    rename(oldName, "Renamed", schemaObj);

    expect(read(schemaObj)).toBe("tns:Renamed");
  });

  describe("renameLocalTypeInSchema", () => {
    test("renames unqualified type references throughout the schema", () => {
      const schemaObj = readTestSchema("types-referencing-base-type.xsd");

      renameLocalTypeInSchema("BaseType", "RenamedType", schemaObj);

      expect((schemaObj.element ?? [])[0].type_).toBe("RenamedType");
      expect((schemaObj.attribute ?? [])[0].type_).toBe("RenamedType");
      expect(((schemaObj.complexType ?? [])[0].sequence!.element ?? [])[0].type_).toBe("RenamedType");
      expect((schemaObj.simpleType ?? [])[1].restriction!.base).toBe("RenamedType");
    });

    test("leaves prefixed type references untouched", () => {
      const schemaObj = schemaWith(`
  <xs:element name="status" type="BaseType"/>
  <xs:element name="external" type="ext:BaseType"/>`);

      renameLocalTypeInSchema("BaseType", "RenamedType", schemaObj);

      const elements = schemaObj.element ?? [];
      expect(elements[0].type_).toBe("RenamedType");
      expect(elements[1].type_).toBe("ext:BaseType");
    });

    test("renames references that use the current schema targetNamespace prefix", () => {
      const schemaObj = schemaWith(`
  <xs:simpleType name="BaseType"><xs:restriction base="xs:string"/></xs:simpleType>
  <xs:element name="status" type="tns:BaseType"/>
  <xs:complexType name="Wrapper">
    <xs:sequence>
      <xs:element name="nested" type="tns:BaseType"/>
    </xs:sequence>
  </xs:complexType>
  <xs:simpleType name="DerivedType"><xs:restriction base="tns:BaseType"/></xs:simpleType>`);
      schemaObj.targetNamespace = "http://example.com/ns";
      schemaObj._namespacePrefixes = {
        xs: "http://www.w3.org/2001/XMLSchema",
        tns: "http://example.com/ns",
        ext: "http://example.com/external",
      };

      renameLocalTypeInSchema("BaseType", "RenamedType", schemaObj);

      expect((schemaObj.element ?? [])[0].type_).toBe("tns:RenamedType");
      expect(((schemaObj.complexType ?? [])[0].sequence!.element ?? [])[0].type_).toBe(
        "tns:RenamedType"
      );
      expect((schemaObj.simpleType ?? [])[1].restriction!.base).toBe("tns:RenamedType");
    });
  });

  describe("renameLocalGroupRefInSchema", () => {
    test("renames matching group refs in complex types and named groups", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="Wrapper"><xs:group ref="OldGroup"/></xs:complexType>
  <xs:group name="Container"><xs:sequence><xs:group ref="OldGroup"/></xs:sequence></xs:group>`);

      renameLocalGroupRefInSchema("OldGroup", "NewGroup", schemaObj);

      expect((schemaObj.complexType ?? [])[0].group!.ref).toBe("NewGroup");
      expect(((schemaObj.group ?? [])[0].sequence!.group ?? [])[0].ref).toBe("NewGroup");
    });

    test("renames targetNamespace-prefixed group refs", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="Wrapper"><xs:group ref="tns:OldGroup"/></xs:complexType>`);
      schemaObj.targetNamespace = "http://example.com/ns";
      schemaObj._namespacePrefixes = {
        xs: "http://www.w3.org/2001/XMLSchema",
        tns: "http://example.com/ns",
      };

      renameLocalGroupRefInSchema("OldGroup", "NewGroup", schemaObj);

      expect((schemaObj.complexType ?? [])[0].group!.ref).toBe("tns:NewGroup");
    });
  });

  describe("renameLocalAttributeGroupRefInSchema", () => {
    test("renames matching attributeGroup refs across holders", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="Wrapper"><xs:attributeGroup ref="OldAttrs"/></xs:complexType>
  <xs:attributeGroup name="Shared"><xs:attributeGroup ref="OldAttrs"/></xs:attributeGroup>`);

      renameLocalAttributeGroupRefInSchema("OldAttrs", "NewAttrs", schemaObj);

      expect(((schemaObj.complexType ?? [])[0].attributeGroup ?? [])[0].ref).toBe("NewAttrs");
      expect(((schemaObj.attributeGroup ?? [])[0].attributeGroup ?? [])[0].ref).toBe("NewAttrs");
    });

    test("renames targetNamespace-prefixed attributeGroup refs", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="Wrapper"><xs:attributeGroup ref="tns:OldAttrs"/></xs:complexType>`);
      schemaObj.targetNamespace = "http://example.com/ns";
      schemaObj._namespacePrefixes = {
        xs: "http://www.w3.org/2001/XMLSchema",
        tns: "http://example.com/ns",
      };

      renameLocalAttributeGroupRefInSchema("OldAttrs", "NewAttrs", schemaObj);

      expect(((schemaObj.complexType ?? [])[0].attributeGroup ?? [])[0].ref).toBe("tns:NewAttrs");
    });
  });

  describe("renameLocalElementRefInSchema", () => {
    test("renames matching element refs and substitution groups", () => {
      const schemaObj = schemaWith(`
  <xs:element name="head"/>
  <xs:element name="child" substitutionGroup="head"/>
  <xs:complexType name="Wrapper">
    <xs:sequence><xs:element ref="head"/></xs:sequence>
  </xs:complexType>
  <xs:group name="Container">
    <xs:choice><xs:element ref="head"/></xs:choice>
  </xs:group>`);

      renameLocalElementRefInSchema("head", "renamedHead", schemaObj);

      expect((schemaObj.element ?? [])[1].substitutionGroup).toBe("renamedHead");
      expect(((schemaObj.complexType ?? [])[0].sequence!.element ?? [])[0].ref).toBe("renamedHead");
      expect(((schemaObj.group ?? [])[0].choice!.element ?? [])[0].ref).toBe("renamedHead");
    });

    test("renames targetNamespace-prefixed element refs and substitution groups", () => {
      const schemaObj = schemaWith(`
  <xs:element name="head"/>
  <xs:element name="child" substitutionGroup="tns:head"/>
  <xs:complexType name="Wrapper">
    <xs:sequence><xs:element ref="tns:head"/></xs:sequence>
  </xs:complexType>`);
      schemaObj.targetNamespace = "http://example.com/ns";
      schemaObj._namespacePrefixes = {
        xs: "http://www.w3.org/2001/XMLSchema",
        tns: "http://example.com/ns",
      };

      renameLocalElementRefInSchema("head", "renamedHead", schemaObj);

      expect((schemaObj.element ?? [])[1].substitutionGroup).toBe("tns:renamedHead");
      expect(((schemaObj.complexType ?? [])[0].sequence!.element ?? [])[0].ref).toBe(
        "tns:renamedHead"
      );
    });
  });
});
