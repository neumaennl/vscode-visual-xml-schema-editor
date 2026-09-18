/**
 * Unit tests for schema prefix reference checks.
 */

import { unmarshal } from "@neumaennl/xmlbind-ts";
import {
  schema,
  topLevelComplexType,
  topLevelSimpleType,
  localSimpleType,
  topLevelElement,
  namedAttributeGroup,
  localElement,
  explicitGroup,
  extensionType,
  complexContentType,
  restrictionType,
  unionType,
  attribute,
  keyrefType,
} from "../../shared/types";
import { isPrefixReferencedInSchema, isAnyPrefixReferencedInSchema } from "./schemaPrefixChecker";

function emptySchema(): schema {
  return unmarshal(
    schema,
    `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"></xs:schema>`
  );
}

// ---------------------------------------------------------------------------
// isPrefixReferencedInSchema — keyref/@refer
// ---------------------------------------------------------------------------
describe("isPrefixReferencedInSchema — keyref/@refer", () => {
  it("returns true when prefix is used in keyref/@refer on a top-level element", () => {
    const s = emptySchema();
    const el = new topLevelElement();
    el.name = "root";
    const kr = new keyrefType();
    kr.name = "ref1";
    kr.refer = "ext:KeyName";
    el.keyref = [kr];
    s.element = [el];

    expect(isPrefixReferencedInSchema("ext", s)).toBe(true);
    expect(isPrefixReferencedInSchema("other", s)).toBe(false);
  });

  it("returns true when prefix is used in keyref/@refer on a local element in a compositor", () => {
    const s = emptySchema();
    const ct = new topLevelComplexType();
    ct.name = "CT";
    const seq = new explicitGroup();
    const el = new localElement();
    el.name = "child";
    const kr = new keyrefType();
    kr.name = "ref1";
    kr.refer = "ext:KeyName";
    el.keyref = [kr];
    seq.element = [el];
    ct.sequence = seq;
    s.complexType = [ct];

    expect(isPrefixReferencedInSchema("ext", s)).toBe(true);
    expect(isPrefixReferencedInSchema("other", s)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isPrefixReferencedInSchema
// ---------------------------------------------------------------------------

describe("isPrefixReferencedInSchema", () => {
  it("returns false on an empty schema", () => {
    expect(isPrefixReferencedInSchema("ext", emptySchema())).toBe(false);
  });

  it("returns false when a different prefix is used", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:ext="http://example.com/ext">
  <xs:element name="foo" type="ext:FooType"/>
</xs:schema>`;
    const s = unmarshal(schema, xml);
    expect(isPrefixReferencedInSchema("other", s)).toBe(false);
  });

  it("returns true for top-level element @type", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:ext="http://example.com/ext">
  <xs:element name="foo" type="ext:FooType"/>
</xs:schema>`;
    const s = unmarshal(schema, xml);
    expect(isPrefixReferencedInSchema("ext", s)).toBe(true);
  });

  it("returns true for element @substitutionGroup", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:ext="http://example.com/ext">
  <xs:element name="bar" substitutionGroup="ext:Head"/>
</xs:schema>`;
    const s = unmarshal(schema, xml);
    expect(isPrefixReferencedInSchema("ext", s)).toBe(true);
  });

  it("returns true for simpleType restriction/@base", () => {
    const s = emptySchema();
    const st = new topLevelSimpleType();
    st.name = "MyST";
    const restr = new restrictionType();
    restr.base = "ext:ExternalBase";
    st.restriction = restr;
    s.simpleType = [st];
    expect(isPrefixReferencedInSchema("ext", s)).toBe(true);
  });

  it("returns true for a union/@memberTypes token", () => {
    const s = emptySchema();
    const st = new topLevelSimpleType();
    st.name = "Union";
    const union = new unionType();
    union.memberTypes = "xs:string ext:Type2";
    st.union = union;
    s.simpleType = [st];
    expect(isPrefixReferencedInSchema("ext", s)).toBe(true);
    expect(isPrefixReferencedInSchema("xs", s)).toBe(true);
    expect(isPrefixReferencedInSchema("other", s)).toBe(false);
  });

  it("returns true for complexContent extension/@base", () => {
    const s = emptySchema();
    const ct = new topLevelComplexType();
    ct.name = "Child";
    const cc = new complexContentType();
    const ext = new extensionType();
    ext.base = "ext:Parent";
    cc.extension = ext;
    ct.complexContent = cc;
    s.complexType = [ct];
    expect(isPrefixReferencedInSchema("ext", s)).toBe(true);
  });

  it("returns true for a deeply nested element type (sequence → choice → element)", () => {
    const s = emptySchema();
    const ct = new topLevelComplexType();
    ct.name = "Nested";
    const choice = new explicitGroup();
    const el = new localElement();
    el.name = "deep";
    el.type_ = "ext:DeepType";
    choice.element = [el];
    const seq = new explicitGroup();
    seq.choice = [choice];
    ct.sequence = seq;
    s.complexType = [ct];
    expect(isPrefixReferencedInSchema("ext", s)).toBe(true);
    expect(isPrefixReferencedInSchema("other", s)).toBe(false);
  });

  it("returns true for named attributeGroup attribute/@type", () => {
    const s = emptySchema();
    const ag = new namedAttributeGroup();
    ag.name = "AG";
    const attr = new attribute();
    attr.name = "a";
    attr.type_ = "ext:AttrType";
    ag.attribute = [attr];
    s.attributeGroup = [ag];
    expect(isPrefixReferencedInSchema("ext", s)).toBe(true);
  });

  it("returns true for inline simpleType/@restriction/@base on attribute in attributeGroup", () => {
    const s = emptySchema();
    const ag = new namedAttributeGroup();
    ag.name = "AG";
    const attr = new attribute();
    attr.name = "a";
    const st = new localSimpleType();
    const restr = new restrictionType();
    restr.base = "ext:BaseType";
    st.restriction = restr;
    attr.simpleType = st;
    ag.attribute = [attr];
    s.attributeGroup = [ag];
    expect(isPrefixReferencedInSchema("ext", s)).toBe(true);
    expect(isPrefixReferencedInSchema("other", s)).toBe(false);
  });

  it("returns true for inline simpleType/@restriction/@base on attribute in complexType body", () => {
    const s = emptySchema();
    const ct = new topLevelComplexType();
    ct.name = "MyType";
    const attr = new attribute();
    attr.name = "a";
    const st = new localSimpleType();
    const restr = new restrictionType();
    restr.base = "ext:BaseType";
    st.restriction = restr;
    attr.simpleType = st;
    ct.attribute = [attr];
    s.complexType = [ct];
    expect(isPrefixReferencedInSchema("ext", s)).toBe(true);
    expect(isPrefixReferencedInSchema("other", s)).toBe(false);
  });
});

describe("isAnyPrefixReferencedInSchema", () => {
  it("returns false for empty prefix set", () => {
    const s = emptySchema();
    const el = new topLevelElement();
    el.name = "e";
    el.type_ = "ext:Foo";
    s.element = [el];
    expect(isAnyPrefixReferencedInSchema(new Set(), s)).toBe(false);
  });

  it("returns false when no matching prefix exists in schema", () => {
    const s = emptySchema();
    const el = new topLevelElement();
    el.name = "e";
    el.type_ = "ext:Foo";
    s.element = [el];
    expect(isAnyPrefixReferencedInSchema(new Set(["ns1", "ns2"]), s)).toBe(false);
  });

  it("returns true when a single prefix from the set is referenced", () => {
    const s = emptySchema();
    const el = new topLevelElement();
    el.name = "e";
    el.type_ = "ns1:Foo";
    s.element = [el];
    expect(isAnyPrefixReferencedInSchema(new Set(["ns1", "ns2"]), s)).toBe(true);
  });

  it("returns true when a different prefix from the set is referenced", () => {
    const s = emptySchema();
    const el = new topLevelElement();
    el.name = "e";
    el.type_ = "ns2:Foo";
    s.element = [el];
    expect(isAnyPrefixReferencedInSchema(new Set(["ns1", "ns2"]), s)).toBe(true);
  });

  it("returns true for a single-element set when prefix is referenced", () => {
    const s = emptySchema();
    const el = new topLevelElement();
    el.name = "e";
    el.type_ = "ext:Foo";
    s.element = [el];
    expect(isAnyPrefixReferencedInSchema(new Set(["ext"]), s)).toBe(true);
  });

  it("returns true when prefix appears in memberTypes on a simpleType", () => {
    const s = emptySchema();
    const st = new topLevelSimpleType();
    st.name = "T";
    const u = new unionType();
    u.memberTypes = "ns1:A ns2:B";
    st.union = u;
    s.simpleType = [st];
    expect(isAnyPrefixReferencedInSchema(new Set(["ns2", "ns3"]), s)).toBe(true);
    expect(isAnyPrefixReferencedInSchema(new Set(["ns3", "ns4"]), s)).toBe(false);
  });

  it("is consistent with isPrefixReferencedInSchema for a single prefix", () => {
    const s = emptySchema();
    const ct = new topLevelComplexType();
    ct.name = "CT";
    const cc = new complexContentType();
    const ext = new extensionType();
    ext.base = "ext:Base";
    cc.extension = ext;
    ct.complexContent = cc;
    s.complexType = [ct];
    expect(isAnyPrefixReferencedInSchema(new Set(["ext"]), s)).toBe(
      isPrefixReferencedInSchema("ext", s)
    );
    expect(isAnyPrefixReferencedInSchema(new Set(["other"]), s)).toBe(
      isPrefixReferencedInSchema("other", s)
    );
  });
});
