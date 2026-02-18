/**
 * Unit tests for CommandExecutor.executeRemoveElement method.
 * Tests the implementation of the removeElement command execution logic.
 */

import { unmarshal, marshal } from "@neumaennl/xmlbind-ts";
import { CommandExecutor } from "./commandExecutor";
import { schema, RemoveElementCommand } from "../shared/types";
import { toArray } from "../shared/schemaUtils";

describe("CommandExecutor - executeRemoveElement", () => {
  let executor: CommandExecutor;

  beforeEach(() => {
    executor = new CommandExecutor();
  });

  describe("Removing top-level elements", () => {
    it("should remove a single top-level element from schema", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: {
          elementId: "/element:person",
        },
      };

      executor.execute(command, schemaObj);

      // Verify the element was removed
      const elements = toArray(schemaObj.element);
      expect(elements).toHaveLength(0);
    });

    it("should remove one element and preserve others", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
  <xs:element name="company" type="xs:string"/>
  <xs:element name="product" type="xs:string"/>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: {
          elementId: "/element:company",
        },
      };

      executor.execute(command, schemaObj);

      // Verify only the specified element was removed
      const elements = toArray(schemaObj.element);
      expect(elements).toHaveLength(2);
      expect(elements[0].name).toBe("person");
      expect(elements[1].name).toBe("product");
    });

    it("should remove element by position when specified", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="first" type="xs:string"/>
  <xs:element name="second" type="xs:string"/>
  <xs:element name="third" type="xs:string"/>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: {
          elementId: "/element:second",
        },
      };

      executor.execute(command, schemaObj);

      // Verify the element named "second" was removed
      const elements = toArray(schemaObj.element);
      expect(elements).toHaveLength(2);
      expect(elements[0].name).toBe("first");
      expect(elements[1].name).toBe("third");
    });
  });

  describe("Removing elements from sequences", () => {
    it("should remove element from a sequence in a complex type", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="id" type="xs:int"/>
        <xs:element name="name" type="xs:string"/>
        <xs:element name="age" type="xs:int"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: {
          elementId: "/element:person/anonymousComplexType[0]/sequence/element:name",
        },
      };

      executor.execute(command, schemaObj);

      // Verify the element was removed from the sequence
      const personElement = Array.isArray(schemaObj.element)
        ? schemaObj.element[0]
        : schemaObj.element;
      const elements = toArray(personElement?.complexType?.sequence?.element);
      expect(elements).toHaveLength(2);
      expect(elements[0].name).toBe("id");
      expect(elements[1].name).toBe("age");
    });

    it("should remove all elements from a sequence", () => {
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

      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: {
          elementId: "/element:person/anonymousComplexType[0]/sequence/element:name",
        },
      };

      executor.execute(command, schemaObj);

      // Verify all elements were removed
      const personElement = Array.isArray(schemaObj.element)
        ? schemaObj.element[0]
        : schemaObj.element;
      const elements = toArray(personElement?.complexType?.sequence?.element);
      expect(elements).toHaveLength(0);
    });

    it("should remove element by position from sequence", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="id" type="xs:int"/>
        <xs:element name="name" type="xs:string"/>
        <xs:element name="age" type="xs:int"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: {
          elementId: "/element:person/anonymousComplexType[0]/sequence/element:name",
        },
      };

      executor.execute(command, schemaObj);

      // Verify the element named "name" was removed
      const personElement = Array.isArray(schemaObj.element)
        ? schemaObj.element[0]
        : schemaObj.element;
      const elements = toArray(personElement?.complexType?.sequence?.element);
      expect(elements).toHaveLength(2);
      expect(elements[0].name).toBe("id");
      expect(elements[1].name).toBe("age");
    });
  });

  describe("Removing elements from choice groups", () => {
    it("should remove element from a choice in a complex type", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="payment">
    <xs:complexType>
      <xs:choice>
        <xs:element name="creditCard" type="xs:string"/>
        <xs:element name="paypal" type="xs:string"/>
        <xs:element name="bitcoin" type="xs:string"/>
      </xs:choice>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: {
          elementId: "/element:payment/anonymousComplexType[0]/choice/element:paypal",
        },
      };

      executor.execute(command, schemaObj);

      // Verify the element was removed from the choice
      const paymentElement = Array.isArray(schemaObj.element)
        ? schemaObj.element[0]
        : schemaObj.element;
      const elements = toArray(paymentElement?.complexType?.choice?.element);
      expect(elements).toHaveLength(2);
      expect(elements[0].name).toBe("creditCard");
      expect(elements[1].name).toBe("bitcoin");
    });
  });

  describe("Removing elements from all groups", () => {
    it("should remove element from an all group in a complex type", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="config">
    <xs:complexType>
      <xs:all>
        <xs:element name="timeout" type="xs:int"/>
        <xs:element name="retries" type="xs:int"/>
        <xs:element name="host" type="xs:string"/>
      </xs:all>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: {
          elementId: "/element:config/anonymousComplexType[0]/all/element:retries",
        },
      };

      executor.execute(command, schemaObj);

      // Verify the element was removed from the all group
      const configElement = Array.isArray(schemaObj.element)
        ? schemaObj.element[0]
        : schemaObj.element;
      const elements = toArray(configElement?.complexType?.all?.element);
      expect(elements).toHaveLength(2);
      expect(elements[0].name).toBe("timeout");
      expect(elements[1].name).toBe("host");
    });
  });

  describe("Error handling", () => {
    it("should throw error when parent node is not found", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: {
          elementId: "/element:nonexistent/element:child",
        },
      };

      expect(() => {
        executor.execute(command, schemaObj);
      }).toThrow("Parent node not found");
    });

    it("should throw error when element is not found by name", () => {
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

      expect(() => {
        executor.execute(command, schemaObj);
      }).toThrow("Element not found with name: nonexistent");
    });

    it("should throw error when element is not found by position", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: {
          elementId: "/element:person[5]",
        },
      };

      expect(() => {
        executor.execute(command, schemaObj);
      }).toThrow("Element not found at position: 5");
    });

    it("should throw error when trying to remove from unsupported parent type", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:simpleType name="myType">
    <xs:restriction base="xs:string"/>
  </xs:simpleType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: {
          elementId: "/simpleType:myType/element:test",
        },
      };

      expect(() => {
        executor.execute(command, schemaObj);
      }).toThrow("Cannot remove element from parent of type");
    });
  });

  describe("XML marshalling", () => {
    it("should marshal to XML after removing element", () => {
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

      executor.execute(command, schemaObj);

      // Marshal to XML
      const resultXml = marshal(schemaObj);

      // Verify the removed element is gone and the other remains
      expect(resultXml).not.toContain('name="person"');
      expect(resultXml).toContain('name="company"');
    });

    it("should marshal to XML when removing from nested structure", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="id" type="xs:int"/>
        <xs:element name="name" type="xs:string"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: {
          elementId: "/element:person/anonymousComplexType[0]/sequence/element:id",
        },
      };

      executor.execute(command, schemaObj);

      // Marshal to XML
      const resultXml = marshal(schemaObj);

      // Verify the sequence structure remains and correct elements are present/absent
      expect(resultXml).toContain('<sequence');
      expect(resultXml).toContain('name="name"');
      expect(resultXml).not.toContain('name="id"');
    });

    it("should marshal to XML when removing all elements", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: {
          elementId: "/element:person",
        },
      };

      executor.execute(command, schemaObj);

      // Marshal to XML
      const resultXml = marshal(schemaObj);

      // Verify the schema tag remains but has no element children
      expect(resultXml).toContain('<schema');
      expect(resultXml).not.toContain('<element');
    });
  });

  describe("Edge cases", () => {
    it("should handle removing from empty schema gracefully", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: {
          elementId: "/element:nonexistent",
        },
      };

      expect(() => {
        executor.execute(command, schemaObj);
      }).toThrow("Element not found");
    });

    it("should preserve element with documentation when removing others", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string">
    <xs:annotation>
      <xs:documentation>A person element</xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="company" type="xs:string"/>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: {
          elementId: "/element:company",
        },
      };

      executor.execute(command, schemaObj);

      // Verify the element with documentation is preserved
      const elements = toArray(schemaObj.element);
      expect(elements).toHaveLength(1);
      expect(elements[0].name).toBe("person");
      expect(elements[0].annotation).toBeDefined();
    });

    it("should remove element by name from sequence", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="firstName" type="xs:string"/>
        <xs:element name="lastName" type="xs:string"/>
        <xs:element name="age" type="xs:int"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: {
          elementId: "/element:person/anonymousComplexType[0]/sequence/element:firstName",
        },
      };

      executor.execute(command, schemaObj);

      // Verify the element named "firstName" was removed
      const personElement = Array.isArray(schemaObj.element)
        ? schemaObj.element[0]
        : schemaObj.element;
      const elements = toArray(personElement?.complexType?.sequence?.element);
      expect(elements).toHaveLength(2);
      expect(elements[0].name).toBe("lastName");
      expect(elements[1].name).toBe("age");
    });
  });
});
