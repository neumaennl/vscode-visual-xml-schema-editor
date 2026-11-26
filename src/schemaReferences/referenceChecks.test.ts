/**
 * Unit tests of `referenceChecks`.
 */

import { isAnyPrefixReferenced, isReferenced } from "./referenceChecks.js";
import { emptySchema, schemaWith } from "../../shared/__tests__/schemaTestHelpers.js";
import { unmarshal } from "@neumaennl/xmlbind-ts";
import { explicitGroup, schema, topLevelComplexType } from "../../shared/types.js";

/** A top-level element `foo` whose type has the prefix `ext`. */
const ELEMENT_OF_EXT_TYPE = `<xs:element name="foo" type="ext:FooType"/>`;

/** A local simpleType that restricts `ext:BaseType`. */
const SIMPLE_TYPE_OF_EXT_BASE = `<xs:simpleType><xs:restriction base="ext:BaseType"/></xs:simpleType>`;

/** A local element whose inline complexType references the group `G`. */
const LOCAL_ELEMENT_REFERENCING_G = `<xs:element name="inner"><xs:complexType><xs:group ref="G"/></xs:complexType></xs:element>`;

/**
 * Unmarshals a schema with the target namespace `urn:t`, declared with the prefixes `tns` and `own`, and
 * the namespace `urn:o` with the prefix `other`.
 *
 * @param body - The XSD content of the schema
 * @returns The schema object
 */
function schemaWithTargetNamespace(body: string): schema {
  return unmarshal(
    schema,
    `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:tns="urn:t" xmlns:own="urn:t" xmlns:other="urn:o"
           targetNamespace="urn:t">
${body}
</xs:schema>`
  );
}

describe("isReferenced", () => {
  test.each([
    ["the particle of a top-level complexType", `<xs:complexType name="T"><xs:group ref="G"/></xs:complexType>`],
    [
      "a choice nested in a sequence",
      `<xs:complexType name="T"><xs:sequence><xs:choice><xs:group ref="G"/></xs:choice></xs:sequence></xs:complexType>`,
    ],
    [
      "the extension of complex content",
      `<xs:complexType name="T"><xs:complexContent><xs:extension base="B"><xs:group ref="G"/></xs:extension></xs:complexContent></xs:complexType>`,
    ],
    [
      "the inline complexType of a top-level element",
      `<xs:element name="e"><xs:complexType><xs:sequence><xs:group ref="G"/></xs:sequence></xs:complexType></xs:element>`,
    ],
    [
      "the inline complexType of a local element in a named group",
      `<xs:group name="H"><xs:sequence>${LOCAL_ELEMENT_REFERENCING_G}</xs:sequence></xs:group>`,
    ],
    ["a named group", `<xs:group name="H"><xs:choice><xs:group ref="G"/></xs:choice></xs:group>`],
  ])("should find a group reference in %s", (_place, body) => {
    expect(isReferenced(schemaWith(body), "group", "G")).toBe(true);
  });

  test.each([
    ["a schema without content", ``],
    ["a reference to another group", `<xs:complexType name="T"><xs:group ref="H"/></xs:complexType>`],
    ["a definition of the group", `<xs:group name="G"><xs:sequence/></xs:group>`],
    [
      "a reference of another kind with the same name",
      `<xs:complexType name="T"><xs:attributeGroup ref="G"/></xs:complexType>`,
    ],
  ])("should find no group reference in %s", (_case, body) => {
    expect(isReferenced(schemaWith(body), "group", "G")).toBe(false);
  });

  test.each([
    ["a top-level complexType", `<xs:complexType name="T"><xs:attributeGroup ref="A"/></xs:complexType>`],
    [
      "the extension of simple content",
      `<xs:complexType name="T"><xs:simpleContent><xs:extension base="xs:string"><xs:attributeGroup ref="A"/></xs:extension></xs:simpleContent></xs:complexType>`,
    ],
    ["another attribute group", `<xs:attributeGroup name="B"><xs:attributeGroup ref="A"/></xs:attributeGroup>`],
  ])("should find an attribute group reference in %s", (_place, body) => {
    expect(isReferenced(schemaWith(body), "attributeGroup", "A")).toBe(true);
  });

  test.each([
    // Without a default namespace, a QName without a prefix is in no namespace, not in the target namespace
    ["G", false],
    ["tns:G", true],
    ["own:G", true],
    ["other:G", false],
  ])("should treat the reference %s in a schema with a target namespace as a reference to G: %s", (ref, expected) => {
    const schemaObj = schemaWithTargetNamespace(`<xs:complexType name="T"><xs:group ref="${ref}"/></xs:complexType>`);
    expect(isReferenced(schemaObj, "group", "G")).toBe(expected);
  });

  test("should search objects created by commands, which lack the arrays that unmarshalling creates", () => {
    const created = emptySchema();
    created.complexType = [Object.assign(new topLevelComplexType(), { name: "T", sequence: new explicitGroup() })];
    expect(isReferenced(created, "group", "G")).toBe(false);
  });
});

