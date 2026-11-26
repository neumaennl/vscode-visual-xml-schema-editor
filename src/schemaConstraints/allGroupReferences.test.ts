/**
 * Unit tests of `allGroupReferences`: references to a group definition with an `all` are only allowed as the
 * whole content of a complex type, at most once (XML Schema 1.0, "Particle Correct" and "All Group Limited").
 */

import { findInvalidAllGroupReferences } from "./allGroupReferences.js";
import { schemaInTargetNamespace } from "../__tests__/constraintTestHelpers.js";

/** A group definition `A` with an all and a group definition `S` with a sequence. */
const GROUPS = `<xs:group name="A"><xs:all><xs:element name="a"/></xs:all></xs:group>
<xs:group name="S"><xs:sequence><xs:element name="s"/></xs:sequence></xs:group>`;

describe("findInvalidAllGroupReferences", () => {
  test.each([
    ["the whole content of a complex type", `<xs:complexType name="T"><xs:group ref="t:A"/></xs:complexType>`],
    ["the whole content, optional", `<xs:complexType name="T"><xs:group ref="t:A" minOccurs="0"/></xs:complexType>`],
    [
      "the whole content of an extension",
      `<xs:complexType name="B"/><xs:complexType name="T"><xs:complexContent><xs:extension base="t:B"><xs:group ref="t:A"/></xs:extension></xs:complexContent></xs:complexType>`,
    ],
    [
      "a group with a sequence in a sequence",
      `<xs:complexType name="T"><xs:sequence><xs:group ref="t:S"/></xs:sequence></xs:complexType>`,
    ],
    [
      "a group of another schema in a sequence",
      `<xs:complexType name="T"><xs:sequence><xs:group ref="other:A" xmlns:other="urn:other"/></xs:sequence></xs:complexType>`,
    ],
  ])("should accept a reference as %s", (_case, body) => {
    expect(findInvalidAllGroupReferences(schemaInTargetNamespace(`${GROUPS}${body}`))).toEqual([]);
  });

  test.each([
    [
      "a sequence of a complex type",
      `<xs:complexType name="T"><xs:sequence><xs:group ref="t:A"/></xs:sequence></xs:complexType>`,
    ],
    [
      "a nested choice of an anonymous complex type",
      `<xs:element name="e"><xs:complexType><xs:sequence><xs:choice><xs:group ref="t:A"/></xs:choice></xs:sequence></xs:complexType></xs:element>`,
    ],
    [
      "the sequence of a group definition",
      `<xs:group name="G"><xs:sequence><xs:group ref="t:A"/></xs:sequence></xs:group>`,
    ],
  ])("should reject a reference in %s", (_case, body) => {
    const violations = findInvalidAllGroupReferences(schemaInTargetNamespace(`${GROUPS}${body}`));

    expect(violations.map((violation) => violation.message)).toEqual([
      "Group 't:A' has an all, so it can only be referenced as the whole content of a complex type, not in a sequence or a choice",
    ]);
  });

  test.each([
    ['maxOccurs="2"', "2"],
    ['maxOccurs="unbounded"', "unbounded"],
    ['minOccurs="2" maxOccurs="2"', "2"],
  ])("should reject the whole content with %s", (occurrences) => {
    const body = `<xs:complexType name="T"><xs:group ref="t:A" ${occurrences}/></xs:complexType>`;

    const violations = findInvalidAllGroupReferences(schemaInTargetNamespace(`${GROUPS}${body}`));

    expect(violations.map((violation) => violation.message)).toEqual([
      "Group 't:A' has an all, so its reference in complex type 'T' must have minOccurs 0 or 1 and maxOccurs 1",
    ]);
  });
});
