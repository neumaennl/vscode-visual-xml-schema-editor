/**
 * Unit tests of `schemaConstraints`.
 */

import { findConstraintViolations } from "./schemaConstraints.js";
import { schemaInTargetNamespace } from "../__tests__/constraintTestHelpers.js";

describe("findConstraintViolations", () => {
  test("should find the violations of both constraints", () => {
    const schemaObj = schemaInTargetNamespace(`<xs:complexType name="T">
  <xs:sequence><xs:element name="a" type="xs:string"/><xs:element name="a" type="xs:int"/></xs:sequence>
  <xs:attribute name="x"/><xs:attribute name="x"/>
</xs:complexType>`);

    expect(findConstraintViolations(schemaObj).map((violation) => violation.rule)).toEqual([
      "elementTypes",
      "attributeUses",
    ]);
  });

  test("should find nothing in a schema without violations", () => {
    expect(findConstraintViolations(schemaInTargetNamespace(`<xs:complexType name="T"/>`))).toEqual([]);
  });
});
