import { toArray } from "../../shared/schemaUtils.js";
import {
  renameLocalAttributeGroupRefInSchema,
  renameLocalElementRefInSchema,
  renameLocalGroupRefInSchema,
  renameLocalTypeInSchema,
} from "./schemaLocalRenamer.js";
import { schemaWith } from "../__tests__/schemaTestHelpers.js";

describe("schemaLocalRenamer", () => {
  describe("renameLocalTypeInSchema", () => {
    test("renames unqualified type references throughout the schema", () => {
      const schemaObj = schemaWith(`
  <xs:simpleType name="BaseType"><xs:restriction base="xs:string"/></xs:simpleType>
  <xs:element name="status" type="BaseType"/>
  <xs:attribute name="code" type="BaseType"/>
  <xs:complexType name="Wrapper">
    <xs:sequence>
      <xs:element name="nested" type="BaseType"/>
    </xs:sequence>
  </xs:complexType>
  <xs:simpleType name="DerivedType">
    <xs:restriction base="BaseType"/>
  </xs:simpleType>`);

      renameLocalTypeInSchema("BaseType", "RenamedType", schemaObj);

      expect(toArray(schemaObj.element)[0].type_).toBe("RenamedType");
      expect(toArray(schemaObj.attribute)[0].type_).toBe("RenamedType");
      expect(toArray(toArray(schemaObj.complexType)[0].sequence!.element)[0].type_).toBe("RenamedType");
      expect(toArray(schemaObj.simpleType)[1].restriction!.base).toBe("RenamedType");
    });

    test("leaves prefixed type references untouched", () => {
      const schemaObj = schemaWith(`
  <xs:element name="status" type="BaseType"/>
  <xs:element name="external" type="ext:BaseType"/>`);

      renameLocalTypeInSchema("BaseType", "RenamedType", schemaObj);

      const elements = toArray(schemaObj.element);
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

      expect(toArray(schemaObj.element)[0].type_).toBe("tns:RenamedType");
      expect(toArray(toArray(schemaObj.complexType)[0].sequence!.element)[0].type_).toBe(
        "tns:RenamedType"
      );
      expect(toArray(schemaObj.simpleType)[1].restriction!.base).toBe("tns:RenamedType");
    });
  });

  describe("renameLocalGroupRefInSchema", () => {
    test("renames matching group refs in complex types and named groups", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="Wrapper"><xs:group ref="OldGroup"/></xs:complexType>
  <xs:group name="Container"><xs:sequence><xs:group ref="OldGroup"/></xs:sequence></xs:group>`);

      renameLocalGroupRefInSchema("OldGroup", "NewGroup", schemaObj);

      expect(toArray(schemaObj.complexType)[0].group!.ref).toBe("NewGroup");
      expect(toArray(toArray(schemaObj.group)[0].sequence!.group)[0].ref).toBe("NewGroup");
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

      expect(toArray(schemaObj.complexType)[0].group!.ref).toBe("tns:NewGroup");
    });
  });

  describe("renameLocalAttributeGroupRefInSchema", () => {
    test("renames matching attributeGroup refs across holders", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="Wrapper"><xs:attributeGroup ref="OldAttrs"/></xs:complexType>
  <xs:attributeGroup name="Shared"><xs:attributeGroup ref="OldAttrs"/></xs:attributeGroup>`);

      renameLocalAttributeGroupRefInSchema("OldAttrs", "NewAttrs", schemaObj);

      expect(toArray(toArray(schemaObj.complexType)[0].attributeGroup)[0].ref).toBe("NewAttrs");
      expect(toArray(toArray(schemaObj.attributeGroup)[0].attributeGroup)[0].ref).toBe("NewAttrs");
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

      expect(toArray(toArray(schemaObj.complexType)[0].attributeGroup)[0].ref).toBe("tns:NewAttrs");
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

      expect(toArray(schemaObj.element)[1].substitutionGroup).toBe("renamedHead");
      expect(toArray(toArray(schemaObj.complexType)[0].sequence!.element)[0].ref).toBe("renamedHead");
      expect(toArray(toArray(schemaObj.group)[0].choice!.element)[0].ref).toBe("renamedHead");
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

      expect(toArray(schemaObj.element)[1].substitutionGroup).toBe("tns:renamedHead");
      expect(toArray(toArray(schemaObj.complexType)[0].sequence!.element)[0].ref).toBe(
        "tns:renamedHead"
      );
    });
  });
});
