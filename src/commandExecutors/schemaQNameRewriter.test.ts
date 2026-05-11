/**
 * Unit tests for rewritePrefixInSchema.
 *
 * These tests call rewritePrefixInSchema directly to verify that each QName-valued
 * field is rewritten in isolation. Integration coverage (rewriting triggered via
 * executeModifyImport) lives in schemaExecutors.test.ts.
 */

import { unmarshal } from "@neumaennl/xmlbind-ts";
import {
  attribute,
  attributeGroupRef,
  complexContentType,
  complexRestrictionType,
  explicitGroup,
  extensionType,
  groupRef,
  keyrefType,
  listType,
  localComplexType,
  localElement,
  localSimpleType,
  namedAttributeGroup,
  namedGroup,
  restrictionType,
  schema,
  simpleContentType,
  simpleExtensionType,
  simpleRestrictionType,
  topLevelAttribute,
  topLevelComplexType,
  topLevelElement,
  topLevelSimpleType,
  unionType,
} from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";
import { rewritePrefixInSchema } from "./schemaQNameRewriter";

function emptySchema(): schema {
  return unmarshal(
    schema,
    `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"></xs:schema>`
  );
}

describe("rewritePrefixInSchema", () => {
  it("does nothing when the old prefix matches the new prefix", () => {
    const schemaObj = emptySchema();
    const element = new localElement();
    element.type_ = "ext:FooType";
    schemaObj.element = [element as never];

    rewritePrefixInSchema("ext", "ext", schemaObj);

    expect(toArray(schemaObj.element)[0].type_).toBe("ext:FooType");
  });

  it("does not throw on an empty schema", () => {
    expect(() => rewritePrefixInSchema("old", "new", emptySchema())).not.toThrow();
  });

  it("rewrites top-level element @type", () => {
    const schemaObj = unmarshal(
      schema,
      `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:ext="http://example.com/ext">
  <xs:element name="foo" type="ext:FooType"/>
</xs:schema>`
    );

    rewritePrefixInSchema("ext", "p", schemaObj);

    expect(toArray(schemaObj.element)[0].type_).toBe("p:FooType");
  });

  it("rewrites top-level element @substitutionGroup", () => {
    const schemaObj = unmarshal(
      schema,
      `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:ext="http://example.com/ext">
  <xs:element name="foo" substitutionGroup="ext:Head"/>
</xs:schema>`
    );

    rewritePrefixInSchema("ext", "p", schemaObj);

    expect(toArray(schemaObj.element)[0].substitutionGroup).toBe("p:Head");
  });

  it("does not rewrite element @type values with a different prefix", () => {
    const schemaObj = unmarshal(
      schema,
      `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:ext="http://example.com/ext">
  <xs:element name="foo" type="ext:FooType"/>
  <xs:element name="bar" type="xs:string"/>
</xs:schema>`
    );

    rewritePrefixInSchema("ext", "p", schemaObj);

    expect(toArray(schemaObj.element)[1].type_).toBe("xs:string");
  });

  it("rewrites top-level attribute @type", () => {
    const schemaObj = emptySchema();
    const topLevelAttr = new topLevelAttribute();
    topLevelAttr.name = "myAttr";
    topLevelAttr.type_ = "ext:AttrType";
    schemaObj.attribute = [topLevelAttr];

    rewritePrefixInSchema("ext", "p", schemaObj);

    expect(toArray(schemaObj.attribute)[0].type_).toBe("p:AttrType");
  });

  it("rewrites simpleType restriction/@base", () => {
    const schemaObj = emptySchema();
    const simpleType = new topLevelSimpleType();
    simpleType.name = "MyST";
    const restriction = new restrictionType();
    restriction.base = "ext:BaseString";
    simpleType.restriction = restriction;
    schemaObj.simpleType = [simpleType];

    rewritePrefixInSchema("ext", "p", schemaObj);

    expect(toArray(schemaObj.simpleType)[0].restriction!.base).toBe("p:BaseString");
  });

  it("rewrites simpleType list/@itemType", () => {
    const schemaObj = emptySchema();
    const simpleType = new topLevelSimpleType();
    simpleType.name = "ListST";
    const list = new listType();
    list.itemType = "ext:ItemType";
    simpleType.list = list;
    schemaObj.simpleType = [simpleType];

    rewritePrefixInSchema("ext", "p", schemaObj);

    expect(toArray(schemaObj.simpleType)[0].list!.itemType).toBe("p:ItemType");
  });

  it("rewrites all matching union/@memberTypes tokens", () => {
    const schemaObj = emptySchema();
    const simpleType = new topLevelSimpleType();
    simpleType.name = "UnionST";
    const union = new unionType();
    union.memberTypes = "ext:TypeA xs:string ext:TypeB";
    simpleType.union = union;
    schemaObj.simpleType = [simpleType];

    rewritePrefixInSchema("ext", "p", schemaObj);

    expect(toArray(schemaObj.simpleType)[0].union!.memberTypes).toBe("p:TypeA xs:string p:TypeB");
  });

  it("rewrites complexContent extension/@base", () => {
    const schemaObj = emptySchema();
    const complexType = new topLevelComplexType();
    complexType.name = "Child";
    const complexContent = new complexContentType();
    const extension = new extensionType();
    extension.base = "ext:Parent";
    complexContent.extension = extension;
    complexType.complexContent = complexContent;
    schemaObj.complexType = [complexType];

    rewritePrefixInSchema("ext", "p", schemaObj);

    expect(toArray(schemaObj.complexType)[0].complexContent!.extension!.base).toBe("p:Parent");
  });

  it("rewrites complexContent restriction/@base", () => {
    const schemaObj = emptySchema();
    const complexType = new topLevelComplexType();
    complexType.name = "Restricted";
    const complexContent = new complexContentType();
    const restriction = new complexRestrictionType();
    restriction.base = "ext:Base";
    complexContent.restriction = restriction;
    complexType.complexContent = complexContent;
    schemaObj.complexType = [complexType];

    rewritePrefixInSchema("ext", "p", schemaObj);

    expect(toArray(schemaObj.complexType)[0].complexContent!.restriction!.base).toBe("p:Base");
  });

  it("rewrites element @type inside a complexContent extension sequence", () => {
    const schemaObj = emptySchema();
    const complexType = new topLevelComplexType();
    complexType.name = "Parent";
    const complexContent = new complexContentType();
    const extension = new extensionType();
    extension.base = "xs:anyType";
    const sequence = new explicitGroup();
    const element = new localElement();
    element.name = "child";
    element.type_ = "ext:ChildType";
    sequence.element = [element];
    extension.sequence = sequence;
    complexContent.extension = extension;
    complexType.complexContent = complexContent;
    schemaObj.complexType = [complexType];

    rewritePrefixInSchema("ext", "p", schemaObj);

    expect(toArray(toArray(schemaObj.complexType)[0].complexContent!.extension!.sequence!.element)[0].type_).toBe(
      "p:ChildType"
    );
  });

  it("rewrites simpleContent extension/@base", () => {
    const schemaObj = emptySchema();
    const complexType = new topLevelComplexType();
    complexType.name = "SCExt";
    const simpleContent = new simpleContentType();
    const extension = new simpleExtensionType();
    extension.base = "ext:SimpleBase";
    simpleContent.extension = extension;
    complexType.simpleContent = simpleContent;
    schemaObj.complexType = [complexType];

    rewritePrefixInSchema("ext", "p", schemaObj);

    expect(toArray(schemaObj.complexType)[0].simpleContent!.extension!.base).toBe("p:SimpleBase");
  });

  it("rewrites attribute @type inside a simpleContent extension", () => {
    const schemaObj = emptySchema();
    const complexType = new topLevelComplexType();
    complexType.name = "SCExt";
    const simpleContent = new simpleContentType();
    const extension = new simpleExtensionType();
    extension.base = "ext:SimpleBase";
    const localAttr = new attribute();
    localAttr.name = "scAttr";
    localAttr.type_ = "ext:AttrType";
    extension.attribute = [localAttr];
    simpleContent.extension = extension;
    complexType.simpleContent = simpleContent;
    schemaObj.complexType = [complexType];

    rewritePrefixInSchema("ext", "p", schemaObj);

    expect(toArray(toArray(schemaObj.complexType)[0].simpleContent!.extension!.attribute)[0].type_).toBe(
      "p:AttrType"
    );
  });

  it("rewrites simpleContent restriction/@base", () => {
    const schemaObj = emptySchema();
    const complexType = new topLevelComplexType();
    complexType.name = "SCRestr";
    const simpleContent = new simpleContentType();
    const restriction = new simpleRestrictionType();
    restriction.base = "ext:SimpleBase";
    simpleContent.restriction = restriction;
    complexType.simpleContent = simpleContent;
    schemaObj.complexType = [complexType];

    rewritePrefixInSchema("ext", "p", schemaObj);

    expect(toArray(schemaObj.complexType)[0].simpleContent!.restriction!.base).toBe("p:SimpleBase");
  });

  it("rewrites top-level complexType group refs", () => {
    const schemaObj = emptySchema();
    const complexType = new topLevelComplexType();
    complexType.name = "WithGroup";
    const ref = new groupRef();
    ref.ref = "ext:MyGroup";
    complexType.group = ref;
    schemaObj.complexType = [complexType];

    rewritePrefixInSchema("ext", "p", schemaObj);

    expect(toArray(schemaObj.complexType)[0].group!.ref).toBe("p:MyGroup");
  });

  it("rewrites top-level complexType attributeGroup refs", () => {
    const schemaObj = emptySchema();
    const complexType = new topLevelComplexType();
    complexType.name = "WithAttrGroup";
    const ref = new attributeGroupRef();
    ref.ref = "ext:MyAttrGroup";
    complexType.attributeGroup = [ref];
    schemaObj.complexType = [complexType];

    rewritePrefixInSchema("ext", "p", schemaObj);

    expect(toArray(toArray(schemaObj.complexType)[0].attributeGroup)[0].ref).toBe("p:MyAttrGroup");
  });

  it("rewrites top-level complexType attribute @type", () => {
    const schemaObj = emptySchema();
    const complexType = new topLevelComplexType();
    complexType.name = "WithAttr";
    const localAttr = new attribute();
    localAttr.name = "localAttr";
    localAttr.type_ = "ext:AttrType";
    complexType.attribute = [localAttr];
    schemaObj.complexType = [complexType];

    rewritePrefixInSchema("ext", "p", schemaObj);

    expect(toArray(toArray(schemaObj.complexType)[0].attribute)[0].type_).toBe("p:AttrType");
  });

  it("rewrites inline simpleType restriction bases on complexType attributes", () => {
    const schemaObj = emptySchema();
    const complexType = new topLevelComplexType();
    complexType.name = "WithInlineType";
    const localAttr = new attribute();
    localAttr.name = "localAttr";
    const simpleType = new localSimpleType();
    const restriction = new restrictionType();
    restriction.base = "ext:BaseType";
    simpleType.restriction = restriction;
    localAttr.simpleType = simpleType;
    complexType.attribute = [localAttr];
    schemaObj.complexType = [complexType];

    rewritePrefixInSchema("ext", "p", schemaObj);

    expect(toArray(toArray(schemaObj.complexType)[0].attribute)[0].simpleType!.restriction!.base).toBe(
      "p:BaseType"
    );
  });

  it("rewrites deeply nested compositor element @type values", () => {
    const schemaObj = emptySchema();
    const complexType = new topLevelComplexType();
    complexType.name = "Nested";
    const choice = new explicitGroup();
    const element = new localElement();
    element.name = "deep";
    element.type_ = "ext:DeepType";
    choice.element = [element];
    const sequence = new explicitGroup();
    sequence.choice = [choice];
    complexType.sequence = sequence;
    schemaObj.complexType = [complexType];

    rewritePrefixInSchema("ext", "p", schemaObj);

    expect(toArray(toArray(toArray(schemaObj.complexType)[0].sequence!.choice)[0].element)[0].type_).toBe(
      "p:DeepType"
    );
  });

  it("rewrites nested group refs inside compositors", () => {
    const schemaObj = emptySchema();
    const complexType = new topLevelComplexType();
    complexType.name = "Nested";
    const sequence = new explicitGroup();
    const ref = new groupRef();
    ref.ref = "ext:SeqGroup";
    sequence.group = [ref];
    complexType.sequence = sequence;
    schemaObj.complexType = [complexType];

    rewritePrefixInSchema("ext", "p", schemaObj);

    expect(toArray(toArray(schemaObj.complexType)[0].sequence!.group)[0].ref).toBe("p:SeqGroup");
  });

  it("rewrites keyref/@refer on top-level elements", () => {
    const schemaObj = emptySchema();
    const root = new topLevelElement();
    root.name = "root";
    const keyref = new keyrefType();
    keyref.name = "ref1";
    keyref.refer = "ext:KeyName";
    root.keyref = [keyref];
    schemaObj.element = [root];

    rewritePrefixInSchema("ext", "p", schemaObj);

    expect(toArray(schemaObj.element)[0].keyref![0].refer).toBe("p:KeyName");
  });

  it("rewrites keyref/@refer on nested elements", () => {
    const schemaObj = emptySchema();
    const complexType = new topLevelComplexType();
    complexType.name = "Nested";
    const element = new localElement();
    element.name = "child";
    const keyref = new keyrefType();
    keyref.name = "ref1";
    keyref.refer = "ext:KeyName";
    element.keyref = [keyref];
    const sequence = new explicitGroup();
    sequence.element = [element];
    complexType.sequence = sequence;
    schemaObj.complexType = [complexType];

    rewritePrefixInSchema("ext", "p", schemaObj);

    expect(toArray(toArray(schemaObj.complexType)[0].sequence!.element)[0].keyref![0].refer).toBe(
      "p:KeyName"
    );
  });

  it("rewrites element @type values inside local complexTypes", () => {
    const schemaObj = emptySchema();
    const wrapper = new topLevelElement();
    wrapper.name = "wrapper";
    const localComplex = new localComplexType();
    const sequence = new explicitGroup();
    const element = new localElement();
    element.name = "inner";
    element.type_ = "ext:InnerType";
    sequence.element = [element];
    localComplex.sequence = sequence;
    wrapper.complexType = localComplex;
    schemaObj.element = [wrapper];

    rewritePrefixInSchema("ext", "p", schemaObj);

    expect(toArray(wrapper.complexType.sequence!.element)[0].type_).toBe("p:InnerType");
  });

  it("rewrites named group sequence element @type values", () => {
    const schemaObj = emptySchema();
    const group = new namedGroup();
    group.name = "MyGroup";
    const sequence = new explicitGroup();
    const element = new localElement();
    element.name = "child";
    element.type_ = "ext:ChildType";
    sequence.element = [element];
    group.sequence = sequence;
    schemaObj.group = [group];

    rewritePrefixInSchema("ext", "p", schemaObj);

    expect(toArray(toArray(schemaObj.group)[0].sequence!.element)[0].type_).toBe("p:ChildType");
  });

  it("rewrites named group choice element @type values", () => {
    const schemaObj = emptySchema();
    const group = new namedGroup();
    group.name = "ChoiceGroup";
    const choice = new explicitGroup();
    const element = new localElement();
    element.name = "opt";
    element.type_ = "ext:OptType";
    choice.element = [element];
    group.choice = choice;
    schemaObj.group = [group];

    rewritePrefixInSchema("ext", "p", schemaObj);

    expect(toArray(toArray(schemaObj.group)[0].choice!.element)[0].type_).toBe("p:OptType");
  });

  it("rewrites named attributeGroup attribute @type values", () => {
    const schemaObj = emptySchema();
    const attributeGroup = new namedAttributeGroup();
    attributeGroup.name = "MyAttrGroup";
    const localAttr = new attribute();
    localAttr.name = "a";
    localAttr.type_ = "ext:AttrType";
    attributeGroup.attribute = [localAttr];
    schemaObj.attributeGroup = [attributeGroup];

    rewritePrefixInSchema("ext", "p", schemaObj);

    expect(toArray(toArray(schemaObj.attributeGroup)[0].attribute)[0].type_).toBe("p:AttrType");
  });

  it("rewrites inline simpleType restriction bases in named attribute groups", () => {
    const schemaObj = emptySchema();
    const attributeGroup = new namedAttributeGroup();
    attributeGroup.name = "MyAttrGroup";
    const localAttr = new attribute();
    localAttr.name = "a";
    const simpleType = new localSimpleType();
    const restriction = new restrictionType();
    restriction.base = "ext:BaseType";
    simpleType.restriction = restriction;
    localAttr.simpleType = simpleType;
    attributeGroup.attribute = [localAttr];
    schemaObj.attributeGroup = [attributeGroup];

    rewritePrefixInSchema("ext", "p", schemaObj);

    expect(toArray(toArray(schemaObj.attributeGroup)[0].attribute)[0].simpleType!.restriction!.base).toBe(
      "p:BaseType"
    );
  });

  it("rewrites nested attributeGroup refs in named attribute groups", () => {
    const schemaObj = emptySchema();
    const attributeGroup = new namedAttributeGroup();
    attributeGroup.name = "MyAttrGroup";
    const ref = new attributeGroupRef();
    ref.ref = "ext:InnerGroup";
    attributeGroup.attributeGroup = [ref];
    schemaObj.attributeGroup = [attributeGroup];

    rewritePrefixInSchema("ext", "p", schemaObj);

    expect(toArray(toArray(schemaObj.attributeGroup)[0].attributeGroup)[0].ref).toBe("p:InnerGroup");
  });
});