describe("isAnyPrefixReferenced", () => {
  test("should return false on an empty schema", () => {
    expect(isAnyPrefixReferenced(new Set(["ext"]), emptySchema())).toBe(false);
  });

  test.each([
    ["top-level element @type", ELEMENT_OF_EXT_TYPE],
    ["element @substitutionGroup", `<xs:element name="bar" substitutionGroup="ext:Head"/>`],
    [
      "simpleType restriction/@base",
      `<xs:simpleType name="MyST"><xs:restriction base="ext:ExternalBase"/></xs:simpleType>`,
    ],
    [
      "a union/@memberTypes token",
      `<xs:simpleType name="Union"><xs:union memberTypes="xs:string ext:Type2"/></xs:simpleType>`,
    ],
    [
      "complexContent extension/@base",
      `<xs:complexType name="Child"><xs:complexContent><xs:extension base="ext:Parent"/></xs:complexContent></xs:complexType>`,
    ],
    [
      "a deeply nested element type (sequence → choice → element)",
      `<xs:complexType name="Nested"><xs:sequence><xs:choice><xs:element name="deep" type="ext:DeepType"/></xs:choice></xs:sequence></xs:complexType>`,
    ],
    [
      "named attributeGroup attribute/@type",
      `<xs:attributeGroup name="AG"><xs:attribute name="a" type="ext:AttrType"/></xs:attributeGroup>`,
    ],
    [
      "inline simpleType/@restriction/@base on attribute in attributeGroup",
      `<xs:attributeGroup name="AG"><xs:attribute name="a">${SIMPLE_TYPE_OF_EXT_BASE}</xs:attribute></xs:attributeGroup>`,
    ],
    [
      "inline simpleType/@restriction/@base on attribute in complexType body",
      `<xs:complexType name="MyType"><xs:attribute name="a">${SIMPLE_TYPE_OF_EXT_BASE}</xs:attribute></xs:complexType>`,
    ],
    [
      "keyref/@refer on a top-level element",
      `<xs:element name="root"><xs:keyref name="ref1" refer="ext:KeyName"><xs:selector xpath="."/><xs:field xpath="@id"/></xs:keyref></xs:element>`,
    ],
    [
      "keyref/@refer on a local element in a compositor",
      `<xs:complexType name="CT"><xs:sequence><xs:element name="child"><xs:keyref name="ref1" refer="ext:KeyName"><xs:selector xpath="."/><xs:field xpath="@id"/></xs:keyref></xs:element></xs:sequence></xs:complexType>`,
    ],
  ])("should find the prefix in %s and no other prefix", (_place, content) => {
    const s = schemaWith(content);

    expect(isAnyPrefixReferenced(new Set(["ext"]), s)).toBe(true);
    expect(isAnyPrefixReferenced(new Set(["other"]), s)).toBe(false);
  });

  test("should find every prefix of a union/@memberTypes", () => {
    const s = schemaWith(`<xs:simpleType name="Union"><xs:union memberTypes="xs:string ext:Type2"/></xs:simpleType>`);

    expect(isAnyPrefixReferenced(new Set(["xs"]), s)).toBe(true);
  });

  test.each([
    ["false for an empty prefix set", ELEMENT_OF_EXT_TYPE, [], false],
    ["false when no prefix of the set is referenced", ELEMENT_OF_EXT_TYPE, ["ns1", "ns2"], false],
    [
      "true when the first prefix of the set is referenced",
      `<xs:element name="e" type="ns1:Foo"/>`,
      ["ns1", "ns2"],
      true,
    ],
    [
      "true when another prefix of the set is referenced",
      `<xs:element name="e" type="ns2:Foo"/>`,
      ["ns1", "ns2"],
      true,
    ],
    ["true for a single-element set when the prefix is referenced", ELEMENT_OF_EXT_TYPE, ["ext"], true],
    [
      "true when a prefix appears in memberTypes",
      `<xs:simpleType name="T"><xs:union memberTypes="ns1:A ns2:B"/></xs:simpleType>`,
      ["ns2", "ns3"],
      true,
    ],
    [
      "false when no prefix of memberTypes is in the set",
      `<xs:simpleType name="T"><xs:union memberTypes="ns1:A ns2:B"/></xs:simpleType>`,
      ["ns3", "ns4"],
      false,
    ],
  ])("should return %s", (_case, content, prefixes, expected) => {
    expect(isAnyPrefixReferenced(new Set(prefixes), schemaWith(content))).toBe(expected);
  });
});
