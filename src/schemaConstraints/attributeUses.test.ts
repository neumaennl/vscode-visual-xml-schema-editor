/**
 * Unit tests of `attributeUses`: the constraints "Complex Type Definition Properties Correct" (no two
 * attribute uses with the same name) and "Attribute Group Definition Properties Correct" of XML Schema 1.0.
 */

import { findDuplicateAttributeUses } from "./attributeUses.js";
import { schemaInTargetNamespace } from "../__tests__/constraintTestHelpers.js";

/** An attribute group `AG` that declares the attribute `x`. */
const AG_WITH_X = `<xs:attributeGroup name="AG"><xs:attribute name="x"/></xs:attributeGroup>`;

/** A complex type `B` with the attribute `x`. */
const B_WITH_X = `<xs:complexType name="B"><xs:attribute name="x"/></xs:complexType>`;

/**
 * Returns a complex type `T` with attributes.
 *
 * @param attributes - The attributes and attribute group references
 * @returns The complex type
 */
function typeWith(attributes: string): string {
  return `<xs:complexType name="T">${attributes}</xs:complexType>`;
}

describe("findDuplicateAttributeUses", () => {
  test.each([
    [
      "the same attribute group twice",
      `${AG_WITH_X}${typeWith(`<xs:attributeGroup ref="t:AG"/><xs:attributeGroup ref="t:AG"/>`)}`,
    ],
    [
      "an attribute group referenced directly and through another one",
      `${AG_WITH_X}<xs:attributeGroup name="A1"><xs:attributeGroup ref="t:AG"/></xs:attributeGroup>
${typeWith(`<xs:attributeGroup ref="t:A1"/><xs:attributeGroup ref="t:AG"/>`)}`,
    ],
    [
      "an unqualified local attribute and a reference of the same local name",
      `<xs:attribute name="x"/>${typeWith(`<xs:attribute name="x"/><xs:attribute ref="t:x"/>`)}`,
    ],
    [
      "a restriction that declares an attribute of its base type again",
      `${B_WITH_X}<xs:complexType name="T"><xs:complexContent><xs:restriction base="t:B"><xs:attribute name="x" type="xs:string"/></xs:restriction></xs:complexContent></xs:complexType>`,
    ],
    [
      "a prohibited attribute next to one of the same name",
      `${B_WITH_X}<xs:complexType name="T"><xs:complexContent><xs:restriction base="t:B"><xs:attribute name="x" use="prohibited"/><xs:attribute name="x"/></xs:restriction></xs:complexContent></xs:complexType>`,
    ],
  ])("should accept %s", (_case, body) => {
    expect(findDuplicateAttributeUses(schemaInTargetNamespace(body))).toEqual([]);
  });

  test.each([
    ["two local attributes with the same name", typeWith(`<xs:attribute name="x"/><xs:attribute name="x"/>`)],
    [
      "two references to the same attribute",
      `<xs:attribute name="x"/>${typeWith(`<xs:attribute ref="t:x"/><xs:attribute ref="t:x"/>`)}`,
    ],
    [
      "an attribute and an attribute group that declares it",
      `${AG_WITH_X}${typeWith(`<xs:attribute name="x"/><xs:attributeGroup ref="t:AG"/>`)}`,
    ],
    [
      "two attribute groups that declare it",
      `${AG_WITH_X}<xs:attributeGroup name="A2"><xs:attribute name="x"/></xs:attributeGroup>
${typeWith(`<xs:attributeGroup ref="t:AG"/><xs:attributeGroup ref="t:A2"/>`)}`,
    ],
    [
      "an extension that declares an attribute of its base type again",
      `${B_WITH_X}<xs:complexType name="T"><xs:complexContent><xs:extension base="t:B"><xs:attribute name="x"/></xs:extension></xs:complexContent></xs:complexType>`,
    ],
    [
      "a simple content extension that declares an attribute of its base type again",
      `<xs:complexType name="B"><xs:simpleContent><xs:extension base="xs:string"><xs:attribute name="x"/></xs:extension></xs:simpleContent></xs:complexType>
<xs:complexType name="T"><xs:simpleContent><xs:extension base="t:B"><xs:attribute name="x"/></xs:extension></xs:simpleContent></xs:complexType>`,
    ],
    [
      "a qualified local attribute and a reference to an attribute with the same name",
      `<xs:attribute name="x"/>${typeWith(`<xs:attribute name="x" form="qualified"/><xs:attribute ref="t:x"/>`)}`,
    ],
  ])("should reject %s in a complex type", (_case, body) => {
    const violations = findDuplicateAttributeUses(schemaInTargetNamespace(body));

    expect(violations.map((violation) => violation.message)).toEqual([
      "Complex type 'T' has more than one attribute named 'x'",
    ]);
  });

  test.each([
    [
      "two attributes with the same name",
      `<xs:attributeGroup name="A1"><xs:attribute name="x"/><xs:attribute name="x"/></xs:attributeGroup>`,
    ],
    [
      "an attribute and a nested group that declares it",
      `${AG_WITH_X}<xs:attributeGroup name="A1"><xs:attribute name="x"/><xs:attributeGroup ref="t:AG"/></xs:attributeGroup>`,
    ],
  ])("should reject %s in an attribute group", (_case, body) => {
    const violations = findDuplicateAttributeUses(schemaInTargetNamespace(body));

    expect(violations.map((violation) => violation.message)).toEqual([
      "Attribute group 'A1' has more than one attribute named 'x'",
    ]);
  });

  test("should describe an anonymous complex type by its element", () => {
    const body = `<xs:element name="c"><xs:complexType><xs:attribute name="x"/><xs:attribute name="x"/></xs:complexType></xs:element>`;

    const [violation] = findDuplicateAttributeUses(schemaInTargetNamespace(body));

    expect(violation?.message).toBe("The complex type of element 'c' has more than one attribute named 'x'");
  });
});
