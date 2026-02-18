/**
 * Unit tests for CommandExecutor.executeAddElement method.
 * Tests the implementation of the addElement command execution logic.
 */

import { unmarshal, marshal } from "@neumaennl/xmlbind-ts";
import { CommandExecutor } from "./commandExecutor";
import { schema, AddElementCommand } from "../shared/types";

describe("CommandExecutor - executeAddElement", () => {
  let executor: CommandExecutor;

  beforeEach(() => {
    executor = new CommandExecutor();
  });

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

      executor.execute(command, schemaObj);

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

      executor.execute(command1, schemaObj);
      executor.execute(command2, schemaObj);

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

      executor.execute(command, schemaObj);

      // Verify the element was added with documentation
      const elements = Array.isArray(schemaObj.element)
        ? schemaObj.element
        : [schemaObj.element];
      expect(elements[0]!.annotation).toBeDefined();
      expect(elements[0]!.annotation?.documentation).toBeDefined();
      const docs = Array.isArray(elements[0]!.annotation!.documentation)
        ? elements[0]!.annotation!.documentation
        : [elements[0]!.annotation!.documentation];
      expect(docs[0]!.value).toBe("Represents a person");
    });
  });

  describe("Adding elements to sequences", () => {
    it("should add element to a sequence in a complex type", () => {
      const schemaWithSequenceXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person">
    <xs:complexType>
      <xs:sequence>
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
          minOccurs: 1,
          maxOccurs: 1,
        },
      };

      executor.execute(command, schemaObj);

      // Verify the element was added to the sequence
      const personElement = Array.isArray(schemaObj.element)
        ? schemaObj.element[0]
        : schemaObj.element;
      expect(personElement?.complexType?.sequence?.element).toBeDefined();
      const elements = Array.isArray(personElement?.complexType?.sequence?.element)
        ? personElement?.complexType?.sequence?.element
        : [personElement?.complexType?.sequence?.element];
      expect(elements).toHaveLength(1);
      expect(elements[0]!.name).toBe("name");
      expect(elements[0]!.type_).toBe("string");
      expect(elements[0]!.minOccurs).toBe(1);
      expect(elements[0]!.maxOccurs).toBe(1);
    });

    it("should add element with unbounded maxOccurs to a sequence", () => {
      const schemaWithSequenceXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person">
    <xs:complexType>
      <xs:sequence>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaWithSequenceXml);

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "/element:person/anonymousComplexType[0]/sequence",
          elementName: "hobby",
          elementType: "string",
          minOccurs: 0,
          maxOccurs: "unbounded",
        },
      };

      executor.execute(command, schemaObj);

      // Verify the element was added with unbounded
      const personElement = Array.isArray(schemaObj.element)
        ? schemaObj.element[0]
        : schemaObj.element;
      const elements = Array.isArray(personElement?.complexType?.sequence?.element)
        ? personElement?.complexType?.sequence?.element
        : [personElement?.complexType?.sequence?.element];
      expect(elements[0]!.maxOccurs).toBe("unbounded");
    });

    it("should add multiple elements to a sequence", () => {
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

      const command1: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "/element:person/anonymousComplexType[0]/sequence",
          elementName: "name",
          elementType: "string",
        },
      };

      const command2: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "/element:person/anonymousComplexType[0]/sequence",
          elementName: "age",
          elementType: "int",
        },
      };

      executor.execute(command1, schemaObj);
      executor.execute(command2, schemaObj);

      // Verify both elements were added
      const personElement = Array.isArray(schemaObj.element)
        ? schemaObj.element[0]
        : schemaObj.element;
      const elements = Array.isArray(personElement?.complexType?.sequence?.element)
        ? personElement?.complexType?.sequence?.element
        : [personElement?.complexType?.sequence?.element];
      expect(elements).toHaveLength(3); // id + name + age
      expect(elements[1]!.name).toBe("name");
      expect(elements[2]!.name).toBe("age");
    });
  });

  describe("Adding elements to choice groups", () => {
    it("should add element to a choice in a complex type", () => {
      const schemaWithChoiceXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="payment">
    <xs:complexType>
      <xs:choice>
      </xs:choice>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaWithChoiceXml);

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "/element:payment/anonymousComplexType[0]/choice",
          elementName: "creditCard",
          elementType: "string",
        },
      };

      executor.execute(command, schemaObj);

      // Verify the element was added to the choice
      const paymentElement = Array.isArray(schemaObj.element)
        ? schemaObj.element[0]
        : schemaObj.element;
      expect(paymentElement?.complexType?.choice?.element).toBeDefined();
      const elements = Array.isArray(paymentElement?.complexType?.choice?.element)
        ? paymentElement?.complexType?.choice?.element
        : [paymentElement?.complexType?.choice?.element];
      expect(elements).toHaveLength(1);
      expect(elements[0]!.name).toBe("creditCard");
    });
  });

  describe("Adding elements to all groups", () => {
    it("should add element to an all group in a complex type", () => {
      const schemaWithAllXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="config">
    <xs:complexType>
      <xs:all>
      </xs:all>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaWithAllXml);

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "/element:config/anonymousComplexType[0]/all",
          elementName: "timeout",
          elementType: "int",
        },
      };

      executor.execute(command, schemaObj);

      // Verify the element was added to the all group
      const configElement = Array.isArray(schemaObj.element)
        ? schemaObj.element[0]
        : schemaObj.element;
      expect(configElement?.complexType?.all?.element).toBeDefined();
      const elements = Array.isArray(configElement?.complexType?.all?.element)
        ? configElement?.complexType?.all?.element
        : [configElement?.complexType?.all?.element];
      expect(elements).toHaveLength(1);
      expect(elements[0]!.name).toBe("timeout");
    });
  });

  describe("Error handling", () => {
    it("should throw error when parent node is not found", () => {
      const simpleSchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, simpleSchemaXml);

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "/element:nonexistent",
          elementName: "test",
          elementType: "string",
        },
      };

      expect(() => {
        executor.execute(command, schemaObj);
      }).toThrow("Parent node not found");
    });

    it("should throw error when parent type is invalid", () => {
      const simpleSchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:simpleType name="myType">
    <xs:restriction base="xs:string"/>
  </xs:simpleType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, simpleSchemaXml);

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "/simpleType:myType",
          elementName: "test",
          elementType: "string",
        },
      };

      expect(() => {
        executor.execute(command, schemaObj);
      }).toThrow("Cannot add element to parent of type");
    });

    it("should reject adding duplicate element names in same sequence", () => {
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

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "/element:person/anonymousComplexType[0]/sequence",
          elementName: "firstName",
          elementType: "xs:int",
        },
      };

      // This should fail because duplicate element names are not allowed in XSD
      expect(() => {
        executor.execute(command, schemaObj);
      }).toThrow("duplicate");
    });
  });

  describe("XML marshalling", () => {
    it("should produce valid XML after adding element", () => {
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

      executor.execute(command, schemaObj);

      // Marshal to XML
      const resultXml = marshal(schemaObj);

      // Verify the XML is valid and contains the element
      expect(resultXml).toContain('<element');
      expect(resultXml).toContain('name="person"');
      expect(resultXml).toContain('type="string"');
    });

    it("should produce valid XML with documentation", () => {
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
          documentation: "A person element",
        },
      };

      executor.execute(command, schemaObj);

      // Marshal to XML
      const resultXml = marshal(schemaObj);

      // Verify the XML contains documentation
      expect(resultXml).toContain('<annotation');
      expect(resultXml).toContain('<documentation');
      expect(resultXml).toContain('A person element');
    });
  });
});
