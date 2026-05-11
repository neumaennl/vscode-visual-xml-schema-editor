import { unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";
import {
  renameLocalAttributeGroupRefInSchema,
  renameLocalElementRefInSchema,
  renameLocalGroupRefInSchema,
  renameLocalTypeInSchema,
} from "./schemaLocalRenamer";

function schemaWith(body: string): schema {
  return unmarshal(
    schema,
    `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
${body}
</xs:schema>`
  );
}

describe("schemaLocalRenamer", () => {
  describe("renameLocalTypeInSchema", () => {
    it("renames unqualified type references throughout the schema", () => {
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

    it("leaves prefixed type references untouched", () => {
      const schemaObj = schemaWith(`
  <xs:element name="status" type="BaseType"/>
  <xs:element name="external" type="ext:BaseType"/>`);

      renameLocalTypeInSchema("BaseType", "RenamedType", schemaObj);

      const elements = toArray(schemaObj.element);
      expect(elements[0].type_).toBe("RenamedType");
      expect(elements[1].type_).toBe("ext:BaseType");
    });
  });

  describe("renameLocalGroupRefInSchema", () => {
    it("renames matching group refs in complex types and named groups", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="Wrapper"><xs:group ref="OldGroup"/></xs:complexType>
  <xs:group name="Container"><xs:sequence><xs:group ref="OldGroup"/></xs:sequence></xs:group>`);

      renameLocalGroupRefInSchema("OldGroup", "NewGroup", schemaObj);

      expect(toArray(schemaObj.complexType)[0].group!.ref).toBe("NewGroup");
      expect(toArray(toArray(schemaObj.group)[0].sequence!.group)[0].ref).toBe("NewGroup");
    });
  });

  describe("renameLocalAttributeGroupRefInSchema", () => {
    it("renames matching attributeGroup refs across holders", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="Wrapper"><xs:attributeGroup ref="OldAttrs"/></xs:complexType>
  <xs:attributeGroup name="Shared"><xs:attributeGroup ref="OldAttrs"/></xs:attributeGroup>`);

      renameLocalAttributeGroupRefInSchema("OldAttrs", "NewAttrs", schemaObj);

      expect(toArray(toArray(schemaObj.complexType)[0].attributeGroup)[0].ref).toBe("NewAttrs");
      expect(toArray(toArray(schemaObj.attributeGroup)[0].attributeGroup)[0].ref).toBe("NewAttrs");
    });
  });

  describe("renameLocalElementRefInSchema", () => {
    it("renames matching element refs and substitution groups", () => {
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
  });
});
