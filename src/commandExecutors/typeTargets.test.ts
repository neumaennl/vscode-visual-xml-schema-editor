/**
 * Unit tests for the helpers that place, remove and locate anonymous and top-level types.
 */

import { locateModifiedType, placeNewType, removeType } from "./typeTargets.js";
import type { schema, topLevelComplexType } from "../../shared/types.js";
import { localComplexType, localSimpleType, topLevelSimpleType } from "../../shared/types.js";
import { schemaWith } from "../../shared/__tests__/schemaTestHelpers.js";

/**
 * Creates a schema with a simpleType `S`, a complexType `T`, an element `named` of type `S`, an element
 * `anonymous` with an anonymous complexType and an attribute `attr` with an anonymous simpleType.
 *
 * @returns The schema
 */
function createSchema(): schema {
  return schemaWith(`<xs:simpleType name="S"><xs:restriction base="xs:string"/></xs:simpleType>
<xs:complexType name="T"/>
<xs:element name="named" type="S"/>
<xs:element name="anonymous"><xs:complexType/></xs:element>
<xs:attribute name="attr"><xs:simpleType><xs:restriction base="xs:string"/></xs:simpleType></xs:attribute>`);
}

describe("placeNewType", () => {
  test("should append a top-level type to the schema", () => {
    const schemaObj = createSchema();
    const type = Object.assign(new topLevelSimpleType(), { name: "U" });
    placeNewType(schemaObj, "/schema", "simpleType", type);
    expect(schemaObj.simpleType?.map((t) => t.name)).toEqual(["S", "U"]);
  });

  test("should replace the named type of an element with an anonymous one", () => {
    const schemaObj = createSchema();
    const type = new localComplexType();
    placeNewType(schemaObj, "/element:named", "complexType", type);
    const element = schemaObj.element?.[0];
    expect(element?.type_).toBeUndefined();
    expect(element?.complexType).toBe(type);
  });

  test("should replace an anonymous type of the other kind", () => {
    const schemaObj = createSchema();
    const type = new localSimpleType();
    placeNewType(schemaObj, "/element:anonymous", "simpleType", type);
    const element = schemaObj.element?.[1];
    expect(element?.complexType).toBeUndefined();
    expect(element?.simpleType).toBe(type);
  });
});

describe("removeType", () => {
  test("should remove an anonymous type from its element or attribute", () => {
    const schemaObj = createSchema();
    removeType(schemaObj, "/attribute:attr/anonymousSimpleType[0]", "simpleType");
    expect(schemaObj.attribute?.[0].simpleType).toBeUndefined();
  });

  test("should remove a top-level type, and the array with the last one", () => {
    const schemaObj = createSchema();
    removeType(schemaObj, "/complexType:T", "complexType");
    expect(schemaObj.complexType).toBeUndefined();
  });

  test.each([
    ["a missing top-level type", "/simpleType:X", "simpleType", "Simple type /simpleType:X not found"],
    [
      "an element without an anonymous type",
      "/element:named/anonymousComplexType[0]",
      "complexType",
      "Complex type /element:named/anonymousComplexType[0] not found",
    ],
  ] as const)("should fail for %s", (_case, typeId, kind, error) => {
    expect(() => { removeType(createSchema(), typeId, kind); }).toThrow(error);
  });
});

describe("locateModifiedType", () => {
  test("should locate an anonymous type", () => {
    const schemaObj = createSchema();
    const result = locateModifiedType<localComplexType>(schemaObj, "/element:anonymous/anonymousComplexType[0]", "complexType", undefined);
    expect(result).toEqual({ type: schemaObj.element?.[1].complexType, topLevel: false });
  });

  test("should locate a top-level type without changing it", () => {
    const schemaObj = createSchema();
    const result = locateModifiedType<topLevelComplexType>(schemaObj, "/complexType:T", "complexType", undefined);
    expect(result.topLevel).toBe(true);
    expect(result.type.name).toBe("T");
  });

  test("should rename a top-level type and the references to it", () => {
    const schemaObj = createSchema();
    const result = locateModifiedType<topLevelSimpleType>(schemaObj, "/simpleType:S", "simpleType", "U");
    expect(result.type.name).toBe("U");
    expect(schemaObj.element?.[0].type_).toBe("U");
  });
});
