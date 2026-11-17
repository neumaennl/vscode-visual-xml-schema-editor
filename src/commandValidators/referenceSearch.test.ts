/**
 * Unit tests for `isReferencedInContent`.
 */

import type { ReferenceMatcher } from "./referenceSearch.js";
import { isReferencedInContent } from "./referenceSearch.js";
import { schemaWith } from "../../shared/__tests__/schemaTestHelpers.js";
import { schema, topLevelComplexType, explicitGroup } from "../../shared/types.js";

/** Finds references to the group `G`, in a complexType or its content and in compositors. */
const GROUP_G: ReferenceMatcher = {
  inContent: (content) => content.group?.ref === "G",
  inCompositor: (compositor) => (compositor.group ?? []).some((ref) => ref.ref === "G"),
};

/** Finds references to the attribute group `A`, which only the content of a complexType holds. */
const ATTRIBUTE_GROUP_A: ReferenceMatcher = {
  inContent: (content) => (content.attributeGroup ?? []).some((ref) => ref.ref === "A"),
  inCompositor: () => false,
};

/** A local element whose inline complexType references the group `G`. */
const LOCAL_ELEMENT_REFERENCING_G = `<xs:element name="inner"><xs:complexType><xs:group ref="G"/></xs:complexType></xs:element>`;

describe("isReferencedInContent", () => {
  test.each([
    ["the particle of a top-level complexType", `<xs:complexType name="T"><xs:group ref="G"/></xs:complexType>`],
    [
      "a sequence of a top-level complexType",
      `<xs:complexType name="T"><xs:sequence><xs:group ref="G"/></xs:sequence></xs:complexType>`,
    ],
    [
      "a choice nested in a sequence",
      `<xs:complexType name="T"><xs:sequence><xs:choice><xs:group ref="G"/></xs:choice></xs:sequence></xs:complexType>`,
    ],
    [
      "a sequence nested in a choice",
      `<xs:complexType name="T"><xs:choice><xs:sequence><xs:group ref="G"/></xs:sequence></xs:choice></xs:complexType>`,
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
      "the inline complexType of a local element in a complexType",
      `<xs:complexType name="T"><xs:sequence>${LOCAL_ELEMENT_REFERENCING_G}</xs:sequence></xs:complexType>`,
    ],
    [
      "the inline complexType of a local element in a named group",
      `<xs:group name="H"><xs:sequence>${LOCAL_ELEMENT_REFERENCING_G}</xs:sequence></xs:group>`,
    ],
    ["a named group", `<xs:group name="H"><xs:choice><xs:group ref="G"/></xs:choice></xs:group>`],
  ])("should find a group reference in %s", (_place, body) => {
    expect(isReferencedInContent(schemaWith(body), GROUP_G)).toBe(true);
  });

  test.each([
    ["a schema without content", ``],
    [
      "a reference to another group",
      `<xs:complexType name="T"><xs:sequence><xs:group ref="H"/></xs:sequence></xs:complexType>`,
    ],
    ["a top-level element without inline complexType", `<xs:element name="e" type="xs:string"/>`],
    [
      "a local element without inline complexType",
      `<xs:group name="H"><xs:all><xs:element name="a" type="xs:string"/></xs:all></xs:group>`,
    ],
  ])("should find no group reference in %s", (_case, body) => {
    expect(isReferencedInContent(schemaWith(body), GROUP_G)).toBe(false);
  });

  test("should search objects created by commands, which lack the arrays that unmarshalling creates", () => {
    const created = new schema();
    expect(isReferencedInContent(created, GROUP_G)).toBe(false);

    const withCompositor = new schema();
    withCompositor.complexType = [
      Object.assign(new topLevelComplexType(), { name: "T", sequence: new explicitGroup() }),
    ];
    expect(isReferencedInContent(withCompositor, GROUP_G)).toBe(false);
  });

  test.each([
    ["a top-level complexType", `<xs:complexType name="T"><xs:attributeGroup ref="A"/></xs:complexType>`],
    [
      "the extension of simple content",
      `<xs:complexType name="T"><xs:simpleContent><xs:extension base="xs:string"><xs:attributeGroup ref="A"/></xs:extension></xs:simpleContent></xs:complexType>`,
    ],
    [
      "the inline complexType of a local element in an all",
      `<xs:complexType name="T"><xs:all><xs:element name="a"><xs:complexType><xs:attributeGroup ref="A"/></xs:complexType></xs:element></xs:all></xs:complexType>`,
    ],
  ])("should find an attribute group reference in %s", (_place, body) => {
    expect(isReferencedInContent(schemaWith(body), ATTRIBUTE_GROUP_A)).toBe(true);
  });
});
