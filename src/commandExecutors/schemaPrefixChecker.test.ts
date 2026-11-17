/**
 * Unit tests for schema prefix reference checks.
 */

import { isAnyPrefixReferencedInSchema } from "./schemaPrefixChecker.js";
import { emptySchema, schemaWith } from "../../shared/__tests__/schemaTestHelpers.js";

/** A top-level element `foo` whose type has the prefix `ext`. */
const ELEMENT_OF_EXT_TYPE = `<xs:element name="foo" type="ext:FooType"/>`;

/** A local simpleType that restricts `ext:BaseType`. */
const SIMPLE_TYPE_OF_EXT_BASE = `<xs:simpleType><xs:restriction base="ext:BaseType"/></xs:simpleType>`;

describe("isAnyPrefixReferencedInSchema", () => {
  test("should return false on an empty schema", () => {
    expect(isAnyPrefixReferencedInSchema(new Set(["ext"]), emptySchema())).toBe(false);
  });

  test.each([
    ["top-level element @type", ELEMENT_OF_EXT_TYPE],
    ["element @substitutionGroup", `<xs:element name="bar" substitutionGroup="ext:Head"/>`],
    ["simpleType restriction/@base", `<xs:simpleType name="MyST"><xs:restriction base="ext:ExternalBase"/></xs:simpleType>`],
    ["a union/@memberTypes token", `<xs:simpleType name="Union"><xs:union memberTypes="xs:string ext:Type2"/></xs:simpleType>`],
    [
      "complexContent extension/@base",
      `<xs:complexType name="Child"><xs:complexContent><xs:extension base="ext:Parent"/></xs:complexContent></xs:complexType>`,
    ],
    [
      "a deeply nested element type (sequence → choice → element)",
      `<xs:complexType name="Nested"><xs:sequence><xs:choice><xs:element name="deep" type="ext:DeepType"/></xs:choice></xs:sequence></xs:complexType>`,
    ],
    ["named attributeGroup attribute/@type", `<xs:attributeGroup name="AG"><xs:attribute name="a" type="ext:AttrType"/></xs:attributeGroup>`],
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

    expect(isAnyPrefixReferencedInSchema(new Set(["ext"]), s)).toBe(true);
    expect(isAnyPrefixReferencedInSchema(new Set(["other"]), s)).toBe(false);
  });

  test("should find every prefix of a union/@memberTypes", () => {
    const s = schemaWith(`<xs:simpleType name="Union"><xs:union memberTypes="xs:string ext:Type2"/></xs:simpleType>`);

    expect(isAnyPrefixReferencedInSchema(new Set(["xs"]), s)).toBe(true);
  });

  test.each([
    ["false for an empty prefix set", ELEMENT_OF_EXT_TYPE, [], false],
    ["false when no prefix of the set is referenced", ELEMENT_OF_EXT_TYPE, ["ns1", "ns2"], false],
    ["true when the first prefix of the set is referenced", `<xs:element name="e" type="ns1:Foo"/>`, ["ns1", "ns2"], true],
    ["true when another prefix of the set is referenced", `<xs:element name="e" type="ns2:Foo"/>`, ["ns1", "ns2"], true],
    ["true for a single-element set when the prefix is referenced", ELEMENT_OF_EXT_TYPE, ["ext"], true],
    ["true when a prefix appears in memberTypes", `<xs:simpleType name="T"><xs:union memberTypes="ns1:A ns2:B"/></xs:simpleType>`, ["ns2", "ns3"], true],
    ["false when no prefix of memberTypes is in the set", `<xs:simpleType name="T"><xs:union memberTypes="ns1:A ns2:B"/></xs:simpleType>`, ["ns3", "ns4"], false],
  ])("should return %s", (_case, content, prefixes, expected) => {
    expect(isAnyPrefixReferencedInSchema(new Set(prefixes), schemaWith(content))).toBe(expected);
  });
});
