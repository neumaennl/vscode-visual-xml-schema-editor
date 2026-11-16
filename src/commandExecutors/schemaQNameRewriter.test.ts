/**
 * Unit tests for rewritePrefixInSchema.
 *
 * These tests call rewritePrefixInSchema directly to verify that each QName-valued
 * field is rewritten in isolation. Integration coverage (rewriting triggered via
 * executeModifyImport) lives in schemaExecutors.test.ts.
 */

import { marshal } from "@neumaennl/xmlbind-ts";
import { rewritePrefixInSchema } from "./schemaQNameRewriter.js";
import { emptySchema, schemaWith } from "../../shared/__tests__/schemaTestHelpers.js";

/** The prefix `ext` for the namespace `http://example.com/ext`. */
const EXT_PREFIX = { ext: "http://example.com/ext" };

/** A top-level element `foo` whose type has the prefix `ext`. */
const ELEMENT_OF_EXT_TYPE = `<xs:element name="foo" type="ext:FooType"/>`;

/** A local simpleType that restricts `ext:BaseType`. */
const SIMPLE_TYPE_OF_EXT_BASE = `<xs:simpleType><xs:restriction base="ext:BaseType"/></xs:simpleType>`;

/** A keyref `ref1` that refers to `ext:KeyName`. */
const KEYREF_TO_EXT_KEY = `<xs:keyref name="ref1" refer="ext:KeyName"><xs:selector xpath="."/><xs:field xpath="@id"/></xs:keyref>`;

/**
 * Returns a complexType `T` with the given content.
 *
 * @param content - The content of the complexType
 * @returns The schema content
 */
function complexTypeWith(content: string): string {
  return `<xs:complexType name="T">${content}</xs:complexType>`;
}

