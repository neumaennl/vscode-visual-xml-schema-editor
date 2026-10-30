/**
 * Unit tests for element executors.
 * Tests the implementation of add, remove, and modify element execution logic.
 */

import { unmarshal, marshal } from "@neumaennl/xmlbind-ts";
import { schema, AddElementCommand, RemoveElementCommand, ModifyElementCommand } from "../../shared/types.js";
import {
  executeAddElement,
  executeRemoveElement,
  executeModifyElement,
} from "./elementExecutors.js";
import { toArray } from "../../shared/schemaUtils.js";
import { emptySchema, readTestSchema, schemaWith } from "../__tests__/schemaTestHelpers.js";

/** The file with an element `person` and a complexType `OrderType`. */
const PERSON_AND_ORDER_TYPE_XSD = "person-element-and-order-type.xsd";

/** A top-level element `person` and a complexType `OrderType` that references it. */
const ORDER_TYPE_WITH_PERSON_REF = `<xs:element name="person" type="xs:string"/>
<xs:complexType name="OrderType">
  <xs:sequence>
    <xs:element ref="person"/>
  </xs:sequence>
</xs:complexType>`;

describe("Element Executors", () => {
  describe("executeAddElement", () => {
    describe("Adding top-level elements", () => {
      test("should add a simple top-level element to schema", () => {
        const schemaObj = emptySchema();

        const command: AddElementCommand = {
          type: "addElement",
          payload: {
            parentId: "/schema",
            elementName: "person",
            elementType: "string",
          },
        };

        executeAddElement(command, schemaObj);

        // Verify the element was added
        expect(schemaObj.element).toBeDefined();
        const elements = Array.isArray(schemaObj.element)
          ? schemaObj.element
          : [schemaObj.element];
        expect(elements).toHaveLength(1);
        expect(elements[0]!.name).toBe("person");
        expect(elements[0]!.type_).toBe("string");
      });

      test("should add multiple top-level elements to schema", () => {
        const schemaObj = emptySchema();

        const command1: AddElementCommand = {
          type: "addElement",
          payload: {
            parentId: "/schema",
            elementName: "person",
            elementType: "string",
          },
        };

        const command2: AddElementCommand = {
          type: "addElement",
          payload: {
            parentId: "/schema",
            elementName: "company",
            elementType: "string",
          },
        };

        executeAddElement(command1, schemaObj);
        executeAddElement(command2, schemaObj);

        // Verify both elements were added
        expect(schemaObj.element).toBeDefined();
        const elements = Array.isArray(schemaObj.element)
          ? schemaObj.element
          : [schemaObj.element];
        expect(elements).toHaveLength(2);
        expect(elements[0]!.name).toBe("person");
        expect(elements[1]!.name).toBe("company");
      });

      test("should add top-level element with documentation", () => {
        const schemaObj = emptySchema();

        const command: AddElementCommand = {
          type: "addElement",
          payload: {
            parentId: "/schema",
            elementName: "person",
            elementType: "string",
            documentation: "Represents a person",
          },
        };

        executeAddElement(command, schemaObj);

        // Verify the element was added with documentation
        expect(schemaObj.element).toBeDefined();
        const elements = Array.isArray(schemaObj.element)
          ? schemaObj.element
          : [schemaObj.element];
        expect(elements).toHaveLength(1);
        expect(elements[0]!.annotation).toBeDefined();
        expect(elements[0]!.annotation!.documentation).toBeDefined();
      });

    });

    describe("Adding elements to sequence", () => {
      test("should add element to a sequence in a complex type", () => {
        const schemaObj = schemaWith(`<xs:element name="person">
  <xs:complexType>
    <xs:sequence>
      <xs:element name="id" type="xs:int"/>
    </xs:sequence>
  </xs:complexType>
</xs:element>`);

        const command: AddElementCommand = {
          type: "addElement",
          payload: {
            parentId: "/element:person/anonymousComplexType[0]/sequence",
            elementName: "name",
            elementType: "string",
          },
        };

        executeAddElement(command, schemaObj);

        // Verify the element was added to the sequence
        const personElement = Array.isArray(schemaObj.element)
          ? schemaObj.element[0]
          : schemaObj.element;
        const elements = Array.isArray(personElement?.complexType?.sequence?.element)
          ? personElement?.complexType?.sequence?.element
          : [personElement?.complexType?.sequence?.element];
        expect(elements).toHaveLength(2);
        expect(elements[1]!.name).toBe("name");
      });

      test("should add element to a sequence in complexContent extension using group parent ID", () => {
        const schemaObj = readTestSchema("worker-type-extends-person-type.xsd");

        const command: AddElementCommand = {
          type: "addElement",
          payload: {
            parentId: "/complexType:WorkerType/group:sequence[0]",
            elementName: "department",
            elementType: "xs:string",
          },
        };

        executeAddElement(command, schemaObj);

        const workerType = toArray(schemaObj.complexType)[0];
        const sequence = workerType?.complexContent?.extension?.sequence;
        const elements = toArray(sequence?.element);
        expect(elements).toHaveLength(2);
        expect(elements[1]?.name).toBe("department");
      });
    });
  });

  describe("executeRemoveElement", () => {
    test("should remove top-level element by name", () => {
      const schemaObj = schemaWith(`<xs:element name="person" type="xs:string"/>
<xs:element name="company" type="xs:string"/>`);

      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: {
          elementId: "/element:person",
        },
      };

      executeRemoveElement(command, schemaObj);

      // Verify the element was removed
      const elements = Array.isArray(schemaObj.element)
        ? schemaObj.element
        : [schemaObj.element];
      expect(elements).toHaveLength(1);
      expect(elements[0]!.name).toBe("company");
    });

    test("should remove element from sequence", () => {
      const schemaObj = readTestSchema("person-element-with-first-and-last-name.xsd");

      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: {
          elementId: "/element:person/anonymousComplexType[0]/sequence[0]/element:firstName",
        },
      };

      executeRemoveElement(command, schemaObj);

      // Verify the element was removed
      const personElement = Array.isArray(schemaObj.element)
        ? schemaObj.element[0]
        : schemaObj.element;
      const sequence = personElement!.complexType!.sequence;
      const elements = Array.isArray(sequence!.element)
        ? sequence!.element
        : [sequence!.element];
      expect(elements).toHaveLength(1);
      expect(elements[0]!.name).toBe("lastName");
    });

  });

  describe("executeModifyElement", () => {
    describe("Modifying top-level elements", () => {
      test("should modify element name", () => {
        const schemaObj = schemaWith(`<xs:element name="person" type="xs:string"/>`);

        const command: ModifyElementCommand = {
          type: "modifyElement",
          payload: {
            elementId: "/element:person",
            elementName: "employee",
          },
        };

        executeModifyElement(command, schemaObj);

        // Verify the element name was modified
        expect(schemaObj.element).toBeDefined();
        const elements = Array.isArray(schemaObj.element)
          ? schemaObj.element
          : [schemaObj.element];
        expect(elements).toHaveLength(1);
        expect(elements[0]!.name).toBe("employee");
        expect(elements[0]!.type_).toBe("xs:string");
      });

      test("should modify element type", () => {
        const schemaObj = schemaWith(`<xs:element name="person" type="xs:string"/>`);

        const command: ModifyElementCommand = {
          type: "modifyElement",
          payload: {
            elementId: "/element:person",
            elementType: "xs:int",
          },
        };

        executeModifyElement(command, schemaObj);

        // Verify the element type was modified
        expect(schemaObj.element).toBeDefined();
        const elements = Array.isArray(schemaObj.element)
          ? schemaObj.element
          : [schemaObj.element];
        expect(elements).toHaveLength(1);
        expect(elements[0]!.name).toBe("person");
        expect(elements[0]!.type_).toBe("xs:int");
      });

      test("should replace an inline anonymous complexType when setting an explicit element type", () => {
        const schemaObj = schemaWith(`<xs:element name="person">
  <xs:complexType>
    <xs:sequence>
      <xs:element name="id" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
</xs:element>`);

        const command: ModifyElementCommand = {
          type: "modifyElement",
          payload: {
            elementId: "/element:person",
            elementType: "PersonType",
          },
        };

        executeModifyElement(command, schemaObj);

        const element = toArray(schemaObj.element)[0];
        expect(element.type_).toBe("PersonType");
        expect(element.complexType).toBeUndefined();
      });

      test("should replace an inline anonymous simpleType when setting an explicit element type", () => {
        const schemaObj = schemaWith(`<xs:element name="code">
  <xs:simpleType>
    <xs:restriction base="xs:string"/>
  </xs:simpleType>
</xs:element>`);

        const command: ModifyElementCommand = {
          type: "modifyElement",
          payload: {
            elementId: "/element:code",
            elementType: "CodeType",
          },
        };

        executeModifyElement(command, schemaObj);

        const element = toArray(schemaObj.element)[0];
        expect(element.type_).toBe("CodeType");
        expect(element.simpleType).toBeUndefined();
      });

      test("should rename top-level element refs and substitutionGroup references", () => {
        const schemaObj = schemaWith(`<xs:element name="person" type="xs:string"/>
<xs:element name="personChild" substitutionGroup="person"/>
<xs:complexType name="Wrapper">
  <xs:sequence>
    <xs:element ref="person"/>
  </xs:sequence>
</xs:complexType>`);

        const command: ModifyElementCommand = {
          type: "modifyElement",
          payload: {
            elementId: "/element:person",
            elementName: "customer",
          },
        };

        executeModifyElement(command, schemaObj);

        const elements = toArray(schemaObj.element);
        expect(elements[0].name).toBe("customer");
        expect(elements[1].substitutionGroup).toBe("customer");
        expect(toArray(toArray(schemaObj.complexType)[0].sequence!.element)[0].ref).toBe("customer");
      });

      test("should add documentation to element", () => {
        const schemaObj = schemaWith(`<xs:element name="person" type="xs:string"/>`);

        const command: ModifyElementCommand = {
          type: "modifyElement",
          payload: {
            elementId: "/element:person",
            documentation: "Employee information",
          },
        };

        executeModifyElement(command, schemaObj);

        // Verify documentation was added
        expect(schemaObj.element).toBeDefined();
        const elements = Array.isArray(schemaObj.element)
          ? schemaObj.element
          : [schemaObj.element];
        expect(elements[0]!.annotation).toBeDefined();
        expect(elements[0]!.annotation!.documentation![0].value).toBe("Employee information");
      });
    });

    describe("Modifying local elements", () => {
      test("should modify element in sequence", () => {
        const schemaObj = schemaWith(`<xs:element name="person">
  <xs:complexType>
    <xs:sequence>
      <xs:element name="firstName" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
</xs:element>`);

        const command: ModifyElementCommand = {
          type: "modifyElement",
          payload: {
            elementId: "/element:person/anonymousComplexType[0]/sequence[0]/element:firstName",
            elementName: "givenName",
          },
        };

        executeModifyElement(command, schemaObj);

        // Verify the element name was modified
        const personElement = Array.isArray(schemaObj.element)
          ? schemaObj.element[0]
          : schemaObj.element;
        const sequence = personElement!.complexType!.sequence;
        const elements = Array.isArray(sequence!.element)
          ? sequence!.element
          : [sequence!.element];
        expect(elements[0]!.name).toBe("givenName");
      });

      test("should modify minOccurs and maxOccurs", () => {
        const schemaObj = schemaWith(`<xs:element name="person">
  <xs:complexType>
    <xs:sequence>
      <xs:element name="phone" type="xs:string" minOccurs="1" maxOccurs="1"/>
    </xs:sequence>
  </xs:complexType>
</xs:element>`);

        const command: ModifyElementCommand = {
          type: "modifyElement",
          payload: {
            elementId: "/element:person/anonymousComplexType[0]/sequence[0]/element:phone",
            minOccurs: 0,
            maxOccurs: "unbounded",
          },
        };

        executeModifyElement(command, schemaObj);

        // Verify occurrences were modified
        const personElement = Array.isArray(schemaObj.element)
          ? schemaObj.element[0]
          : schemaObj.element;
        const sequence = personElement!.complexType!.sequence;
        const elements = Array.isArray(sequence!.element)
          ? sequence!.element
          : [sequence!.element];
        expect(elements[0]!.minOccurs).toBe(0);
        expect(elements[0]!.maxOccurs).toBe("unbounded");
      });
    });

    describe("Round-trip XML serialization", () => {
      test("should produce valid XML after modifying element", () => {
        const schemaObj = schemaWith(`<xs:element name="person" type="xs:string"/>`);

        const command: ModifyElementCommand = {
          type: "modifyElement",
          payload: {
            elementId: "/element:person",
            elementName: "employee",
            elementType: "xs:int",
            documentation: "Employee record",
          },
        };

        executeModifyElement(command, schemaObj);

        // Serialize back to XML
        const resultXml = marshal(schemaObj);

        // Parse again to verify it's valid
        const reparsed = unmarshal(schema, resultXml);
        const elements = Array.isArray(reparsed.element)
          ? reparsed.element
          : [reparsed.element];
        expect(elements[0]!.name).toBe("employee");
        expect(elements[0]!.type_).toBe("xs:int");
      });
    });
  });

  describe("Reference element support", () => {
    test("should add a reference element to a sequence", () => {
      const schemaObj = readTestSchema(PERSON_AND_ORDER_TYPE_XSD);

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "/complexType:OrderType/sequence",
          ref: "person",
        },
      };

      executeAddElement(command, schemaObj);

      const complexTypes = Array.isArray(schemaObj.complexType)
        ? schemaObj.complexType
        : [schemaObj.complexType];
      const seqElements = toArray(complexTypes[0]!.sequence!.element);
      expect(seqElements).toHaveLength(1);
      expect(seqElements[0].ref).toBe("person");
      expect(seqElements[0].name).toBeUndefined();
      expect(seqElements[0].type_).toBeUndefined();
    });

    test("should add a reference element with minOccurs/maxOccurs", () => {
      const schemaObj = readTestSchema(PERSON_AND_ORDER_TYPE_XSD);

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "/complexType:OrderType/sequence",
          ref: "person",
          minOccurs: 0,
          maxOccurs: "unbounded",
        },
      };

      executeAddElement(command, schemaObj);

      const complexTypes = Array.isArray(schemaObj.complexType)
        ? schemaObj.complexType
        : [schemaObj.complexType];
      const seqElements = toArray(complexTypes[0]!.sequence!.element);
      expect(seqElements[0].ref).toBe("person");
      expect(seqElements[0].minOccurs).toBe(0);
      expect(seqElements[0].maxOccurs).toBe("unbounded");
    });

    test("should remove a reference element by ref name", () => {
      const schemaObj = schemaWith(ORDER_TYPE_WITH_PERSON_REF);

      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: { elementId: "/complexType:OrderType/sequence/element:person" },
      };

      executeRemoveElement(command, schemaObj);

      const complexTypes = Array.isArray(schemaObj.complexType)
        ? schemaObj.complexType
        : [schemaObj.complexType];
      const seqElements = toArray(complexTypes[0]!.sequence?.element);
      expect(seqElements).toHaveLength(0);
    });

    test("should modify a named element to become a reference", () => {
      const schemaObj = schemaWith(`<xs:element name="person" type="xs:string"/>
<xs:complexType name="OrderType">
  <xs:sequence>
    <xs:element name="item" type="xs:string"/>
  </xs:sequence>
</xs:complexType>`);

      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId: "/complexType:OrderType/sequence/element:item",
          ref: "person",
        },
      };

      executeModifyElement(command, schemaObj);

      const complexTypes = Array.isArray(schemaObj.complexType)
        ? schemaObj.complexType
        : [schemaObj.complexType];
      const seqElements = toArray(complexTypes[0]!.sequence!.element);
      expect(seqElements[0].ref).toBe("person");
      expect(seqElements[0].name).toBeUndefined();
      expect(seqElements[0].type_).toBeUndefined();
    });

    test("should modify a reference element to become named", () => {
      const schemaObj = schemaWith(ORDER_TYPE_WITH_PERSON_REF);

      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId: "/complexType:OrderType/sequence/element:person",
          elementName: "employee",
          elementType: "xs:string",
        },
      };

      executeModifyElement(command, schemaObj);

      const complexTypes = Array.isArray(schemaObj.complexType)
        ? schemaObj.complexType
        : [schemaObj.complexType];
      const seqElements = toArray(complexTypes[0]!.sequence!.element);
      expect(seqElements[0].name).toBe("employee");
      expect(seqElements[0].type_).toBe("xs:string");
      expect((seqElements[0]).ref).toBeUndefined();
    });

    test("should produce valid XML for a reference element", () => {
      const schemaObj = readTestSchema(PERSON_AND_ORDER_TYPE_XSD);

      executeAddElement(
        {
          type: "addElement",
          payload: { parentId: "/complexType:OrderType/sequence", ref: "person" },
        },
        schemaObj
      );

      const xml = marshal(schemaObj);
      expect(xml).toContain('ref="person"');
      expect(xml).not.toContain('name="person" type=');
    });
  });
});
