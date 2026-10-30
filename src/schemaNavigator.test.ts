/**
 * Unit tests for SchemaNavigator module.
 * Tests the node location and navigation logic.
 */

import { locateNodeById } from "./schemaNavigator.js";
import { emptySchema, readTestSchema, schemaWith } from "./__tests__/schemaTestHelpers.js";

/** The file with an element `person` with the local elements `name` and `age`. */
const PERSON_NAME_AND_AGE_XSD = "person-element-with-name-and-age.xsd";

/** The file with an element `person` with the local element `name`. */
const PERSON_WITH_NAME_XSD = "person-element-with-name.xsd";

/** The file with a complexType `PersonType` with the local element `name`. */
const PERSON_TYPE_WITH_NAME_XSD = "person-type-with-name-element.xsd";

/** A group `PersonGroup` with the element `name` in its sequence. */
const PERSON_GROUP_WITH_NAME_ELEMENT = `<xs:group name="PersonGroup">
  <xs:sequence>
    <xs:element name="name" type="xs:string"/>
  </xs:sequence>
</xs:group>`;

describe("SchemaNavigator", () => {
  describe("locateNodeById", () => {
    describe("Schema root navigation", () => {
      test("should locate schema root with the canonical '/schema' id", () => {
        const schemaObj = emptySchema();

        const result = locateNodeById(schemaObj, "/schema");

        expect(result.found).toBe(true);
        expect(result.parent).toBe(schemaObj);
        expect(result.parentType).toBe("schema");
      });

      test("should locate schema root with '/schema' id", () => {
        const schemaObj = emptySchema();

        const result = locateNodeById(schemaObj, "/schema");

        expect(result.found).toBe(true);
        expect(result.parent).toBe(schemaObj);
        expect(result.parentType).toBe("schema");
      });
    });

    describe("Top-level element navigation", () => {
      test("should locate top-level element by name", () => {
        const schemaObj = schemaWith(`<xs:element name="person" type="xs:string"/>`);

        const result = locateNodeById(schemaObj, "/element:person");

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("topLevelElement");
        const parentElement = result.parent as { name: string } | undefined;
        expect(parentElement?.name).toBe("person");
      });

      test("should return not found for non-existent element", () => {
        const schemaObj = emptySchema();

        const result = locateNodeById(schemaObj, "/element:nonexistent");

        expect(result.found).toBe(false);
        expect(result.error).toContain("not found");
      });
    });

    describe("Complex type navigation", () => {
      test("should locate top-level complex type by name", () => {
        const schemaObj = schemaWith(`<xs:complexType name="PersonType">
  <xs:sequence/>
</xs:complexType>`);

        const result = locateNodeById(schemaObj, "/complexType:PersonType");

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("topLevelComplexType");
        const parentType = result.parent as { name: string } | undefined;
        expect(parentType?.name).toBe("PersonType");
      });

      test("should locate sequence within complex type", () => {
        const schemaObj = readTestSchema(PERSON_TYPE_WITH_NAME_XSD);

        const result = locateNodeById(schemaObj, "/complexType:PersonType/sequence");

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("sequence");
      });

      test("should locate choice within complex type", () => {
        const schemaObj = schemaWith(`<xs:complexType name="ChoiceType">
  <xs:choice>
    <xs:element name="option1" type="xs:string"/>
  </xs:choice>
</xs:complexType>`);

        const result = locateNodeById(schemaObj, "/complexType:ChoiceType/choice");

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("choice");
      });

      test("should locate all group within complex type", () => {
        const schemaObj = schemaWith(`<xs:complexType name="AllType">
  <xs:all>
    <xs:element name="field1" type="xs:string"/>
  </xs:all>
</xs:complexType>`);

        const result = locateNodeById(schemaObj, "/complexType:AllType/all");

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("all");
      });

      test("should locate sequence within complexContent extension via group path", () => {
        const schemaObj = readTestSchema("person-type-extends-base-type.xsd");

        const result = locateNodeById(schemaObj, "/complexType:PersonType/group:sequence[0]");

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("sequence");
      });
    });

    describe("Anonymous complex type navigation", () => {
      test("should locate anonymous complex type within element", () => {
        const schemaObj = schemaWith(`<xs:element name="person">
  <xs:complexType>
    <xs:sequence/>
  </xs:complexType>
</xs:element>`);

        const result = locateNodeById(
          schemaObj,
          "/element:person/anonymousComplexType[0]"
        );

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("localComplexType");
      });

      test("should locate sequence within anonymous complex type", () => {
        const schemaObj = readTestSchema(PERSON_WITH_NAME_XSD);

        const result = locateNodeById(
          schemaObj,
          "/element:person/anonymousComplexType[0]/sequence"
        );

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("sequence");
      });

      test("should locate choice within anonymous complex type", () => {
        const schemaObj = schemaWith(`<xs:element name="payment">
  <xs:complexType>
    <xs:choice>
      <xs:element name="creditCard" type="xs:string"/>
    </xs:choice>
  </xs:complexType>
</xs:element>`);

        const result = locateNodeById(
          schemaObj,
          "/element:payment/anonymousComplexType[0]/choice"
        );

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("choice");
      });

      test("should locate all group within anonymous complex type", () => {
        const schemaObj = schemaWith(`<xs:element name="config">
  <xs:complexType>
    <xs:all>
      <xs:element name="timeout" type="xs:int"/>
    </xs:all>
  </xs:complexType>
</xs:element>`);

        const result = locateNodeById(
          schemaObj,
          "/element:config/anonymousComplexType[0]/all"
        );

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("all");
      });
    });

    describe("Nested element navigation", () => {
      test("should locate element within sequence by name", () => {
        const schemaObj = readTestSchema(PERSON_NAME_AND_AGE_XSD);

        const result = locateNodeById(
          schemaObj,
          "/element:person/anonymousComplexType[0]/sequence/element:name"
        );

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("localElement");
        const parentElement = result.parent as { name: string } | undefined;
        expect(parentElement?.name).toBe("name");
      });

      test("should locate element within sequence by position", () => {
        const schemaObj = readTestSchema(PERSON_NAME_AND_AGE_XSD);

        const result = locateNodeById(
          schemaObj,
          "/element:person/anonymousComplexType[0]/sequence/element[0]"
        );

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("localElement");
        const parentElement = result.parent as { name: string } | undefined;
        expect(parentElement?.name).toBe("name");
      });
    });

    describe("Simple type navigation", () => {
      test("should locate top-level simple type by name", () => {
        const schemaObj = schemaWith(`<xs:simpleType name="StringType">
  <xs:restriction base="xs:string"/>
</xs:simpleType>`);

        const result = locateNodeById(schemaObj, "/simpleType:StringType");

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("topLevelSimpleType");
        const parentType = result.parent as { name: string } | undefined;
        expect(parentType?.name).toBe("StringType");
      });
    });

    describe("Group navigation", () => {
      test("should locate named group by name", () => {
        const schemaObj = schemaWith(PERSON_GROUP_WITH_NAME_ELEMENT);

        const result = locateNodeById(schemaObj, "/group:PersonGroup");

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("namedGroup");
        const parentGroup = result.parent as { name: string } | undefined;
        expect(parentGroup?.name).toBe("PersonGroup");
      });

      test("should locate sequence via group:sequence[N] path under named complexType", () => {
        const schemaObj = readTestSchema(PERSON_TYPE_WITH_NAME_XSD);

        const result = locateNodeById(
          schemaObj,
          "/complexType:PersonType/group:sequence[0]"
        );

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("sequence");
      });

      test("should locate sequence via group:sequence[N] path under named group", () => {
        const schemaObj = schemaWith(PERSON_GROUP_WITH_NAME_ELEMENT);

        const result = locateNodeById(
          schemaObj,
          "/group:PersonGroup/group:sequence[0]"
        );

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("sequence");
      });

      test("should locate choice via group:choice[N] path under named complexType", () => {
        const schemaObj = schemaWith(`<xs:complexType name="ChoiceType">
  <xs:choice>
    <xs:element name="opt" type="xs:string"/>
  </xs:choice>
</xs:complexType>`);

        const result = locateNodeById(
          schemaObj,
          "/complexType:ChoiceType/group:choice[0]"
        );

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("choice");
      });

      test("should locate all via group:all[N] path under named complexType", () => {
        const schemaObj = schemaWith(`<xs:complexType name="AllType">
  <xs:all>
    <xs:element name="field" type="xs:string"/>
  </xs:all>
</xs:complexType>`);

        const result = locateNodeById(
          schemaObj,
          "/complexType:AllType/group:all[0]"
        );

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("all");
      });

      test("should locate sequence via group:sequence[N] path under anonymous complexType", () => {
        const schemaObj = readTestSchema(PERSON_WITH_NAME_XSD);

        const result = locateNodeById(
          schemaObj,
          "/element:person/anonymousComplexType[0]/group:sequence[0]"
        );

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("sequence");
      });

      test("should locate element inside sequence via full group:sequence[N] path", () => {
        const schemaObj = readTestSchema(PERSON_NAME_AND_AGE_XSD);

        const result = locateNodeById(
          schemaObj,
          "/element:person/anonymousComplexType[0]/group:sequence[0]/element:name[0]"
        );

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("localElement");
        const elem = result.parent as { name: string } | undefined;
        expect(elem?.name).toBe("name");
      });
    });

    describe("Error handling", () => {
      test("should return not found for invalid ID format", () => {
        const schemaObj = emptySchema();

        const result = locateNodeById(schemaObj, "invalid-id");

        expect(result.found).toBe(false);
        expect(result.error).toBeDefined();
      });

      test("should return not found for missing intermediate node", () => {
        const schemaObj = schemaWith(`<xs:element name="person" type="xs:string"/>`);

        const result = locateNodeById(
          schemaObj,
          "/element:person/anonymousComplexType[0]"
        );

        expect(result.found).toBe(false);
        expect(result.error).toContain("not found");
      });

      test("should return not found for non-existent sequence", () => {
        const schemaObj = schemaWith(`<xs:complexType name="PersonType">
  <xs:choice/>
</xs:complexType>`);

        const result = locateNodeById(schemaObj, "/complexType:PersonType/sequence");

        expect(result.found).toBe(false);
      });
    });

    describe("Position-based navigation", () => {
      test("should locate element by position when multiple elements exist", () => {
        const schemaObj = schemaWith(`<xs:element name="person" type="xs:string"/>
<xs:element name="company" type="xs:string"/>`);

        const result = locateNodeById(schemaObj, "/element[1]");

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("topLevelElement");
        const parentElement = result.parent as { name: string } | undefined;
        expect(parentElement?.name).toBe("company");
      });

      test("should locate complex type by position", () => {
        const schemaObj = schemaWith(`<xs:complexType name="Type1">
  <xs:sequence/>
</xs:complexType>
<xs:complexType name="Type2">
  <xs:sequence/>
</xs:complexType>`);

        const result = locateNodeById(schemaObj, "/complexType[0]");

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("topLevelComplexType");
        const parentType = result.parent as { name: string } | undefined;
        expect(parentType?.name).toBe("Type1");
      });
    });
  });
});
