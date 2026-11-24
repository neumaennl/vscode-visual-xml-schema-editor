/**
 * Unit tests of `referenceRewrites`. The rewrites that commands trigger are tested in the tests of their
 * executors, such as `schemaExecutors.test.ts`.
 */

import { marshal } from "@neumaennl/xmlbind-ts";
import { renameReferencesInTargetNamespace, rewritePrefix } from "./referenceRewrites.js";
import { emptySchema, schemaWith } from "../../shared/__tests__/schemaTestHelpers.js";
import { readTestSchema } from "../__tests__/resourceTestHelpers.js";
import type { localComplexType, schema } from "../../shared/types.js";

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

describe("renameReferencesInTargetNamespace", () => {
  test.each([
    {
      kind: "group" as const,
      oldName: "groupRef",
      read: (s: schema): string | undefined => anonymousType(s)?.sequence?.group?.[0]?.ref,
    },
    {
      kind: "group" as const,
      oldName: "groupRefInGroup",
      read: (s: schema): string | undefined =>
        s.group?.[0]?.sequence?.element?.[0]?.complexType?.sequence?.group?.[0]?.ref,
    },
    {
      kind: "attributeGroup" as const,
      oldName: "attributeGroupRef",
      read: (s: schema): string | undefined => anonymousType(s)?.attributeGroup?.[0]?.ref,
    },
    {
      kind: "element" as const,
      oldName: "elementRef",
      read: (s: schema): string | undefined => anonymousType(s)?.sequence?.element?.[0]?.ref,
    },
  ])(
    "should rename the reference to $oldName in an anonymous complex type of the kind $kind",
    ({ kind, oldName, read }) => {
      const schemaObj = readTestSchema(QNAME_IN_EVERY_PLACE);

      renameReferencesInTargetNamespace(kind, oldName, "Renamed", schemaObj);

      expect(read(schemaObj)).toBe("tns:Renamed");
    }
  );

  describe("renameReferencesInTargetNamespace for type", () => {
    test("should rename unqualified type references throughout the schema", () => {
      const schemaObj = readTestSchema("types-referencing-base-type.xsd");

      renameReferencesInTargetNamespace("type", "BaseType", "RenamedType", schemaObj);

      expect((schemaObj.element ?? [])[0]!.type_).toBe("RenamedType");
      expect((schemaObj.attribute ?? [])[0]!.type_).toBe("RenamedType");
      expect(((schemaObj.complexType ?? [])[0]!.sequence!.element ?? [])[0]!.type_).toBe("RenamedType");
      expect((schemaObj.simpleType ?? [])[1]!.restriction!.base).toBe("RenamedType");
    });

    test("should leave prefixed type references untouched", () => {
      const schemaObj = schemaWith(`
  <xs:element name="status" type="BaseType"/>
  <xs:element name="external" type="ext:BaseType"/>`);

      renameReferencesInTargetNamespace("type", "BaseType", "RenamedType", schemaObj);

      const elements = schemaObj.element ?? [];
      expect(elements[0]!.type_).toBe("RenamedType");
      expect(elements[1]!.type_).toBe("ext:BaseType");
    });

    test("should rename references that use the current schema targetNamespace prefix", () => {
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

      renameReferencesInTargetNamespace("type", "BaseType", "RenamedType", schemaObj);

      expect((schemaObj.element ?? [])[0]!.type_).toBe("tns:RenamedType");
      expect(((schemaObj.complexType ?? [])[0]!.sequence!.element ?? [])[0]!.type_).toBe("tns:RenamedType");
      expect((schemaObj.simpleType ?? [])[1]!.restriction!.base).toBe("tns:RenamedType");
    });
  });

  describe("renameReferencesInTargetNamespace for group", () => {
    test("should rename matching group refs in complex types and named groups", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="Wrapper"><xs:group ref="OldGroup"/></xs:complexType>
  <xs:group name="Container"><xs:sequence><xs:group ref="OldGroup"/></xs:sequence></xs:group>`);

      renameReferencesInTargetNamespace("group", "OldGroup", "NewGroup", schemaObj);

      expect((schemaObj.complexType ?? [])[0]!.group!.ref).toBe("NewGroup");
      expect(((schemaObj.group ?? [])[0]!.sequence!.group ?? [])[0]!.ref).toBe("NewGroup");
    });

    test("should rename targetNamespace-prefixed group refs", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="Wrapper"><xs:group ref="tns:OldGroup"/></xs:complexType>`);
      schemaObj.targetNamespace = "http://example.com/ns";
      schemaObj._namespacePrefixes = {
        xs: "http://www.w3.org/2001/XMLSchema",
        tns: "http://example.com/ns",
      };

      renameReferencesInTargetNamespace("group", "OldGroup", "NewGroup", schemaObj);

      expect((schemaObj.complexType ?? [])[0]!.group!.ref).toBe("tns:NewGroup");
    });
  });

  describe("renameReferencesInTargetNamespace for attributeGroup", () => {
    test("should rename matching attributeGroup refs across holders", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="Wrapper"><xs:attributeGroup ref="OldAttrs"/></xs:complexType>
  <xs:attributeGroup name="Shared"><xs:attributeGroup ref="OldAttrs"/></xs:attributeGroup>`);

      renameReferencesInTargetNamespace("attributeGroup", "OldAttrs", "NewAttrs", schemaObj);

      expect(((schemaObj.complexType ?? [])[0]!.attributeGroup ?? [])[0]!.ref).toBe("NewAttrs");
      expect(((schemaObj.attributeGroup ?? [])[0]!.attributeGroup ?? [])[0]!.ref).toBe("NewAttrs");
    });

    test("should rename targetNamespace-prefixed attributeGroup refs", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="Wrapper"><xs:attributeGroup ref="tns:OldAttrs"/></xs:complexType>`);
      schemaObj.targetNamespace = "http://example.com/ns";
      schemaObj._namespacePrefixes = {
        xs: "http://www.w3.org/2001/XMLSchema",
        tns: "http://example.com/ns",
      };

      renameReferencesInTargetNamespace("attributeGroup", "OldAttrs", "NewAttrs", schemaObj);

      expect(((schemaObj.complexType ?? [])[0]!.attributeGroup ?? [])[0]!.ref).toBe("tns:NewAttrs");
    });
  });

  describe("renameReferencesInTargetNamespace for element", () => {
    test("should rename matching element refs and substitution groups", () => {
      const schemaObj = schemaWith(`
  <xs:element name="head"/>
  <xs:element name="child" substitutionGroup="head"/>
  <xs:complexType name="Wrapper">
    <xs:sequence><xs:element ref="head"/></xs:sequence>
  </xs:complexType>
  <xs:group name="Container">
    <xs:choice><xs:element ref="head"/></xs:choice>
  </xs:group>`);

      renameReferencesInTargetNamespace("element", "head", "renamedHead", schemaObj);

      expect((schemaObj.element ?? [])[1]!.substitutionGroup).toBe("renamedHead");
      expect(((schemaObj.complexType ?? [])[0]!.sequence!.element ?? [])[0]!.ref).toBe("renamedHead");
      expect(((schemaObj.group ?? [])[0]!.choice!.element ?? [])[0]!.ref).toBe("renamedHead");
    });

    test("should rename targetNamespace-prefixed element refs and substitution groups", () => {
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

      renameReferencesInTargetNamespace("element", "head", "renamedHead", schemaObj);

      expect((schemaObj.element ?? [])[1]!.substitutionGroup).toBe("tns:renamedHead");
      expect(((schemaObj.complexType ?? [])[0]!.sequence!.element ?? [])[0]!.ref).toBe("tns:renamedHead");
    });
  });
});

