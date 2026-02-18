/**
 * Unit tests for SchemaNavigator module.
 * Tests the node location and navigation logic.
 */

import { unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../shared/types";
import { locateNodeById } from "./schemaNavigator";

describe("SchemaNavigator", () => {
  describe("locateNodeById", () => {
    describe("Schema root navigation", () => {
      it("should locate schema root with 'schema' id", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const result = locateNodeById(schemaObj, "schema");

        expect(result.found).toBe(true);
        expect(result.parent).toBe(schemaObj);
        expect(result.parentType).toBe("schema");
      });

      it("should locate schema root with '/schema' id", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const result = locateNodeById(schemaObj, "/schema");

        expect(result.found).toBe(true);
        expect(result.parent).toBe(schemaObj);
        expect(result.parentType).toBe("schema");
      });
    });

    describe("Top-level element navigation", () => {
      it("should locate top-level element by name", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const result = locateNodeById(schemaObj, "/element:person");

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("topLevelElement");
        const parentElement = result.parent as { name: string } | undefined;
        expect(parentElement?.name).toBe("person");
      });

      it("should return not found for non-existent element", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const result = locateNodeById(schemaObj, "/element:nonexistent");

        expect(result.found).toBe(false);
        expect(result.error).toContain("not found");
      });
    });

    describe("Complex type navigation", () => {
      it("should locate top-level complex type by name", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="PersonType">
    <xs:sequence/>
  </xs:complexType>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const result = locateNodeById(schemaObj, "/complexType:PersonType");

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("topLevelComplexType");
        const parentType = result.parent as { name: string } | undefined;
        expect(parentType?.name).toBe("PersonType");
      });

      it("should locate sequence within complex type", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="PersonType">
    <xs:sequence>
      <xs:element name="name" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const result = locateNodeById(schemaObj, "/complexType:PersonType/sequence");

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("sequence");
      });

      it("should locate choice within complex type", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="ChoiceType">
    <xs:choice>
      <xs:element name="option1" type="xs:string"/>
    </xs:choice>
  </xs:complexType>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const result = locateNodeById(schemaObj, "/complexType:ChoiceType/choice");

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("choice");
      });

      it("should locate all group within complex type", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="AllType">
    <xs:all>
      <xs:element name="field1" type="xs:string"/>
    </xs:all>
  </xs:complexType>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const result = locateNodeById(schemaObj, "/complexType:AllType/all");

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("all");
      });
    });

    describe("Anonymous complex type navigation", () => {
      it("should locate anonymous complex type within element", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person">
    <xs:complexType>
      <xs:sequence/>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const result = locateNodeById(
          schemaObj,
          "/element:person/anonymousComplexType[0]"
        );

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("localComplexType");
      });

      it("should locate sequence within anonymous complex type", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="name" type="xs:string"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const result = locateNodeById(
          schemaObj,
          "/element:person/anonymousComplexType[0]/sequence"
        );

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("sequence");
      });

      it("should locate choice within anonymous complex type", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="payment">
    <xs:complexType>
      <xs:choice>
        <xs:element name="creditCard" type="xs:string"/>
      </xs:choice>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const result = locateNodeById(
          schemaObj,
          "/element:payment/anonymousComplexType[0]/choice"
        );

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("choice");
      });

      it("should locate all group within anonymous complex type", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="config">
    <xs:complexType>
      <xs:all>
        <xs:element name="timeout" type="xs:int"/>
      </xs:all>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const result = locateNodeById(
          schemaObj,
          "/element:config/anonymousComplexType[0]/all"
        );

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("all");
      });
    });

    describe("Nested element navigation", () => {
      it("should locate element within sequence by name", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="name" type="xs:string"/>
        <xs:element name="age" type="xs:int"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const result = locateNodeById(
          schemaObj,
          "/element:person/anonymousComplexType[0]/sequence/element:name"
        );

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("localElement");
        const parentElement = result.parent as { name: string } | undefined;
        expect(parentElement?.name).toBe("name");
      });

      it("should locate element within sequence by position", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="name" type="xs:string"/>
        <xs:element name="age" type="xs:int"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

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
      it("should locate top-level simple type by name", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:simpleType name="StringType">
    <xs:restriction base="xs:string"/>
  </xs:simpleType>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const result = locateNodeById(schemaObj, "/simpleType:StringType");

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("topLevelSimpleType");
        const parentType = result.parent as { name: string } | undefined;
        expect(parentType?.name).toBe("StringType");
      });
    });

    describe("Group navigation", () => {
      it("should locate named group by name", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="PersonGroup">
    <xs:sequence>
      <xs:element name="name" type="xs:string"/>
    </xs:sequence>
  </xs:group>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const result = locateNodeById(schemaObj, "/group:PersonGroup");

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("namedGroup");
        const parentGroup = result.parent as { name: string } | undefined;
        expect(parentGroup?.name).toBe("PersonGroup");
      });
    });

    describe("Error handling", () => {
      it("should return not found for invalid ID format", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const result = locateNodeById(schemaObj, "invalid-id");

        expect(result.found).toBe(false);
        expect(result.error).toBeDefined();
      });

      it("should return not found for missing intermediate node", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const result = locateNodeById(
          schemaObj,
          "/element:person/anonymousComplexType[0]"
        );

        expect(result.found).toBe(false);
        expect(result.error).toContain("not found");
      });

      it("should return not found for non-existent sequence", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="PersonType">
    <xs:choice/>
  </xs:complexType>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const result = locateNodeById(schemaObj, "/complexType:PersonType/sequence");

        expect(result.found).toBe(false);
      });
    });

    describe("Position-based navigation", () => {
      it("should locate element by position when multiple elements exist", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
  <xs:element name="company" type="xs:string"/>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const result = locateNodeById(schemaObj, "/element[1]");

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("topLevelElement");
        const parentElement = result.parent as { name: string } | undefined;
        expect(parentElement?.name).toBe("company");
      });

      it("should locate complex type by position", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="Type1">
    <xs:sequence/>
  </xs:complexType>
  <xs:complexType name="Type2">
    <xs:sequence/>
  </xs:complexType>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const result = locateNodeById(schemaObj, "/complexType[0]");

        expect(result.found).toBe(true);
        expect(result.parentType).toBe("topLevelComplexType");
        const parentType = result.parent as { name: string } | undefined;
        expect(parentType?.name).toBe("Type1");
      });
    });
  });
});
