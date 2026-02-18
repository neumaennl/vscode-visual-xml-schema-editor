/**
 * Unit tests for CommandExecutor.executeModifyElement method.
 * Tests the implementation of the modifyElement command execution logic.
 */

import { unmarshal, marshal } from "@neumaennl/xmlbind-ts";
import { CommandExecutor } from "./commandExecutor";
import { schema, ModifyElementCommand } from "../shared/types";

describe("CommandExecutor - executeModifyElement", () => {
  let executor: CommandExecutor;

  beforeEach(() => {
    executor = new CommandExecutor();
  });

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

      executor.execute(command, schemaObj);

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

      executor.execute(command, schemaObj);

      // Verify the element type was modified
      expect(schemaObj.element).toBeDefined();
      const elements = Array.isArray(schemaObj.element)
        ? schemaObj.element
        : [schemaObj.element];
      expect(elements).toHaveLength(1);
      expect(elements[0]!.name).toBe("person");
      expect(elements[0]!.type_).toBe("xs:int");
    });

    it("should modify multiple properties at once", () => {
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
        },
      };

      executor.execute(command, schemaObj);

      // Verify both properties were modified
      expect(schemaObj.element).toBeDefined();
      const elements = Array.isArray(schemaObj.element)
        ? schemaObj.element
        : [schemaObj.element];
      expect(elements).toHaveLength(1);
      expect(elements[0]!.name).toBe("employee");
      expect(elements[0]!.type_).toBe("xs:int");
    });

    it("should add documentation to element without annotation", () => {
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

      executor.execute(command, schemaObj);

      // Verify documentation was added
      expect(schemaObj.element).toBeDefined();
      const elements = Array.isArray(schemaObj.element)
        ? schemaObj.element
        : [schemaObj.element];
      expect(elements).toHaveLength(1);
      expect(elements[0]!.annotation).toBeDefined();
      expect(elements[0]!.annotation!.documentation).toBeDefined();
      expect(elements[0]!.annotation!.documentation![0].value).toBe("Employee information");
    });

    it("should update existing documentation", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string">
    <xs:annotation>
      <xs:documentation>Old documentation</xs:documentation>
    </xs:annotation>
  </xs:element>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId: "/element:person",
          documentation: "New documentation",
        },
      };

      executor.execute(command, schemaObj);

      // Verify documentation was updated
      expect(schemaObj.element).toBeDefined();
      const elements = Array.isArray(schemaObj.element)
        ? schemaObj.element
        : [schemaObj.element];
      expect(elements).toHaveLength(1);
      expect(elements[0]!.annotation).toBeDefined();
      expect(elements[0]!.annotation!.documentation).toBeDefined();
      expect(elements[0]!.annotation!.documentation![0].value).toBe("New documentation");
    });
  });

  describe("Modifying local elements in sequence", () => {
    it("should modify element name in sequence", () => {
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

      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId: "/element:person/anonymousComplexType[0]/sequence[0]/element:firstName",
          elementName: "givenName",
        },
      };

      executor.execute(command, schemaObj);

      // Verify the element name was modified
      const personElement = Array.isArray(schemaObj.element)
        ? schemaObj.element[0]
        : schemaObj.element;
      const sequence = personElement!.complexType!.sequence;
      const elements = Array.isArray(sequence!.element)
        ? sequence!.element
        : [sequence!.element];
      expect(elements).toHaveLength(2);
      expect(elements[0]!.name).toBe("givenName");
      expect(elements[1]!.name).toBe("lastName");
    });

    it("should modify element type in sequence", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="age" type="xs:string"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId: "/element:person/anonymousComplexType[0]/sequence[0]/element:age",
          elementType: "xs:int",
        },
      };

      executor.execute(command, schemaObj);

      // Verify the element type was modified
      const personElement = Array.isArray(schemaObj.element)
        ? schemaObj.element[0]
        : schemaObj.element;
      const sequence = personElement!.complexType!.sequence;
      const elements = Array.isArray(sequence!.element)
        ? sequence!.element
        : [sequence!.element];
      expect(elements).toHaveLength(1);
      expect(elements[0]!.name).toBe("age");
      expect(elements[0]!.type_).toBe("xs:int");
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

      executor.execute(command, schemaObj);

      // Verify occurrences were modified
      const personElement = Array.isArray(schemaObj.element)
        ? schemaObj.element[0]
        : schemaObj.element;
      const sequence = personElement!.complexType!.sequence;
      const elements = Array.isArray(sequence!.element)
        ? sequence!.element
        : [sequence!.element];
      expect(elements).toHaveLength(1);
      expect(elements[0]!.minOccurs).toBe(0);
      expect(elements[0]!.maxOccurs).toBe("unbounded");
    });

    it("should modify multiple properties including documentation", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="email" type="xs:string"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId: "/element:person/anonymousComplexType[0]/sequence[0]/element:email",
          elementName: "emailAddress",
          elementType: "xs:token",
          minOccurs: 0,
          maxOccurs: 5,
          documentation: "Email address of the person",
        },
      };

      executor.execute(command, schemaObj);

      // Verify all properties were modified
      const personElement = Array.isArray(schemaObj.element)
        ? schemaObj.element[0]
        : schemaObj.element;
      const sequence = personElement!.complexType!.sequence;
      const elements = Array.isArray(sequence!.element)
        ? sequence!.element
        : [sequence!.element];
      expect(elements).toHaveLength(1);
      expect(elements[0]!.name).toBe("emailAddress");
      expect(elements[0]!.type_).toBe("xs:token");
      expect(elements[0]!.minOccurs).toBe(0);
      expect(elements[0]!.maxOccurs).toBe(5);
      expect(elements[0]!.annotation).toBeDefined();
      expect(elements[0]!.annotation!.documentation![0].value).toBe("Email address of the person");
    });
  });

  describe("Modifying elements in choice", () => {
    it("should modify element in choice group", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="contact">
    <xs:complexType>
      <xs:choice>
        <xs:element name="email" type="xs:string"/>
        <xs:element name="phone" type="xs:string"/>
      </xs:choice>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId: "/element:contact/anonymousComplexType[0]/choice[0]/element:email",
          elementType: "xs:token",
          minOccurs: 1,
        },
      };

      executor.execute(command, schemaObj);

      // Verify the element was modified
      const contactElement = Array.isArray(schemaObj.element)
        ? schemaObj.element[0]
        : schemaObj.element;
      const choice = contactElement!.complexType!.choice;
      const elements = Array.isArray(choice!.element)
        ? choice!.element
        : [choice!.element];
      expect(elements).toHaveLength(2);
      expect(elements[0]!.type_).toBe("xs:token");
      expect(elements[0]!.minOccurs).toBe(1);
    });
  });

  describe("Modifying elements in all group", () => {
    it("should modify element in all group with string occurrences", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person">
    <xs:complexType>
      <xs:all>
        <xs:element name="firstName" type="xs:string"/>
        <xs:element name="lastName" type="xs:string"/>
      </xs:all>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId: "/element:person/anonymousComplexType[0]/all[0]/element:firstName",
          elementName: "givenName",
          minOccurs: 0,
          maxOccurs: 1,
        },
      };

      executor.execute(command, schemaObj);

      // Verify the element was modified with string occurrences
      const personElement = Array.isArray(schemaObj.element)
        ? schemaObj.element[0]
        : schemaObj.element;
      const allGroup = personElement!.complexType!.all;
      const elements = Array.isArray(allGroup!.element)
        ? allGroup!.element
        : [allGroup!.element];
      expect(elements).toHaveLength(2);
      expect(elements[0]!.name).toBe("givenName");
      expect(elements[0]!.minOccurs).toBe("0");
      expect(elements[0]!.maxOccurs).toBe("1");
    });
  });

  describe("Error handling", () => {
    it("should throw error when element not found by name", () => {
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

      expect(() => executor.execute(command, schemaObj)).toThrow(
        "Element not found: nonexistent"
      );
    });

    it("should throw error when element not found by position", () => {
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
          elementId: "/element:person/anonymousComplexType[0]/sequence[0]/element[5]",
          elementName: "newName",
        },
      };

      expect(() => executor.execute(command, schemaObj)).toThrow(
        "Element not found"
      );
    });

    it("should throw error when parent not found", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId: "/element:nonexistent/anonymousComplexType[0]/sequence[0]/element:test",
          elementName: "newName",
        },
      };

      expect(() => executor.execute(command, schemaObj)).toThrow(
        "Parent node not found"
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

      executor.execute(command, schemaObj);

      // Serialize back to XML
      const resultXml = marshal(schemaObj);

      // Parse again to verify it's valid
      const reparsed = unmarshal(schema, resultXml);
      const elements = Array.isArray(reparsed.element)
        ? reparsed.element
        : [reparsed.element];
      expect(elements[0]!.name).toBe("employee");
      expect(elements[0]!.type_).toBe("xs:int");
      expect(elements[0]!.annotation).toBeDefined();
      expect(elements[0]!.annotation!.documentation).toBeDefined();
      // Documentation might be a single object or an array after unmarshal
      const documentation = elements[0]!.annotation!.documentation;
      const docs = Array.isArray(documentation)
        ? documentation
        : [documentation];
      expect(docs[0]!.value).toBe("Employee record");
    });

    it("should preserve other elements when modifying one element", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
  <xs:element name="company" type="xs:string"/>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId: "/element:person",
          elementType: "xs:int",
        },
      };

      executor.execute(command, schemaObj);

      // Verify other elements are preserved
      const elements = Array.isArray(schemaObj.element)
        ? schemaObj.element
        : [schemaObj.element];
      expect(elements).toHaveLength(2);
      expect(elements[0]!.name).toBe("person");
      expect(elements[0]!.type_).toBe("xs:int");
      expect(elements[1]!.name).toBe("company");
      expect(elements[1]!.type_).toBe("xs:string");
    });
  });

  describe("Selective property modification", () => {
    it("should only modify name when only name is provided", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="email" type="xs:string" minOccurs="1" maxOccurs="10"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId: "/element:person/anonymousComplexType[0]/sequence[0]/element:email",
          elementName: "emailAddress",
        },
      };

      executor.execute(command, schemaObj);

      // Verify only name was changed
      const personElement = Array.isArray(schemaObj.element)
        ? schemaObj.element[0]
        : schemaObj.element;
      const sequence = personElement!.complexType!.sequence;
      const elements = Array.isArray(sequence!.element)
        ? sequence!.element
        : [sequence!.element];
      expect(elements[0]!.name).toBe("emailAddress");
      expect(elements[0]!.type_).toBe("xs:string");
      // minOccurs and maxOccurs should be unchanged
      // Note: xmlbind-ts may parse numeric attributes as numbers or strings depending on schema
      expect(elements[0]!.minOccurs).toEqual(expect.anything());
      expect([1, "1"]).toContain(elements[0]!.minOccurs);
      expect([10, "10"]).toContain(elements[0]!.maxOccurs);
    });

    it("should only modify occurrences when only occurrences are provided", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="email" type="xs:string" minOccurs="1" maxOccurs="1"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId: "/element:person/anonymousComplexType[0]/sequence[0]/element:email",
          maxOccurs: "unbounded",
        },
      };

      executor.execute(command, schemaObj);

      // Verify only maxOccurs was changed
      const personElement = Array.isArray(schemaObj.element)
        ? schemaObj.element[0]
        : schemaObj.element;
      const sequence = personElement!.complexType!.sequence;
      const elements = Array.isArray(sequence!.element)
        ? sequence!.element
        : [sequence!.element];
      expect(elements[0]!.name).toBe("email");
      expect(elements[0]!.type_).toBe("xs:string");
      // minOccurs should be unchanged
      expect([1, "1"]).toContain(elements[0]!.minOccurs);
      expect(elements[0]!.maxOccurs).toBe("unbounded");
    });
  });
});
