/**
 * Unit tests of `typeAccessors`.
 */

import type { DiagramItem } from "./DiagramItem";
import {
  getAttributes,
  getBaseType,
  getComplexDerivation,
  getFacets,
  getSimpleDerivation,
  getTypeName,
  getTypeText,
  hasInlineComplexType,
  hasInlineSimpleType,
  hasSimpleContent,
  isNamedComplexType,
  isNamedSimpleType,
} from "./typeAccessors";
import { diagramItem, muteDiagramBuilderLog } from "../__tests__/diagramTestHelpers";
import { DERIVATIONS, derivedComplexTypeT, webviewSchemaWith } from "../../shared/__tests__/schemaTestHelpers";

/** Named and inline types with each kind of derivation, and elements with a named type and without type. */
const TYPES = `<xs:simpleType name="Code"><xs:restriction base="xs:string"/></xs:simpleType>
<xs:simpleType name="Codes"><xs:list itemType="xs:token"/></xs:simpleType>
<xs:simpleType name="Numbers"><xs:list><xs:simpleType><xs:restriction base="xs:int"/></xs:simpleType></xs:list></xs:simpleType>
<xs:simpleType name="Mixed"><xs:union memberTypes="xs:int  xs:token"/></xs:simpleType>
<xs:simpleType name="Inline"><xs:union><xs:simpleType><xs:restriction base="xs:int"/></xs:simpleType></xs:union></xs:simpleType>
<xs:complexType name="Plain"><xs:sequence/></xs:complexType>
<xs:complexType name="Extended"><xs:complexContent><xs:extension base="Plain"/></xs:complexContent></xs:complexType>
<xs:complexType name="Restricted"><xs:complexContent><xs:restriction base="Plain"/></xs:complexContent></xs:complexType>
<xs:complexType name="Price"><xs:simpleContent><xs:extension base="xs:decimal"/></xs:simpleContent></xs:complexType>
<xs:element name="code" type="xs:string"/>
<xs:element name="size"><xs:simpleType><xs:restriction base="xs:int"/></xs:simpleType></xs:element>
<xs:element name="note"><xs:complexType><xs:sequence/></xs:complexType></xs:element>
<xs:element name="amount"><xs:complexType><xs:simpleContent><xs:restriction base="Price"/></xs:simpleContent></xs:complexType></xs:element>
<xs:group name="G"><xs:sequence/></xs:group>`;

/**
 * Returns the item with the given ID in the diagram of {@link TYPES}.
 *
 * @param id - The ID of the item
 * @returns The item
 */
function item(id: string): DiagramItem {
  return diagramItem(webviewSchemaWith(TYPES), id);
}

/** Restrictions with each kind of facet, an invalid `whiteSpace` value, and types whose facets are not read. */
const FACETS = `<xs:simpleType name="Levels"><xs:restriction base="xs:string">
  <xs:enumeration value="error"/><xs:enumeration value="warning"/><xs:enumeration value="info"/>
</xs:restriction></xs:simpleType>
<xs:simpleType name="Patterns"><xs:restriction base="xs:string">
  <xs:pattern value="[A-Z]{3}"/><xs:pattern value="[0-9]+"/>
</xs:restriction></xs:simpleType>
<xs:simpleType name="Lengths"><xs:restriction base="xs:string">
  <xs:length value="10"/><xs:minLength value="5"/><xs:maxLength value="255"/><xs:whiteSpace value="collapse"/>
</xs:restriction></xs:simpleType>
<xs:simpleType name="Bounds"><xs:restriction base="xs:decimal">
  <xs:minInclusive value="0"/><xs:maxInclusive value="100"/><xs:minExclusive value="-10"/><xs:maxExclusive value="10"/>
  <xs:totalDigits value="10"/><xs:fractionDigits value="2"/>
</xs:restriction></xs:simpleType>
<xs:simpleType name="Trimmed"><xs:restriction base="xs:string"><xs:length value="3"/><xs:whiteSpace value="trim"/></xs:restriction></xs:simpleType>
<xs:simpleType name="Plain"><xs:restriction base="xs:string"/></xs:simpleType>
<xs:simpleType name="Codes"><xs:list itemType="xs:token"/></xs:simpleType>
<xs:element name="size"><xs:simpleType><xs:restriction base="xs:int"><xs:maxInclusive value="9"/></xs:restriction></xs:simpleType></xs:element>
<xs:element name="amount"><xs:complexType><xs:simpleContent><xs:restriction base="Price">
  <xs:maxInclusive value="9"/>
</xs:restriction></xs:simpleContent></xs:complexType></xs:element>`;

