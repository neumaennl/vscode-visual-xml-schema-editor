/**
 * Unit tests for rewritePrefixInSchema.
 *
 * These tests call rewritePrefixInSchema directly to verify that every
 * QName-valued field in the schema tree is rewritten correctly.  Integration
 * coverage (rewriting triggered via executeModifyImport) lives in
 * schemaExecutors.test.ts.
 */

import { unmarshal } from "@neumaennl/xmlbind-ts";
import {
  schema,
  topLevelComplexType,
  localComplexType,
  topLevelSimpleType,
  topLevelAttribute,
  namedGroup,
  namedAttributeGroup,
  localElement,
  explicitGroup,
  simpleExplicitGroup,
  extensionType,
  complexRestrictionType,
  simpleExtensionType,
  simpleRestrictionType,
  complexContentType,
  simpleContentType,
  restrictionType,
  listType,
  unionType,
  groupRef,
  attributeGroupRef,
  attribute,
} from "../../shared/types";
import { rewritePrefixInSchema, isPrefixReferencedInSchema } from "./schemaQNameRewriter";
import { toArray } from "../../shared/schemaUtils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptySchema(): schema {
  return unmarshal(
    schema,
    `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"></xs:schema>`
  );
}

// ---------------------------------------------------------------------------
// No-op cases
// ---------------------------------------------------------------------------

