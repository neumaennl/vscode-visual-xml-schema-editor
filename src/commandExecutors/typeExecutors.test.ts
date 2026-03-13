/**
 * Unit tests for simpleType executors.
 * Tests the implementation of add, remove, and modify simple type execution logic.
 */

import { unmarshal, marshal } from "@neumaennl/xmlbind-ts";
import {
  schema,
  AddSimpleTypeCommand,
  RemoveSimpleTypeCommand,
  ModifySimpleTypeCommand,
} from "../../shared/types";
import {
  executeAddSimpleType,
  executeRemoveSimpleType,
  executeModifySimpleType,
} from "./typeExecutors";
import { toArray } from "../../shared/schemaUtils";

describe("SimpleType Executors", () => {
  describe("executeAddSimpleType", () => {
    it("should add a simple type with base type only", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "AgeType",
          baseType: "xs:integer",
        },
      };

      executeAddSimpleType(command, schemaObj);

      expect(schemaObj.simpleType).toBeDefined();
      expect(schemaObj.simpleType).toHaveLength(1);
      const st = schemaObj.simpleType![0];
      expect(st.name).toBe("AgeType");
      expect(st.restriction).toBeDefined();
      expect(st.restriction!.base).toBe("xs:integer");
    });

    it("should produce a valid XSD simpleType element in the serialized output", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "NameType",
          baseType: "xs:string",
        },
      };

      executeAddSimpleType(command, schemaObj);
      const xml = marshal(schemaObj);
      const reparsed = unmarshal(schema, xml);
      const simpleTypes = toArray(reparsed.simpleType);
      expect(simpleTypes).toHaveLength(1);
      expect(simpleTypes[0].name).toBe("NameType");
      expect(simpleTypes[0].restriction).toBeDefined();
      expect(simpleTypes[0].restriction!.base).toBe("xs:string");
    });

    it("should add a simple type with documentation", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "AgeType",
          baseType: "xs:integer",
          documentation: "Represents a person's age",
        },
      };

      executeAddSimpleType(command, schemaObj);

      const st = schemaObj.simpleType![0];
      expect(st.annotation).toBeDefined();
      expect(st.annotation!.documentation).toHaveLength(1);
      expect(st.annotation!.documentation![0].value).toBe("Represents a person's age");
    });

    it("should add a simple type with minInclusive and maxInclusive facets", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "AgeType",
          baseType: "xs:integer",
          restrictions: { minInclusive: "0", maxInclusive: "120" },
        },
      };

      executeAddSimpleType(command, schemaObj);

      const restriction = schemaObj.simpleType![0].restriction!;
      expect(restriction.minInclusive).toHaveLength(1);
      expect(restriction.minInclusive![0].value).toBe("0");
      expect(restriction.maxInclusive).toHaveLength(1);
      expect(restriction.maxInclusive![0].value).toBe("120");
    });

    it("should add a simple type with minExclusive and maxExclusive facets", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "PositiveType",
          baseType: "xs:decimal",
          restrictions: { minExclusive: "0", maxExclusive: "100" },
        },
      };

      executeAddSimpleType(command, schemaObj);

      const restriction = schemaObj.simpleType![0].restriction!;
      expect(restriction.minExclusive).toHaveLength(1);
      expect(restriction.minExclusive![0].value).toBe("0");
      expect(restriction.maxExclusive).toHaveLength(1);
      expect(restriction.maxExclusive![0].value).toBe("100");
    });

    it("should add a simple type with length facets", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "CodeType",
          baseType: "xs:string",
          restrictions: { length: 5 },
        },
      };

      executeAddSimpleType(command, schemaObj);

      const restriction = schemaObj.simpleType![0].restriction!;
      expect(restriction.length).toHaveLength(1);
      expect(restriction.length![0].value).toBe(5);
    });

    it("should add a simple type with minLength and maxLength facets", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "StringType",
          baseType: "xs:string",
          restrictions: { minLength: 1, maxLength: 255 },
        },
      };

      executeAddSimpleType(command, schemaObj);

      const restriction = schemaObj.simpleType![0].restriction!;
      expect(restriction.minLength).toHaveLength(1);
      expect(restriction.minLength![0].value).toBe(1);
      expect(restriction.maxLength).toHaveLength(1);
      expect(restriction.maxLength![0].value).toBe(255);
    });

    it("should add a simple type with totalDigits and fractionDigits facets", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "PriceType",
          baseType: "xs:decimal",
          restrictions: { totalDigits: 8, fractionDigits: 2 },
        },
      };

      executeAddSimpleType(command, schemaObj);

      const restriction = schemaObj.simpleType![0].restriction!;
      expect(restriction.totalDigits).toHaveLength(1);
      expect(restriction.totalDigits![0].value).toBe(8);
      expect(restriction.fractionDigits).toHaveLength(1);
      expect(restriction.fractionDigits![0].value).toBe(2);
    });

    it("should add a simple type with pattern facet", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "PhoneType",
          baseType: "xs:string",
          restrictions: { pattern: "[0-9]{10}" },
        },
      };

      executeAddSimpleType(command, schemaObj);

      const restriction = schemaObj.simpleType![0].restriction!;
      expect(restriction.pattern).toHaveLength(1);
      expect(restriction.pattern![0].value).toBe("[0-9]{10}");
    });

    it("should add a simple type with enumeration facet", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "ColorType",
          baseType: "xs:string",
          restrictions: { enumeration: ["red", "green", "blue"] },
        },
      };

      executeAddSimpleType(command, schemaObj);

      const restriction = schemaObj.simpleType![0].restriction!;
      expect(restriction.enumeration).toHaveLength(3);
      expect(restriction.enumeration![0].value).toBe("red");
      expect(restriction.enumeration![1].value).toBe("green");
      expect(restriction.enumeration![2].value).toBe("blue");
    });

    it("should add a simple type with whiteSpace facet", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "NormalizedType",
          baseType: "xs:string",
          restrictions: { whiteSpace: "collapse" },
        },
      };

      executeAddSimpleType(command, schemaObj);

      const restriction = schemaObj.simpleType![0].restriction!;
      expect(restriction.whiteSpace).toHaveLength(1);
      expect(restriction.whiteSpace![0].value).toBe("collapse");
    });

    it("should append to existing simple types", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:simpleType name="ExistingType">
    <xs:restriction base="xs:string"/>
  </xs:simpleType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "NewType",
          baseType: "xs:integer",
        },
      };

      executeAddSimpleType(command, schemaObj);

      expect(schemaObj.simpleType).toHaveLength(2);
      expect(schemaObj.simpleType![0].name).toBe("ExistingType");
      expect(schemaObj.simpleType![1].name).toBe("NewType");
    });
  });

  describe("executeRemoveSimpleType", () => {
    it("should remove a simple type by ID", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:simpleType name="AgeType">
    <xs:restriction base="xs:integer"/>
  </xs:simpleType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveSimpleTypeCommand = {
        type: "removeSimpleType",
        payload: {
          typeId: "/simpleType:AgeType",
        },
      };

      executeRemoveSimpleType(command, schemaObj);

      expect(schemaObj.simpleType).toBeUndefined();
    });

    it("should remove only the targeted simple type when multiple exist", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:simpleType name="AgeType">
    <xs:restriction base="xs:integer"/>
  </xs:simpleType>
  <xs:simpleType name="NameType">
    <xs:restriction base="xs:string"/>
  </xs:simpleType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveSimpleTypeCommand = {
        type: "removeSimpleType",
        payload: {
          typeId: "/simpleType:AgeType",
        },
      };

      executeRemoveSimpleType(command, schemaObj);

      expect(schemaObj.simpleType).toHaveLength(1);
      expect(schemaObj.simpleType![0].name).toBe("NameType");
    });

    it("should throw an error when the simple type is not found", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveSimpleTypeCommand = {
        type: "removeSimpleType",
        payload: {
          typeId: "/simpleType:NonExistent",
        },
      };

      expect(() => executeRemoveSimpleType(command, schemaObj)).toThrow(
        "SimpleType not found: NonExistent"
      );
    });
  });

  describe("executeModifySimpleType", () => {
    it("should modify the type name", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:simpleType name="AgeType">
    <xs:restriction base="xs:integer"/>
  </xs:simpleType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: {
          typeId: "/simpleType:AgeType",
          typeName: "PersonAgeType",
        },
      };

      executeModifySimpleType(command, schemaObj);

      expect(toArray(schemaObj.simpleType)[0].name).toBe("PersonAgeType");
    });

    it("should modify the base type", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:simpleType name="AgeType">
    <xs:restriction base="xs:integer"/>
  </xs:simpleType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: {
          typeId: "/simpleType:AgeType",
          baseType: "xs:positiveInteger",
        },
      };

      executeModifySimpleType(command, schemaObj);

      expect(toArray(schemaObj.simpleType)[0].restriction!.base).toBe("xs:positiveInteger");
    });

    it("should add documentation", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:simpleType name="AgeType">
    <xs:restriction base="xs:integer"/>
  </xs:simpleType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: {
          typeId: "/simpleType:AgeType",
          documentation: "A person's age in years",
        },
      };

      executeModifySimpleType(command, schemaObj);

      const st = toArray(schemaObj.simpleType)[0];
      expect(st.annotation).toBeDefined();
      expect(st.annotation!.documentation![0].value).toBe("A person's age in years");
    });

    it("should replace restriction facets", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:simpleType name="AgeType">
    <xs:restriction base="xs:integer">
      <xs:minInclusive value="0"/>
      <xs:maxInclusive value="100"/>
    </xs:restriction>
  </xs:simpleType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: {
          typeId: "/simpleType:AgeType",
          restrictions: { minInclusive: "0", maxInclusive: "150" },
        },
      };

      executeModifySimpleType(command, schemaObj);

      const restriction = toArray(schemaObj.simpleType)[0].restriction!;
      expect(toArray(restriction.minInclusive)[0].value).toBe("0");
      expect(toArray(restriction.maxInclusive)[0].value).toBe("150");
    });

    it("should clear all facets when empty restrictions object is provided", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:simpleType name="AgeType">
    <xs:restriction base="xs:integer">
      <xs:minInclusive value="0"/>
    </xs:restriction>
  </xs:simpleType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: {
          typeId: "/simpleType:AgeType",
          restrictions: {},
        },
      };

      executeModifySimpleType(command, schemaObj);

      const restriction = toArray(schemaObj.simpleType)[0].restriction!;
      expect(restriction.minInclusive).toBeUndefined();
    });

    it("should replace enumeration values", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:simpleType name="ColorType">
    <xs:restriction base="xs:string">
      <xs:enumeration value="red"/>
    </xs:restriction>
  </xs:simpleType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: {
          typeId: "/simpleType:ColorType",
          restrictions: { enumeration: ["red", "green", "blue"] },
        },
      };

      executeModifySimpleType(command, schemaObj);

      const restriction = toArray(schemaObj.simpleType)[0].restriction!;
      expect(restriction.enumeration).toHaveLength(3);
      expect(restriction.enumeration![2].value).toBe("blue");
    });

    it("should throw an error when the simple type is not found", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: {
          typeId: "/simpleType:NonExistent",
          typeName: "NewName",
        },
      };

      expect(() => executeModifySimpleType(command, schemaObj)).toThrow(
        "SimpleType not found: NonExistent"
      );
    });

    it("should create a restriction if none exists and baseType is provided", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:simpleType name="UnionType">
    <xs:union memberTypes="xs:string xs:integer"/>
  </xs:simpleType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: {
          typeId: "/simpleType:UnionType",
          baseType: "xs:string",
        },
      };

      executeModifySimpleType(command, schemaObj);

      const st = toArray(schemaObj.simpleType)[0];
      expect(st.restriction).toBeDefined();
      expect(st.restriction!.base).toBe("xs:string");
    });

    it("should throw an error when applying restrictions without a base type on a type with no restriction", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:simpleType name="UnionType">
    <xs:union memberTypes="xs:string xs:integer"/>
  </xs:simpleType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: {
          typeId: "/simpleType:UnionType",
          restrictions: { maxLength: 50 },
        },
      };

      expect(() => executeModifySimpleType(command, schemaObj)).toThrow(
        "Cannot apply restrictions without a base type"
      );
    });
  });

  describe("Anonymous SimpleType Executors", () => {
    describe("executeAddSimpleType (anonymous)", () => {
      it("should add an anonymous simpleType to a top-level element", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="age"/>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: AddSimpleTypeCommand = {
          type: "addSimpleType",
          payload: {
            parentId: "/element:age",
            baseType: "xs:integer",
            restrictions: { minInclusive: "0", maxInclusive: "120" },
          },
        };

        executeAddSimpleType(command, schemaObj);

        const element = toArray(schemaObj.element)[0];
        expect(element.simpleType).toBeDefined();
        expect(element.simpleType!.restriction).toBeDefined();
        expect(element.simpleType!.restriction!.base).toBe("xs:integer");
        expect(element.simpleType!.restriction!.minInclusive).toHaveLength(1);
        expect(element.simpleType!.restriction!.minInclusive![0].value).toBe("0");
        expect(element.simpleType!.restriction!.maxInclusive![0].value).toBe("120");
      });

      it("should add an anonymous simpleType with documentation", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="color"/>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: AddSimpleTypeCommand = {
          type: "addSimpleType",
          payload: {
            parentId: "/element:color",
            baseType: "xs:string",
            restrictions: { enumeration: ["red", "green", "blue"] },
            documentation: "Allowed color values",
          },
        };

        executeAddSimpleType(command, schemaObj);

        const element = toArray(schemaObj.element)[0];
        expect(element.simpleType!.annotation!.documentation![0].value).toBe("Allowed color values");
        expect(element.simpleType!.restriction!.enumeration).toHaveLength(3);
      });

      it("should produce valid XSD when serialized and re-parsed", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="age"/>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        executeAddSimpleType(
          {
            type: "addSimpleType",
            payload: { parentId: "/element:age", baseType: "xs:integer" },
          },
          schemaObj
        );

        const xml = marshal(schemaObj);
        const reparsed = unmarshal(schema, xml);
        const element = toArray(reparsed.element)[0];
        expect(element.simpleType).toBeDefined();
        expect(element.simpleType!.restriction!.base).toBe("xs:integer");
      });

      it("should throw when parent element is not found", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: AddSimpleTypeCommand = {
          type: "addSimpleType",
          payload: { parentId: "/element:nonExistent", baseType: "xs:string" },
        };

        expect(() => executeAddSimpleType(command, schemaObj)).toThrow(
          "Parent element not found: /element:nonExistent"
        );
      });
    });

    describe("executeRemoveSimpleType (anonymous)", () => {
      it("should remove an anonymous simpleType from an element", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="age">
    <xs:simpleType>
      <xs:restriction base="xs:integer"/>
    </xs:simpleType>
  </xs:element>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: RemoveSimpleTypeCommand = {
          type: "removeSimpleType",
          payload: { typeId: "/element:age/anonymousSimpleType[0]" },
        };

        executeRemoveSimpleType(command, schemaObj);

        const element = toArray(schemaObj.element)[0];
        expect(element.simpleType).toBeUndefined();
      });

      it("should throw when the parent element has no anonymous simpleType", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="age" type="xs:integer"/>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: RemoveSimpleTypeCommand = {
          type: "removeSimpleType",
          payload: { typeId: "/element:age/anonymousSimpleType[0]" },
        };

        expect(() => executeRemoveSimpleType(command, schemaObj)).toThrow(
          "No anonymous simpleType found in element: /element:age"
        );
      });
    });

    describe("executeModifySimpleType (anonymous)", () => {
      it("should modify the base type of an anonymous simpleType", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="age">
    <xs:simpleType>
      <xs:restriction base="xs:integer"/>
    </xs:simpleType>
  </xs:element>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: ModifySimpleTypeCommand = {
          type: "modifySimpleType",
          payload: {
            typeId: "/element:age/anonymousSimpleType[0]",
            baseType: "xs:positiveInteger",
          },
        };

        executeModifySimpleType(command, schemaObj);

        const element = toArray(schemaObj.element)[0];
        expect(element.simpleType!.restriction!.base).toBe("xs:positiveInteger");
      });

      it("should replace restriction facets on an anonymous simpleType", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="age">
    <xs:simpleType>
      <xs:restriction base="xs:integer">
        <xs:minInclusive value="0"/>
      </xs:restriction>
    </xs:simpleType>
  </xs:element>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: ModifySimpleTypeCommand = {
          type: "modifySimpleType",
          payload: {
            typeId: "/element:age/anonymousSimpleType[0]",
            restrictions: { minInclusive: "0", maxInclusive: "150" },
          },
        };

        executeModifySimpleType(command, schemaObj);

        const restriction = toArray(schemaObj.element)[0].simpleType!.restriction!;
        expect(toArray(restriction.minInclusive)[0].value).toBe("0");
        expect(toArray(restriction.maxInclusive)[0].value).toBe("150");
      });

      it("should add documentation to an anonymous simpleType", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="age">
    <xs:simpleType>
      <xs:restriction base="xs:integer"/>
    </xs:simpleType>
  </xs:element>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: ModifySimpleTypeCommand = {
          type: "modifySimpleType",
          payload: {
            typeId: "/element:age/anonymousSimpleType[0]",
            documentation: "Age in years",
          },
        };

        executeModifySimpleType(command, schemaObj);

        const element = toArray(schemaObj.element)[0];
        expect(element.simpleType!.annotation!.documentation![0].value).toBe("Age in years");
      });

      it("should throw when the parent element has no anonymous simpleType", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="age" type="xs:integer"/>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: ModifySimpleTypeCommand = {
          type: "modifySimpleType",
          payload: {
            typeId: "/element:age/anonymousSimpleType[0]",
            baseType: "xs:string",
          },
        };

        expect(() => executeModifySimpleType(command, schemaObj)).toThrow(
          "No anonymous simpleType found in element: /element:age"
        );
      });
    });
  });
});