describe("rewritePrefixInSchema", () => {
  test("should do nothing when the old prefix matches the new prefix", () => {
    const schemaObj = schemaWith(ELEMENT_OF_EXT_TYPE, EXT_PREFIX);

    rewritePrefixInSchema("ext", "ext", schemaObj);

    expect(schemaObj.element?.[0].type_).toBe("ext:FooType");
  });

  test("should not throw on an empty schema", () => {
    expect(() => { rewritePrefixInSchema("old", "new", emptySchema()); }).not.toThrow();
  });

  test("should not rewrite element @type values with a different prefix", () => {
    const schemaObj = schemaWith(`${ELEMENT_OF_EXT_TYPE}<xs:element name="bar" type="xs:string"/>`, EXT_PREFIX);

    rewritePrefixInSchema("ext", "p", schemaObj);

    expect(schemaObj.element?.[1].type_).toBe("xs:string");
  });

  test.each([
    ["top-level element @type", ELEMENT_OF_EXT_TYPE, `type="p:FooType"`],
    ["top-level element @substitutionGroup", `<xs:element name="foo" substitutionGroup="ext:Head"/>`, `substitutionGroup="p:Head"`],
    ["top-level attribute @type", `<xs:attribute name="myAttr" type="ext:AttrType"/>`, `type="p:AttrType"`],
    ["simpleType restriction/@base", `<xs:simpleType name="MyST"><xs:restriction base="ext:BaseString"/></xs:simpleType>`, `base="p:BaseString"`],
    ["simpleType list/@itemType", `<xs:simpleType name="ListST"><xs:list itemType="ext:ItemType"/></xs:simpleType>`, `itemType="p:ItemType"`],
    [
      "all matching union/@memberTypes tokens",
      `<xs:simpleType name="UnionST"><xs:union memberTypes="ext:TypeA xs:string ext:TypeB"/></xs:simpleType>`,
      `memberTypes="p:TypeA xs:string p:TypeB"`,
    ],
    ["complexContent extension/@base", complexTypeWith(`<xs:complexContent><xs:extension base="ext:Parent"/></xs:complexContent>`), `base="p:Parent"`],
    ["complexContent restriction/@base", complexTypeWith(`<xs:complexContent><xs:restriction base="ext:Base"/></xs:complexContent>`), `base="p:Base"`],
    [
      "element @type inside a complexContent extension sequence",
      complexTypeWith(
        `<xs:complexContent><xs:extension base="xs:anyType"><xs:sequence><xs:element name="child" type="ext:ChildType"/></xs:sequence></xs:extension></xs:complexContent>`
      ),
      `type="p:ChildType"`,
    ],
    [
      "simpleContent extension/@base and the @type of its attribute",
      complexTypeWith(
        `<xs:simpleContent><xs:extension base="ext:SimpleBase"><xs:attribute name="scAttr" type="ext:AttrType"/></xs:extension></xs:simpleContent>`
      ),
      `type="p:AttrType"`,
    ],
    ["simpleContent restriction/@base", complexTypeWith(`<xs:simpleContent><xs:restriction base="ext:SimpleBase"/></xs:simpleContent>`), `base="p:SimpleBase"`],
    ["top-level complexType group refs", complexTypeWith(`<xs:group ref="ext:MyGroup"/>`), `ref="p:MyGroup"`],
    ["top-level complexType attributeGroup refs", complexTypeWith(`<xs:attributeGroup ref="ext:MyAttrGroup"/>`), `ref="p:MyAttrGroup"`],
    ["top-level complexType attribute @type", complexTypeWith(`<xs:attribute name="localAttr" type="ext:AttrType"/>`), `type="p:AttrType"`],
    [
      "inline simpleType restriction bases on complexType attributes",
      complexTypeWith(`<xs:attribute name="localAttr">${SIMPLE_TYPE_OF_EXT_BASE}</xs:attribute>`),
      `base="p:BaseType"`,
    ],
    [
      "deeply nested compositor element @type values",
      complexTypeWith(`<xs:sequence><xs:choice><xs:element name="deep" type="ext:DeepType"/></xs:choice></xs:sequence>`),
      `type="p:DeepType"`,
    ],
    ["nested group refs inside compositors", complexTypeWith(`<xs:sequence><xs:group ref="ext:SeqGroup"/></xs:sequence>`), `ref="p:SeqGroup"`],
    ["keyref/@refer on top-level elements", `<xs:element name="root">${KEYREF_TO_EXT_KEY}</xs:element>`, `refer="p:KeyName"`],
    [
      "keyref/@refer on nested elements",
      complexTypeWith(`<xs:sequence><xs:element name="child">${KEYREF_TO_EXT_KEY}</xs:element></xs:sequence>`),
      `refer="p:KeyName"`,
    ],
    [
      "element @type values inside local complexTypes",
      `<xs:element name="wrapper"><xs:complexType><xs:sequence><xs:element name="inner" type="ext:InnerType"/></xs:sequence></xs:complexType></xs:element>`,
      `type="p:InnerType"`,
    ],
    [
      "named group sequence element @type values",
      `<xs:group name="MyGroup"><xs:sequence><xs:element name="child" type="ext:ChildType"/></xs:sequence></xs:group>`,
      `type="p:ChildType"`,
    ],
    [
      "named group choice element @type values",
      `<xs:group name="ChoiceGroup"><xs:choice><xs:element name="opt" type="ext:OptType"/></xs:choice></xs:group>`,
      `type="p:OptType"`,
    ],
    [
      "named attributeGroup attribute @type values",
      `<xs:attributeGroup name="MyAttrGroup"><xs:attribute name="a" type="ext:AttrType"/></xs:attributeGroup>`,
      `type="p:AttrType"`,
    ],
    [
      "inline simpleType restriction bases in named attribute groups",
      `<xs:attributeGroup name="MyAttrGroup"><xs:attribute name="a">${SIMPLE_TYPE_OF_EXT_BASE}</xs:attribute></xs:attributeGroup>`,
      `base="p:BaseType"`,
    ],
    [
      "nested attributeGroup refs in named attribute groups",
      `<xs:attributeGroup name="MyAttrGroup"><xs:attributeGroup ref="ext:InnerGroup"/></xs:attributeGroup>`,
      `ref="p:InnerGroup"`,
    ],
  ])("should rewrite %s", (_place, content, expected) => {
    const schemaObj = schemaWith(content, EXT_PREFIX);

    rewritePrefixInSchema("ext", "p", schemaObj);

    const xml = marshal(schemaObj);
    expect(xml).toContain(expected);
    expect(xml).not.toContain(`"ext:`);
    expect(xml).not.toContain(` ext:`);
  });
});
