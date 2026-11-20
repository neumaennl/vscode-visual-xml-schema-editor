/**
 * Unit tests of `elementTypes`: the constraint "Element Declarations Consistent" of XML Schema 1.0.
 */

import { findInconsistentElementTypes } from "./elementTypes.js";
import { schemaInTargetNamespace } from "../__tests__/constraintTestHelpers.js";

/**
 * Returns a complex type `T` with a sequence.
 *
 * @param particles - The content of the sequence
 * @returns The complex type
 */
function sequenceOf(particles: string): string {
  return `<xs:complexType name="T"><xs:sequence>${particles}</xs:sequence></xs:complexType>`;
}

/** A local element `a` of type `xs:string`. */
const A_STRING = `<xs:element name="a" type="xs:string"/>`;

/** A local element `a` of type `xs:int`. */
const A_INT = `<xs:element name="a" type="xs:int"/>`;

/** A local element `a` with an anonymous simple type. */
const A_ANONYMOUS = `<xs:element name="a"><xs:simpleType><xs:restriction base="xs:string"/></xs:simpleType></xs:element>`;

describe("findInconsistentElementTypes", () => {
  test.each([
    ["the same name with the same type", sequenceOf(`${A_STRING}<xs:element name="b"/>${A_STRING}`)],
    ["two elements without a type", sequenceOf(`<xs:element name="a"/><xs:element name="a"/>`)],
    ["no type and xs:anyType", sequenceOf(`<xs:element name="a"/><xs:element name="a" type="xs:anyType"/>`)],
    [
      "two references to the same element",
      `<xs:element name="a"><xs:complexType/></xs:element>${sequenceOf(`<xs:element ref="t:a"/><xs:element ref="t:a"/>`)}`,
    ],
    [
      "an unqualified local element and a reference of the same local name",
      `<xs:element name="a" type="xs:int"/>${sequenceOf(`${A_STRING}<xs:element ref="t:a"/>`)}`,
    ],
    [
      "the same name in the anonymous type of a child, which is another content model",
      sequenceOf(
        `${A_STRING}<xs:element name="c"><xs:complexType><xs:sequence>${A_INT}</xs:sequence></xs:complexType></xs:element>`
      ),
    ],
    [
      "a restriction, which does not take the content of its base type",
      `<xs:complexType name="B"><xs:sequence><xs:element name="a" type="xs:anyType" minOccurs="0"/></xs:sequence></xs:complexType>
<xs:complexType name="T"><xs:complexContent><xs:restriction base="t:B"><xs:sequence><xs:element name="a" type="xs:string" minOccurs="0"/></xs:sequence></xs:restriction></xs:complexContent></xs:complexType>`,
    ],
    [
      "a group definition that no complex type uses",
      `<xs:group name="G"><xs:sequence>${A_STRING}${A_INT}</xs:sequence></xs:group>`,
    ],
    [
      "the same named type written with another prefix",
      sequenceOf(`${A_STRING}<xs:element name="a" type="xsd:string"/>`),
    ],
  ])("should accept %s", (_case, body) => {
    const schemaObj = schemaInTargetNamespace(body, `xmlns:xsd="http://www.w3.org/2001/XMLSchema"`);

    expect(findInconsistentElementTypes(schemaObj)).toEqual([]);
  });

  test.each([
    ["two different types", sequenceOf(`${A_STRING}${A_INT}`), "xs:string and xs:int"],
    ["two anonymous types", sequenceOf(`${A_ANONYMOUS}${A_ANONYMOUS}`), "different anonymous types"],
    [
      "a different type in a nested choice",
      sequenceOf(`${A_STRING}<xs:choice>${A_INT}<xs:element name="b"/></xs:choice>`),
      "xs:string and xs:int",
    ],
    [
      "a different type in a referenced group",
      `<xs:group name="G"><xs:sequence>${A_INT}</xs:sequence></xs:group>${sequenceOf(`${A_STRING}<xs:group ref="t:G"/>`)}`,
      "xs:string and xs:int",
    ],
    [
      "a different type in the base type of an extension",
      `<xs:complexType name="B"><xs:sequence>${A_STRING}</xs:sequence></xs:complexType>
<xs:complexType name="T"><xs:complexContent><xs:extension base="t:B"><xs:sequence>${A_INT}</xs:sequence></xs:extension></xs:complexContent></xs:complexType>`,
      "xs:string and xs:int",
    ],
    [
      "a qualified local element and a reference with another type",
      `<xs:element name="a" type="xs:int"/>${sequenceOf(`<xs:element name="a" form="qualified" type="xs:string"/><xs:element ref="t:a"/>`)}`,
      "xs:string and xs:int",
    ],
  ])("should reject %s", (_case, body, types) => {
    const violations = findInconsistentElementTypes(schemaInTargetNamespace(body));

    expect(violations.map((violation) => violation.message)).toEqual([
      `Elements named 'a' in complex type 'T' must have the same type, but have ${types}`,
    ]);
  });

  test("should qualify local elements by the default of the schema", () => {
    const body = `<xs:element name="a" type="xs:int"/>${sequenceOf(`${A_STRING}<xs:element ref="t:a"/>`)}`;

    const violations = findInconsistentElementTypes(schemaInTargetNamespace(body, `elementFormDefault="qualified"`));

    expect(violations.map((violation) => violation.name)).toEqual(["{urn:t}a"]);
  });

  test("should describe an anonymous complex type by its element", () => {
    const body = sequenceOf(
      `<xs:element name="c"><xs:complexType><xs:sequence>${A_STRING}${A_INT}</xs:sequence></xs:complexType></xs:element>`
    );

    const [violation] = findInconsistentElementTypes(schemaInTargetNamespace(body));

    expect(violation?.message).toBe(
      "Elements named 'a' in the complex type of element 'c' must have the same type, but have xs:string and xs:int"
    );
  });
});
