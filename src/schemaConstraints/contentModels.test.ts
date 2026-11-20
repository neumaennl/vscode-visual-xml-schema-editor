/**
 * Unit tests of `contentModels`.
 */

import { forEachComplexType, forEachElementOfComplexType } from "./contentModels.js";
import { schemaNamesOf } from "./schemaNames.js";
import { schemaInTargetNamespace } from "../__tests__/constraintTestHelpers.js";

describe("forEachComplexType", () => {
  test("should visit the named and the anonymous complex types anywhere in the schema", () => {
    const schemaObj = schemaInTargetNamespace(`<xs:complexType name="T"><xs:sequence>
  <xs:element name="c"><xs:complexType><xs:choice><xs:element name="d"><xs:complexType/></xs:element></xs:choice></xs:complexType></xs:element>
</xs:sequence></xs:complexType>
<xs:element name="e"><xs:complexType/></xs:element>
<xs:group name="G"><xs:sequence><xs:element name="g"><xs:complexType/></xs:element></xs:sequence></xs:group>`);
    const descriptions: string[] = [];

    forEachComplexType(schemaObj, (_complexType, description) => descriptions.push(description));

    expect(descriptions).toEqual([
      "complex type 'T'",
      "the complex type of element 'c'",
      "the complex type of element 'd'",
      "the complex type of element 'e'",
      "the complex type of element 'g'",
    ]);
  });
});

describe("forEachElementOfComplexType", () => {
  test("should visit the base type first, then the own particles and those of referenced groups once", () => {
    const schemaObj =
      schemaInTargetNamespace(`<xs:group name="G"><xs:sequence><xs:element name="g"/></xs:sequence></xs:group>
<xs:complexType name="B"><xs:sequence><xs:element name="b"/></xs:sequence></xs:complexType>
<xs:complexType name="T"><xs:complexContent><xs:extension base="t:B"><xs:sequence>
  <xs:element name="own"/><xs:group ref="t:G"/><xs:choice><xs:element name="nested"/></xs:choice><xs:group ref="t:G"/>
</xs:sequence></xs:extension></xs:complexContent></xs:complexType>`);
    const visited: string[] = [];

    forEachElementOfComplexType(schemaObj.complexType![1]!, schemaNamesOf(schemaObj), (element) =>
      visited.push(element.name ?? "")
    );

    expect(visited).toEqual(["b", "own", "g", "nested"]);
  });

  test("should stop at a base type that extends itself", () => {
    const schemaObj =
      schemaInTargetNamespace(`<xs:complexType name="T"><xs:complexContent><xs:extension base="t:T"><xs:sequence>
  <xs:element name="a"/>
</xs:sequence></xs:extension></xs:complexContent></xs:complexType>`);
    const visited: string[] = [];

    forEachElementOfComplexType(schemaObj.complexType![0]!, schemaNamesOf(schemaObj), (element) =>
      visited.push(element.name ?? "")
    );

    expect(visited).toEqual(["a"]);
  });
});
