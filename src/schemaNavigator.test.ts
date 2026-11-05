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

/** The file with one of each node that the navigator can navigate to. */
const NAVIGABLE_NODES_XSD = "one-of-each-navigable-node.xsd";

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

        expect(result).toEqual({ found: true, parent: schemaObj, parentType: "schema" });
      });

    });

    describe("Top-level element navigation", () => {
      test("should locate top-level element by name", () => {
        const schemaObj = schemaWith(`<xs:element name="person" type="xs:string"/>`);

        const result = locateNodeById(schemaObj, "/element:person");

        expect(result).toMatchObject({ found: true, parentType: "topLevelElement", parent: { name: "person" } });
      });

      test("should return not found for non-existent element", () => {
        const schemaObj = emptySchema();

        const result = locateNodeById(schemaObj, "/element:nonexistent");

        expect(result).toEqual({ found: false, error: "Node not found at segment: element:nonexistent" });
      });
    });

    describe("Complex type navigation", () => {
      test("should locate top-level complex type by name", () => {
        const schemaObj = schemaWith(`<xs:complexType name="PersonType">
  <xs:sequence/>
</xs:complexType>`);

        const result = locateNodeById(schemaObj, "/complexType:PersonType");

        expect(result).toMatchObject({ found: true, parentType: "topLevelComplexType", parent: { name: "PersonType" } });
      });

      test("should locate sequence within complex type", () => {
        const schemaObj = readTestSchema(PERSON_TYPE_WITH_NAME_XSD);

        const result = locateNodeById(schemaObj, "/complexType:PersonType/group:sequence[0]");

        expect(result).toMatchObject({ found: true, parentType: "sequence" });
      });

      test("should locate choice within complex type", () => {
        const schemaObj = schemaWith(`<xs:complexType name="ChoiceType">
  <xs:choice>
    <xs:element name="option1" type="xs:string"/>
  </xs:choice>
</xs:complexType>`);

        const result = locateNodeById(schemaObj, "/complexType:ChoiceType/group:choice[0]");

        expect(result).toMatchObject({ found: true, parentType: "choice" });
      });

      test("should locate all group within complex type", () => {
        const schemaObj = schemaWith(`<xs:complexType name="AllType">
  <xs:all>
    <xs:element name="field1" type="xs:string"/>
  </xs:all>
</xs:complexType>`);

        const result = locateNodeById(schemaObj, "/complexType:AllType/group:all[0]");

        expect(result).toMatchObject({ found: true, parentType: "all" });
      });

      test("should locate sequence within complexContent extension via group path", () => {
        const schemaObj = readTestSchema("person-type-extends-base-type.xsd");

        const result = locateNodeById(schemaObj, "/complexType:PersonType/group:sequence[0]");

        expect(result).toMatchObject({ found: true, parentType: "sequence" });
      });
      test("should locate sequence within complexContent restriction via group path", () => {
        const schemaObj = schemaWith(`<xs:complexType name="RestrictedType">
  <xs:complexContent><xs:restriction base="xs:anyType"><xs:sequence/></xs:restriction></xs:complexContent>
</xs:complexType>`);

        const result = locateNodeById(schemaObj, "/complexType:RestrictedType/group:sequence[0]");

        expect(result).toMatchObject({ found: true, parentType: "sequence" });
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

        expect(result).toMatchObject({ found: true, parentType: "localComplexType" });
      });

      test("should locate sequence within anonymous complex type", () => {
        const schemaObj = readTestSchema(PERSON_WITH_NAME_XSD);

        const result = locateNodeById(
          schemaObj,
          "/element:person/anonymousComplexType[0]/group:sequence[0]"
        );

        expect(result).toMatchObject({ found: true, parentType: "sequence" });
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
          "/element:payment/anonymousComplexType[0]/group:choice[0]"
        );

        expect(result).toMatchObject({ found: true, parentType: "choice" });
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
          "/element:config/anonymousComplexType[0]/group:all[0]"
        );

        expect(result).toMatchObject({ found: true, parentType: "all" });
      });
    });

    describe("Nested element navigation", () => {
      test("should locate element within sequence by name", () => {
        const schemaObj = readTestSchema(PERSON_NAME_AND_AGE_XSD);

        const result = locateNodeById(
          schemaObj,
          "/element:person/anonymousComplexType[0]/group:sequence[0]/element:name"
        );

        expect(result).toMatchObject({ found: true, parentType: "localElement", parent: { name: "name" } });
      });

      test("should locate element within sequence by position", () => {
        const schemaObj = readTestSchema(PERSON_NAME_AND_AGE_XSD);

        const result = locateNodeById(
          schemaObj,
          "/element:person/anonymousComplexType[0]/group:sequence[0]/element[0]"
        );

        expect(result).toMatchObject({ found: true, parentType: "localElement", parent: { name: "name" } });
      });
    });

    describe("Simple type navigation", () => {
      test("should locate top-level simple type by name", () => {
        const schemaObj = schemaWith(`<xs:simpleType name="StringType">
  <xs:restriction base="xs:string"/>
</xs:simpleType>`);

        const result = locateNodeById(schemaObj, "/simpleType:StringType");

        expect(result).toMatchObject({ found: true, parentType: "topLevelSimpleType", parent: { name: "StringType" } });
      });
    });

    describe("Group navigation", () => {
      test("should locate named group by name", () => {
        const schemaObj = schemaWith(PERSON_GROUP_WITH_NAME_ELEMENT);

        const result = locateNodeById(schemaObj, "/group:PersonGroup");

        expect(result).toMatchObject({ found: true, parentType: "namedGroup", parent: { name: "PersonGroup" } });
      });

      test("should locate sequence via group:sequence[N] path under named group", () => {
        const schemaObj = schemaWith(PERSON_GROUP_WITH_NAME_ELEMENT);

        const result = locateNodeById(
          schemaObj,
          "/group:PersonGroup/group:sequence[0]"
        );

        expect(result).toMatchObject({ found: true, parentType: "sequence" });
      });

      test("should locate element inside sequence via full group:sequence[N] path", () => {
        const schemaObj = readTestSchema(PERSON_NAME_AND_AGE_XSD);

        const result = locateNodeById(
          schemaObj,
          "/element:person/anonymousComplexType[0]/group:sequence[0]/element:name[0]"
        );

        expect(result).toMatchObject({ found: true, parentType: "localElement", parent: { name: "name" } });
      });
    });

    describe("Error handling", () => {
      test("should return not found for invalid ID format", () => {
        const schemaObj = emptySchema();

        const result = locateNodeById(schemaObj, "invalid-id");

        expect(result).toEqual({
          found: false,
          error: "Failed to parse or locate node: Invalid schema ID format: must start with /: invalid-id",
        });
      });

      test("should return not found for missing intermediate node", () => {
        const schemaObj = schemaWith(`<xs:element name="person" type="xs:string"/>`);

        const result = locateNodeById(
          schemaObj,
          "/element:person/anonymousComplexType[0]"
        );

        expect(result).toEqual({ found: false, error: "Node not found at segment: anonymousComplexType[0]" });
      });

      test("should return not found for non-existent sequence", () => {
        const schemaObj = schemaWith(`<xs:complexType name="PersonType">
  <xs:choice/>
</xs:complexType>`);

        const result = locateNodeById(schemaObj, "/complexType:PersonType/group:sequence[0]");

        expect(result.found).toBe(false);
      });
    });

    describe("Every kind of node", () => {
      test.each([
        ["/attribute:lang", "topLevelAttribute"],
        ["/attributeGroup:CommonAttributes", "namedAttributeGroup"],
        ["/element:code/anonymousSimpleType[0]", "localSimpleType"],
        ["/attribute:lang/anonymousSimpleType[0]", "localSimpleType"],
        ["/complexType:ItemType/attribute:id", "attribute"],
        ["/complexType:ItemType/attribute:id/anonymousSimpleType[0]", "localSimpleType"],
        ["/complexType:ItemType/group:sequence[0]/group:choice[0]", "choice"],
        ["/complexType:ItemType/group:sequence[0]/group:sequence[0]", "sequence"],
        ["/group:ChoiceGroup/group:choice[0]", "choice"],
        ["/group:AllGroup/group:all[0]", "all"],
        ["/element:order/anonymousComplexType[0]/group:sequence[0]/element:line[0]/anonymousComplexType[0]", "localComplexType"],
      ])("should locate %s as %s", (id, parentType) => {
        const result = locateNodeById(readTestSchema(NAVIGABLE_NODES_XSD), id);

        expect(result).toMatchObject({ found: true, parentType });
      });

      test.each([
        "/complexType:Missing",
        "/simpleType:Missing",
        "/group:Missing",
        "/attributeGroup:Missing",
        "/attribute:Missing",
        "/element:plain/anonymousSimpleType[0]",
        "/element:plain/element:child[0]",
        "/attribute:plainAttribute/anonymousSimpleType[0]",
        "/simpleType:CodeType/anonymousSimpleType[0]",
        "/complexType:ItemType/attribute:missing",
        "/complexType:ItemType/group:sequence[0]/group:sequence[0]/group:choice[0]",
        "/complexType:ItemType/group:sequence[0]/element:missing[0]",
        "/group:ChoiceGroup/group:sequence[0]",
        "/group:ChoiceGroup/group:all[0]",
      ])("should not find %s", (id) => {
        const result = locateNodeById(readTestSchema(NAVIGABLE_NODES_XSD), id);

        expect(result.found).toBe(false);
      });
    });

    describe("Position-based navigation", () => {
      test("should locate element by position when multiple elements exist", () => {
        const schemaObj = schemaWith(`<xs:element name="person" type="xs:string"/>
<xs:element name="company" type="xs:string"/>`);

        const result = locateNodeById(schemaObj, "/element[1]");

        expect(result).toMatchObject({ found: true, parentType: "topLevelElement", parent: { name: "company" } });
      });

      test("should locate complex type by position", () => {
        const schemaObj = schemaWith(`<xs:complexType name="Type1">
  <xs:sequence/>
</xs:complexType>
<xs:complexType name="Type2">
  <xs:sequence/>
</xs:complexType>`);

        const result = locateNodeById(schemaObj, "/complexType[0]");

        expect(result).toMatchObject({ found: true, parentType: "topLevelComplexType", parent: { name: "Type1" } });
      });
    });
  });
});