describe("getFacets", () => {
  muteDiagramBuilderLog();

  test.each([
    ["/simpleType:Levels", { enumeration: ["error", "warning", "info"] }],
    ["/simpleType:Patterns", { pattern: ["[A-Z]{3}", "[0-9]+"] }],
    ["/simpleType:Lengths", { length: 10, minLength: 5, maxLength: 255, whiteSpace: "collapse" }],
    [
      "/simpleType:Bounds",
      {
        minInclusive: "0",
        maxInclusive: "100",
        minExclusive: "-10",
        maxExclusive: "10",
        totalDigits: 10,
        fractionDigits: 2,
      },
    ],
    // XML Schema does not allow the whiteSpace value trim
    ["/simpleType:Trimmed", { length: 3 }],
    ["/element:size", { maxInclusive: "9" }],
    ["/simpleType:Plain", undefined],
    ["/simpleType:Codes", undefined],
    // Its restriction belongs to the simple content of a complex type, not to a simple type
    ["/element:amount", undefined],
  ])("should read the facets of %s", (id, expected) => {
    expect(getFacets(diagramItem(webviewSchemaWith(FACETS), id))).toEqual(expected);
  });
});

/** The schema, a complex type and an element with an inline complex type, each with attributes. */
const ATTRIBUTES = `<xs:attribute name="lang" type="xs:language"/>
<xs:attribute name="version" type="xs:string" fixed="1"/>
<xs:complexType name="T">
  <xs:attribute name="id" type="xs:ID" use="required"/>
  <xs:attribute name="kind" default="plain"><xs:simpleType><xs:restriction base="xs:string"/></xs:simpleType></xs:attribute>
  <xs:attribute ref="lang"/>
</xs:complexType>
<xs:element name="person"><xs:complexType><xs:attribute name="age" type="xs:int"/></xs:complexType></xs:element>
<xs:element name="plain" type="xs:string"/>`;

describe("getAttributes", () => {
  muteDiagramBuilderLog();

  test.each([
    [
      "the schema",
      "/schema",
      [
        { name: "lang", type: "xs:language", use: undefined, defaultValue: undefined, fixedValue: undefined },
        { name: "version", type: "xs:string", use: undefined, defaultValue: undefined, fixedValue: "1" },
      ],
    ],
    // An attribute without a type has an inline simple type; a reference has no name and is left out
    [
      "a complex type",
      "/complexType:T",
      [
        { name: "id", type: "xs:ID", use: "required", defaultValue: undefined, fixedValue: undefined },
        { name: "kind", type: undefined, use: undefined, defaultValue: "plain", fixedValue: undefined },
      ],
    ],
    [
      "an element with an inline complex type",
      "/element:person",
      [{ name: "age", type: "xs:int", use: undefined, defaultValue: undefined, fixedValue: undefined }],
    ],
    ["an element with a named type", "/element:plain", []],
  ])("should read the attributes of %s", (_case, id, expected) => {
    expect(getAttributes(diagramItem(webviewSchemaWith(ATTRIBUTES), id))).toEqual(expected);
  });

  test.each(DERIVATIONS)("should read the attributes of the %s %s", (content, derivation) => {
    const schemaObj = webviewSchemaWith(
      derivedComplexTypeT(content, derivation, `<xs:attribute name="id" type="xs:integer"/>`)
    );

    expect(getAttributes(diagramItem(schemaObj, "/complexType:T")).map((attribute) => attribute.name)).toEqual(["id"]);
  });
});