describe("renameReferencesInTargetNamespace with the namespace of XML Schema as the default namespace", () => {
  test("should rename only the reference with the prefix of the target namespace", () => {
    const schemaObj = readTestSchema("xsd-as-default-namespace.xsd");

    renameReferencesInTargetNamespace("group", "G", "Renamed", schemaObj);

    expect(schemaObj.complexType?.map((type) => [type.name, type.group?.ref])).toEqual([
      ["Unprefixed", "G"],
      ["Prefixed", "tns:Renamed"],
    ]);
  });
});

describe("rewritePrefix", () => {
  test("should do nothing when the old prefix matches the new prefix", () => {
    const schemaObj = schemaWith(ELEMENT_OF_EXT_TYPE, EXT_PREFIX);

    rewritePrefix("ext", "ext", schemaObj);

    expect(schemaObj.element?.[0]!.type_).toBe("ext:FooType");
  });

  test("should not throw on an empty schema", () => {
    expect(() => {
      rewritePrefix("old", "new", emptySchema());
    }).not.toThrow();
  });

  test("should not rewrite element @type values with a different prefix", () => {
    const schemaObj = schemaWith(`${ELEMENT_OF_EXT_TYPE}<xs:element name="bar" type="xs:string"/>`, EXT_PREFIX);

    rewritePrefix("ext", "p", schemaObj);

    expect(schemaObj.element?.[1]!.type_).toBe("xs:string");
  });

  test.each([
    ["top-level element @type", ELEMENT_OF_EXT_TYPE, `type="p:FooType"`],
    [
      "top-level element @substitutionGroup",
      `<xs:element name="foo" substitutionGroup="ext:Head"/>`,
      `substitutionGroup="p:Head"`,
    ],
    ["top-level attribute @type", `<xs:attribute name="myAttr" type="ext:AttrType"/>`, `type="p:AttrType"`],
    [
      "simpleType restriction/@base",
      `<xs:simpleType name="MyST"><xs:restriction base="ext:BaseString"/></xs:simpleType>`,
      `base="p:BaseString"`,
    ],
    [
      "simpleType list/@itemType",
      `<xs:simpleType name="ListST"><xs:list itemType="ext:ItemType"/></xs:simpleType>`,
      `itemType="p:ItemType"`,
    ],
    [
      "all matching union/@memberTypes tokens",
      `<xs:simpleType name="UnionST"><xs:union memberTypes="ext:TypeA xs:string ext:TypeB"/></xs:simpleType>`,
      `memberTypes="p:TypeA xs:string p:TypeB"`,
    ],
    [
      "complexContent extension/@base",
      complexTypeWith(`<xs:complexContent><xs:extension base="ext:Parent"/></xs:complexContent>`),
      `base="p:Parent"`,
    ],
    [
      "complexContent restriction/@base",
      complexTypeWith(`<xs:complexContent><xs:restriction base="ext:Base"/></xs:complexContent>`),
      `base="p:Base"`,
    ],
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
    [
      "simpleContent restriction/@base",
      complexTypeWith(`<xs:simpleContent><xs:restriction base="ext:SimpleBase"/></xs:simpleContent>`),
      `base="p:SimpleBase"`,
    ],
    ["top-level complexType group refs", complexTypeWith(`<xs:group ref="ext:MyGroup"/>`), `ref="p:MyGroup"`],
    [
      "top-level complexType attributeGroup refs",
      complexTypeWith(`<xs:attributeGroup ref="ext:MyAttrGroup"/>`),
      `ref="p:MyAttrGroup"`,
    ],
    [
      "top-level complexType attribute @type",
      complexTypeWith(`<xs:attribute name="localAttr" type="ext:AttrType"/>`),
      `type="p:AttrType"`,
    ],
    [
      "inline simpleType restriction bases on complexType attributes",
      complexTypeWith(`<xs:attribute name="localAttr">${SIMPLE_TYPE_OF_EXT_BASE}</xs:attribute>`),
      `base="p:BaseType"`,
    ],
    [
      "deeply nested compositor element @type values",
      complexTypeWith(
        `<xs:sequence><xs:choice><xs:element name="deep" type="ext:DeepType"/></xs:choice></xs:sequence>`
      ),
      `type="p:DeepType"`,
    ],
    [
      "nested group refs inside compositors",
      complexTypeWith(`<xs:sequence><xs:group ref="ext:SeqGroup"/></xs:sequence>`),
      `ref="p:SeqGroup"`,
    ],
    [
      "keyref/@refer on top-level elements",
      `<xs:element name="root">${KEYREF_TO_EXT_KEY}</xs:element>`,
      `refer="p:KeyName"`,
    ],
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

    rewritePrefix("ext", "p", schemaObj);

    const xml = marshal(schemaObj);
    expect(xml).toContain(expected);
    expect(xml).not.toContain(`"ext:`);
    expect(xml).not.toContain(` ext:`);
  });
});