describe("rewritePrefixInSchema — no-op cases", () => {
  it("should do nothing when oldPrefix equals newPrefix", () => {
    const s = emptySchema();
    const el = new localElement();
    el.type_ = "ext:Foo";
    s.element = [el as never];

    rewritePrefixInSchema("ext", "ext", s);

    expect(toArray(s.element)[0].type_).toBe("ext:Foo");
  });

  it("should do nothing when schema has no content", () => {
    const s = emptySchema();
    // Must not throw on an empty schema
    expect(() => rewritePrefixInSchema("old", "new", s)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Top-level elements
// ---------------------------------------------------------------------------

describe("rewritePrefixInSchema — top-level elements", () => {
  it("should rewrite @type on a top-level element", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:ext="http://example.com/ext">
  <xs:element name="foo" type="ext:FooType"/>
</xs:schema>`;
    const s = unmarshal(schema, xml);

    rewritePrefixInSchema("ext", "p", s);

    expect(toArray(s.element)[0].type_).toBe("p:FooType");
  });

  it("should rewrite @substitutionGroup on a top-level element", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:ext="http://example.com/ext">
  <xs:element name="foo" substitutionGroup="ext:Head"/>
</xs:schema>`;
    const s = unmarshal(schema, xml);

    rewritePrefixInSchema("ext", "p", s);

    expect(toArray(s.element)[0].substitutionGroup).toBe("p:Head");
  });

  it("should not rewrite @type with a different prefix", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:ext="http://example.com/ext">
  <xs:element name="foo" type="ext:FooType"/>
  <xs:element name="bar" type="xs:string"/>
</xs:schema>`;
    const s = unmarshal(schema, xml);

    rewritePrefixInSchema("ext", "p", s);

    // "xs:string" must be untouched
    expect(toArray(s.element)[1].type_).toBe("xs:string");
  });
});

// ---------------------------------------------------------------------------
// Top-level attributes
// ---------------------------------------------------------------------------

describe("rewritePrefixInSchema — top-level attributes", () => {
  it("should rewrite @type on a top-level attribute", () => {
    const s = emptySchema();
    const attr = new topLevelAttribute();
    attr.name = "myAttr";
    attr.type_ = "ext:AttrType";
    s.attribute = [attr];

    rewritePrefixInSchema("ext", "p", s);

    expect(s.attribute[0].type_).toBe("p:AttrType");
  });
});

// ---------------------------------------------------------------------------
// Top-level simpleTypes
// ---------------------------------------------------------------------------

describe("rewritePrefixInSchema — simpleType", () => {
  it("should rewrite restriction/@base", () => {
    const s = emptySchema();
    const st = new topLevelSimpleType();
    st.name = "MyST";
    const restr = new restrictionType();
    restr.base = "ext:BaseString";
    st.restriction = restr;
    s.simpleType = [st];

    rewritePrefixInSchema("ext", "p", s);

    expect(s.simpleType[0].restriction!.base).toBe("p:BaseString");
  });

  it("should rewrite list/@itemType", () => {
    const s = emptySchema();
    const st = new topLevelSimpleType();
    st.name = "ListST";
    const list = new listType();
    list.itemType = "ext:ItemType";
    st.list = list;
    s.simpleType = [st];

    rewritePrefixInSchema("ext", "p", s);

    expect(s.simpleType[0].list!.itemType).toBe("p:ItemType");
  });

  it("should rewrite all matching tokens in union/@memberTypes", () => {
    const s = emptySchema();
    const st = new topLevelSimpleType();
    st.name = "UnionST";
    const union = new unionType();
    union.memberTypes = "ext:TypeA xs:string ext:TypeB";
    st.union = union;
    s.simpleType = [st];

    rewritePrefixInSchema("ext", "p", s);

    expect(s.simpleType[0].union!.memberTypes).toBe("p:TypeA xs:string p:TypeB");
  });
});

// ---------------------------------------------------------------------------
// complexType — complexContent
// ---------------------------------------------------------------------------

describe("rewritePrefixInSchema — complexType complexContent", () => {
  it("should rewrite complexContent extension/@base", () => {
    const s = emptySchema();
    const ct = new topLevelComplexType();
    ct.name = "Child";
    const cc = new complexContentType();
    const ext = new extensionType();
    ext.base = "ext:Parent";
    cc.extension = ext;
    ct.complexContent = cc;
    s.complexType = [ct];

    rewritePrefixInSchema("ext", "p", s);

    expect(s.complexType[0].complexContent!.extension!.base).toBe("p:Parent");
  });

  it("should rewrite complexContent restriction/@base", () => {
    const s = emptySchema();
    const ct = new topLevelComplexType();
    ct.name = "Restricted";
    const cc = new complexContentType();
    const restr = new complexRestrictionType();
    restr.base = "ext:Base";
    cc.restriction = restr;
    ct.complexContent = cc;
    s.complexType = [ct];

    rewritePrefixInSchema("ext", "p", s);

    expect(s.complexType[0].complexContent!.restriction!.base).toBe("p:Base");
  });

  it("should rewrite sequence element @type inside complexContent extension", () => {
    const s = emptySchema();
    const ct = new topLevelComplexType();
    ct.name = "Parent";
    const cc = new complexContentType();
    const ext = new extensionType();
    ext.base = "xs:anyType";
    const seq = new explicitGroup();
    const el = new localElement();
    el.name = "child";
    el.type_ = "ext:ChildType";
    seq.element = [el];
    ext.sequence = seq;
    cc.extension = ext;
    ct.complexContent = cc;
    s.complexType = [ct];

    rewritePrefixInSchema("ext", "p", s);

    expect(s.complexType[0].complexContent!.extension!.sequence!.element![0].type_).toBe("p:ChildType");
  });
});

// ---------------------------------------------------------------------------
// complexType — simpleContent
// ---------------------------------------------------------------------------

describe("rewritePrefixInSchema — complexType simpleContent", () => {
  it("should rewrite simpleContent extension/@base", () => {
    const s = emptySchema();
    const ct = new topLevelComplexType();
    ct.name = "SCExt";
    const sc = new simpleContentType();
    const ext = new simpleExtensionType();
    ext.base = "ext:SimpleBase";
    sc.extension = ext;
    ct.simpleContent = sc;
    s.complexType = [ct];

    rewritePrefixInSchema("ext", "p", s);

    expect(s.complexType[0].simpleContent!.extension!.base).toBe("p:SimpleBase");
  });

  it("should rewrite simpleContent restriction/@base", () => {
    const s = emptySchema();
    const ct = new topLevelComplexType();
    ct.name = "SCRestr";
    const sc = new simpleContentType();
    const restr = new simpleRestrictionType();
    restr.base = "ext:SimpleBase";
    sc.restriction = restr;
    ct.simpleContent = sc;
    s.complexType = [ct];

    rewritePrefixInSchema("ext", "p", s);

    expect(s.complexType[0].simpleContent!.restriction!.base).toBe("p:SimpleBase");
  });
});

// ---------------------------------------------------------------------------
// complexType — group and attributeGroup refs
// ---------------------------------------------------------------------------

describe("rewritePrefixInSchema — complexType group/attributeGroup refs", () => {
  it("should rewrite group/@ref in a complexType", () => {
    const s = emptySchema();
    const ct = new topLevelComplexType();
    ct.name = "WithGroup";
    const gr = new groupRef();
    gr.ref = "ext:MyGroup";
    ct.group = gr;
    s.complexType = [ct];

    rewritePrefixInSchema("ext", "p", s);

    expect(s.complexType[0].group!.ref).toBe("p:MyGroup");
  });

  it("should rewrite attributeGroup/@ref in a complexType", () => {
    const s = emptySchema();
    const ct = new topLevelComplexType();
    ct.name = "WithAttrGroup";
    const agr = new attributeGroupRef();
    agr.ref = "ext:MyAttrGroup";
    ct.attributeGroup = [agr];
    s.complexType = [ct];

    rewritePrefixInSchema("ext", "p", s);

    expect(s.complexType[0].attributeGroup![0].ref).toBe("p:MyAttrGroup");
  });

  it("should rewrite attribute/@type inside a complexType", () => {
    const s = emptySchema();
    const ct = new topLevelComplexType();
    ct.name = "WithAttr";
    const attr = new attribute();
    attr.name = "a";
    attr.type_ = "ext:AttrType";
    ct.attribute = [attr];
    s.complexType = [ct];

    rewritePrefixInSchema("ext", "p", s);

    expect(s.complexType[0].attribute![0].type_).toBe("p:AttrType");
  });
});

// ---------------------------------------------------------------------------
// Deeply nested compositor traversal
// ---------------------------------------------------------------------------

describe("rewritePrefixInSchema — nested compositor traversal", () => {
  it("should rewrite element @type nested inside sequence → choice", () => {
    const s = emptySchema();
    const ct = new topLevelComplexType();
    ct.name = "Nested";

    // sequence → choice → element
    const choice = new explicitGroup();
    const nestedEl = new localElement();
    nestedEl.name = "deep";
    nestedEl.type_ = "ext:DeepType";
    choice.element = [nestedEl];

    const seq = new explicitGroup();
    seq.choice = [choice];
    ct.sequence = seq;
    s.complexType = [ct];

    rewritePrefixInSchema("ext", "p", s);

    expect(s.complexType[0].sequence!.choice![0].element![0].type_).toBe("p:DeepType");
  });

  it("should rewrite group/@ref inside a compositor", () => {
    const s = emptySchema();
    const ct = new topLevelComplexType();
    ct.name = "GroupRefInSeq";
    const seq = new explicitGroup();
    const gr = new groupRef();
    gr.ref = "ext:SeqGroup";
    seq.group = [gr];
    ct.sequence = seq;
    s.complexType = [ct];

    rewritePrefixInSchema("ext", "p", s);

    expect(s.complexType[0].sequence!.group![0].ref).toBe("p:SeqGroup");
  });
});

// ---------------------------------------------------------------------------
// Inline complexType on local element
// ---------------------------------------------------------------------------

describe("rewritePrefixInSchema — inline complexType on local element", () => {
  it("should rewrite element @type inside an inline localComplexType", () => {
    const s = emptySchema();
    const topEl = new localElement();
    topEl.name = "wrapper";

    const inlineCt = new localComplexType();
    const seq = new explicitGroup();
    const inner = new localElement();
    inner.name = "inner";
    inner.type_ = "ext:InnerType";
    seq.element = [inner];
    inlineCt.sequence = seq;
    topEl.complexType = inlineCt;

    s.element = [topEl as never];

    rewritePrefixInSchema("ext", "p", s);

    const outerEl = toArray(s.element)[0] as localElement;
    expect(outerEl.complexType!.sequence!.element![0].type_).toBe("p:InnerType");
  });
});

// ---------------------------------------------------------------------------
// Named groups
// ---------------------------------------------------------------------------

describe("rewritePrefixInSchema — named groups", () => {
  it("should rewrite element @type inside a named group sequence", () => {
    const s = emptySchema();
    const grp = new namedGroup();
    grp.name = "MyGroup";
    const seq = new simpleExplicitGroup();
    const el = new localElement();
    el.name = "child";
    el.type_ = "ext:ChildType";
    seq.element = [el];
    grp.sequence = seq;
    s.group = [grp];

    rewritePrefixInSchema("ext", "p", s);

    expect(s.group[0].sequence!.element![0].type_).toBe("p:ChildType");
  });

  it("should rewrite element @type inside a named group choice", () => {
    const s = emptySchema();
    const grp = new namedGroup();
    grp.name = "ChoiceGroup";
    const choice = new simpleExplicitGroup();
    const el = new localElement();
    el.name = "opt";
    el.type_ = "ext:OptType";
    choice.element = [el];
    grp.choice = choice;
    s.group = [grp];

    rewritePrefixInSchema("ext", "p", s);

    expect(s.group[0].choice!.element![0].type_).toBe("p:OptType");
  });
});

// ---------------------------------------------------------------------------
// Named attributeGroups
// ---------------------------------------------------------------------------

describe("rewritePrefixInSchema — named attributeGroups", () => {
  it("should rewrite attribute/@type inside a named attributeGroup", () => {
    const s = emptySchema();
    const ag = new namedAttributeGroup();
    ag.name = "MyAttrGroup";
    const attr = new attribute();
    attr.name = "a";
    attr.type_ = "ext:AttrType";
    ag.attribute = [attr];
    s.attributeGroup = [ag];

    rewritePrefixInSchema("ext", "p", s);

    expect(s.attributeGroup[0].attribute![0].type_).toBe("p:AttrType");
  });

  it("should rewrite attributeGroup/@ref inside a named attributeGroup", () => {
    const s = emptySchema();
    const ag = new namedAttributeGroup();
    ag.name = "Outer";
    const innerRef = new attributeGroupRef();
    innerRef.ref = "ext:InnerGroup";
    ag.attributeGroup = [innerRef];
    s.attributeGroup = [ag];

    rewritePrefixInSchema("ext", "p", s);

    expect(s.attributeGroup[0].attributeGroup![0].ref).toBe("p:InnerGroup");
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
});