describe("typeAccessors", () => {
  muteDiagramBuilderLog();

  test.each([
    ["/simpleType:Code", [true, false, undefined, false, false, false]],
    ["/complexType:Plain", [false, true, undefined, false, false, false]],
    ["/complexType:Price", [false, true, undefined, false, false, true]],
    ["/element:code", [false, false, "xs:string", false, false, false]],
    ["/element:size", [false, false, undefined, false, true, false]],
    ["/element:note", [false, false, undefined, true, false, false]],
    ["/element:amount", [false, false, undefined, true, false, true]],
    ["/schema", [false, false, undefined, false, false, false]],
  ])("should tell what kind of type %s is or has", (id, expected) => {
    const node = item(id);

    expect([
      isNamedSimpleType(node),
      isNamedComplexType(node),
      getTypeName(node),
      hasInlineComplexType(node),
      hasInlineSimpleType(node),
      hasSimpleContent(node),
    ]).toEqual(expected);
  });

  test.each([
    ["/complexType:Extended", { kind: "extension", base: "Plain", content: "complex" }],
    ["/complexType:Restricted", { kind: "restriction", base: "Plain", content: "complex" }],
    ["/complexType:Price", { kind: "extension", base: "xs:decimal", content: "simple" }],
    ["/element:amount", { kind: "restriction", base: "Price", content: "simple" }],
    ["/complexType:Plain", undefined],
    ["/simpleType:Code", undefined],
  ])("should read the complex derivation of %s", (id, expected) => {
    expect(getComplexDerivation(item(id))).toEqual(expected);
  });

  test.each([
    ["/simpleType:Code", { kind: "restriction", base: "xs:string" }],
    ["/simpleType:Codes", { kind: "list", itemType: "xs:token" }],
    // The item type of a list of an inline type is the base type of that type
    ["/simpleType:Numbers", { kind: "list", itemType: "xs:int" }],
    ["/simpleType:Mixed", { kind: "union", memberTypes: ["xs:int", "xs:token"] }],
    ["/simpleType:Inline", { kind: "union", memberTypes: [] }],
    ["/element:size", { kind: "restriction", base: "xs:int" }],
    // Its restriction belongs to the simple content of a complex type
    ["/element:amount", undefined],
    ["/complexType:Plain", undefined],
  ])("should read the simple derivation of %s", (id, expected) => {
    expect(getSimpleDerivation(item(id))).toEqual(expected);
  });

  test.each([
    ["/simpleType:Code", "xs:string"],
    ["/element:size", "xs:int"],
    ["/complexType:Extended", "Plain"],
    ["/element:amount", "Price"],
    ["/simpleType:Codes", undefined],
    ["/element:code", undefined],
  ])("should read the base type of %s", (id, expected) => {
    expect(getBaseType(item(id))).toBe(expected);
  });

  test.each([
    ["/simpleType:Code", "simpleType (restricts xs:string)"],
    ["/simpleType:Codes", "simpleType (list of xs:token)"],
    ["/simpleType:Mixed", "simpleType (union of xs:int, xs:token)"],
    ["/simpleType:Inline", "simpleType (union)"],
    ["/complexType:Plain", "complexType"],
    ["/complexType:Extended", "complexType with complexContent (extends Plain)"],
    ["/complexType:Restricted", "complexType with complexContent (restricts Plain)"],
    ["/complexType:Price", "complexType with simpleContent (extends xs:decimal)"],
    ["/element:code", "xs:string"],
    ["/element:size", "<anonymous simpleType> (restricts xs:int)"],
    ["/element:note", "<anonymous complexType>"],
    ["/element:amount", "<anonymous complexType> with simpleContent (restricts Price)"],
    ["/group:G", ""],
    ["/schema", ""],
  ])("should describe the type of %s", (id, expected) => {
    expect(getTypeText(item(id))).toBe(expected);
  });
});
