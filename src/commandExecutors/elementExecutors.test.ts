/**
 * Unit tests for element executors.
 * Tests the implementation of add, remove, and modify element execution logic.
 */

import { unmarshal, marshal } from "@neumaennl/xmlbind-ts";
import { schema, AddElementCommand, RemoveElementCommand, ModifyElementCommand } from "../../shared/types";
import {
  executeAddElement,
  executeRemoveElement,
  executeModifyElement,
} from "./elementExecutors";
import { toArray } from "../../shared/schemaUtils";

describe("Element Executors", () => {
  describe("executeAddElement", () => {
    describe("Adding top-level elements", () => {
      it("should add a simple top-level element to schema", () => {
        const simpleSchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
        const schemaObj = unmarshal(schema, simpleSchemaXml);

        const command: AddElementCommand = {
          type: "addElement",
          payload: {
            parentId: "schema",
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

      it("should add multiple top-level elements to schema", () => {
        const simpleSchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
        const schemaObj = unmarshal(schema, simpleSchemaXml);

        const command1: AddElementCommand = {
          type: "addElement",
          payload: {
            parentId: "schema",
            elementName: "person",
            elementType: "string",
          },
        };

        const command2: AddElementCommand = {
          type: "addElement",
          payload: {
            parentId: "schema",
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

      it("should add top-level element with documentation", () => {
        const simpleSchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
        const schemaObj = unmarshal(schema, simpleSchemaXml);

        const command: AddElementCommand = {
          type: "addElement",
          payload: {
            parentId: "schema",
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

      it("should reject duplicate element names in schema", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: AddElementCommand = {
          type: "addElement",
          payload: {
            parentId: "schema",
            elementName: "person",
            elementType: "string",
          },
        };

        expect(() => executeAddElement(command, schemaObj)).toThrow(
          "Cannot add element: duplicate element name 'person' in schema"
        );
      });
    });

    describe("Adding elements to sequence", () => {
      it("should add element to a sequence in a complex type", () => {
        const schemaWithSequenceXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="id" type="xs:int"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaWithSequenceXml);

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
    });
  });

  describe("executeRemoveElement", () => {
    it("should remove top-level element by name", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
  <xs:element name="company" type="xs:string"/>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

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

    it("should remove element from sequence", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="firstName" type="xs:string"/>
        <xs:element name="lastName" type="xs:string"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

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

    it("should throw error when element not found", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: {
          elementId: "/element:nonexistent",
        },
      };

      expect(() => executeRemoveElement(command, schemaObj)).toThrow(
        "Element not found with name: nonexistent"
      );
    });
  });

  describe("executeModifyElement", () => {
    describe("Modifying top-level elements", () => {
      it("should modify element name", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

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

      it("should modify element type", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

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

      it("should add documentation to element", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

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
      it("should modify element in sequence", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="firstName" type="xs:string"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

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

      it("should modify minOccurs and maxOccurs", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="phone" type="xs:string" minOccurs="1" maxOccurs="1"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

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

    describe("Error handling", () => {
      it("should throw error when element not found", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: ModifyElementCommand = {
          type: "modifyElement",
          payload: {
            elementId: "/element:nonexistent",
            elementName: "newName",
          },
        };

        expect(() => executeModifyElement(command, schemaObj)).toThrow(
          "Element not found: nonexistent"
        );
      });
    });

    describe("Round-trip XML serialization", () => {
      it("should produce valid XML after modifying element", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

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
    const baseXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
  <xs:complexType name="OrderType">
    <xs:sequence/>
  </xs:complexType>
</xs:schema>`;

    it("should add a reference element to a sequence", () => {
      const schemaObj = unmarshal(schema, baseXml);

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

    it("should add a reference element with minOccurs/maxOccurs", () => {
      const schemaObj = unmarshal(schema, baseXml);

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

    it("should reject duplicate reference in sequence", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
  <xs:complexType name="OrderType">
    <xs:sequence>
      <xs:element ref="person"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, xml);

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "/complexType:OrderType/sequence",
          ref: "person",
        },
      };

      expect(() => executeAddElement(command, schemaObj)).toThrow(
        "duplicate element reference 'person'"
      );
    });

    it("should reject adding a ref element when a named element with the same identifier exists", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
  <xs:complexType name="OrderType">
    <xs:sequence>
      <xs:element name="person" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, xml);

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "/complexType:OrderType/sequence",
          ref: "person",
        },
      };

      expect(() => executeAddElement(command, schemaObj)).toThrow(
        "duplicate element reference 'person'"
      );
    });

    it("should reject adding a named element when a ref element with the same identifier exists", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
  <xs:complexType name="OrderType">
    <xs:sequence>
      <xs:element ref="person"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, xml);

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "/complexType:OrderType/sequence",
          elementName: "person",
          elementType: "xs:string",
        },
      };

      expect(() => executeAddElement(command, schemaObj)).toThrow(
        "duplicate element name 'person'"
      );
    });

    it("should remove a reference element by ref name", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
  <xs:complexType name="OrderType">
    <xs:sequence>
      <xs:element ref="person"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, xml);

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

    it("should modify a named element to become a reference", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
  <xs:complexType name="OrderType">
    <xs:sequence>
      <xs:element name="item" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, xml);

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

    it("should modify a reference element to become named", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
  <xs:complexType name="OrderType">
    <xs:sequence>
      <xs:element ref="person"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, xml);

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

    it("should produce valid XML for a reference element", () => {
      const schemaObj = unmarshal(schema, baseXml);

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
