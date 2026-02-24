/**
 * Unit tests for element and attribute validators.
 */

import { unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../../shared/types";
import {
  AddElementCommand,
  RemoveElementCommand,
  ModifyElementCommand,
  AddAttributeCommand,
  RemoveAttributeCommand,
  ModifyAttributeCommand,
} from "../../shared/types";
import {
  validateAddElement,
  validateRemoveElement,
  validateModifyElement,
  validateAddAttribute,
  validateRemoveAttribute,
  validateModifyAttribute,
} from "./elementValidators";

describe("Element Validators", () => {
  let schemaObj: schema;

  beforeEach(() => {
    const simpleSchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
</xs:schema>`;
    schemaObj = unmarshal(schema, simpleSchemaXml);
  });

  describe("validateAddElement", () => {
    test("should validate addElement command with valid payload", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "testElement",
          elementType: "string",
        },
      };

      const result = validateAddElement(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("should accept built-in XSD types with xs: prefix", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "testElement",
          elementType: "xs:string",
        },
      };

      const result = validateAddElement(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("should accept built-in XSD types with xsd: prefix", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "testElement",
          elementType: "xsd:string",
        },
      };

      const result = validateAddElement(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("should accept built-in XSD types with any custom prefix", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "testElement",
          elementType: "myprefix:int",
        },
      };

      const result = validateAddElement(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("should accept built-in XSD types without prefix", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "testElement",
          elementType: "int",
        },
      };

      const result = validateAddElement(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("should reject invalid element type", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "testElement",
          elementType: "invalidType",
        },
      };

      const result = validateAddElement(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid element type");
      expect(result.error).toContain("invalidType");
    });

    test("should reject prefixed type when no imports or includes exist", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "testElement",
          elementType: "unknown:SomeType",
        },
      };

      const result = validateAddElement(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid element type");
      expect(result.error).toContain("unknown:SomeType");
    });

    test("should accept user-defined complex type", () => {
      const schemaWithTypes = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="PersonType">
    <xs:sequence>
      <xs:element name="name" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;
      const customSchema = unmarshal(schema, schemaWithTypes);

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "person",
          elementType: "PersonType",
        },
      };

      const result = validateAddElement(command, customSchema);
      expect(result.valid).toBe(true);
    });

    test("should accept user-defined simple type", () => {
      const schemaWithTypes = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:simpleType name="AgeType">
    <xs:restriction base="xs:integer">
      <xs:minInclusive value="0"/>
      <xs:maxInclusive value="120"/>
    </xs:restriction>
  </xs:simpleType>
</xs:schema>`;
      const customSchema = unmarshal(schema, schemaWithTypes);

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "age",
          elementType: "AgeType",
        },
      };

      const result = validateAddElement(command, customSchema);
      expect(result.valid).toBe(true);
    });

    test("should accept user-defined type with prefix", () => {
      const schemaWithTypes = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           xmlns:tns="http://example.com/types">
  <xs:complexType name="PersonType">
    <xs:sequence>
      <xs:element name="name" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;
      const customSchema = unmarshal(schema, schemaWithTypes);

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "person",
          elementType: "tns:PersonType",
        },
      };

      const result = validateAddElement(command, customSchema);
      expect(result.valid).toBe(true);
    });

    test("should accept type from import", () => {
      const schemaWithImport = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" 
           xmlns:ext="http://example.com/external">
  <xs:import namespace="http://example.com/external" schemaLocation="external.xsd"/>
</xs:schema>`;
      const customSchema = unmarshal(schema, schemaWithImport);

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "externalElement",
          elementType: "ext:ExternalType",
        },
      };

      const result = validateAddElement(command, customSchema);
      expect(result.valid).toBe(true);
    });

    test("should accept type from include (unprefixed, same namespace)", () => {
      const schemaWithInclude = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:include schemaLocation="included.xsd"/>
  <xs:simpleType name="IncludedType">
    <xs:restriction base="xs:string"/>
  </xs:simpleType>
</xs:schema>`;
      const customSchema = unmarshal(schema, schemaWithInclude);

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "includedElement",
          elementType: "IncludedType",
        },
      };

      const result = validateAddElement(command, customSchema);
      expect(result.valid).toBe(true);
    });

    test("should reject type with prefix that doesn't match any import namespace", () => {
      const schemaWithImport = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" 
           xmlns:ext="http://example.com/external">
  <xs:import namespace="http://example.com/external" schemaLocation="external.xsd"/>
</xs:schema>`;
      const customSchema = unmarshal(schema, schemaWithImport);

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "testElement",
          elementType: "wrongprefix:SomeType",
        },
      };

      const result = validateAddElement(command, customSchema);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid element type");
      expect(result.error).toContain("wrongprefix:SomeType");
    });

    test("should accept user-defined type with target namespace prefix", () => {
      const schemaWithTargetNs = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" 
           xmlns:tns="http://example.com/mytarget"
           targetNamespace="http://example.com/mytarget">
  <xs:complexType name="MyType">
    <xs:sequence>
      <xs:element name="field" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;
      const customSchema = unmarshal(schema, schemaWithTargetNs);

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "myElement",
          elementType: "tns:MyType",
        },
      };

      const result = validateAddElement(command, customSchema);
      expect(result.valid).toBe(true);
    });

    test("should reject addElement with missing elementName", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "",
          elementType: "string",
        },
      };

      const result = validateAddElement(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Element name must be a valid XML name");
    });

    test("should reject addElement with missing elementType", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "test",
          elementType: "",
        },
      };

      const result = validateAddElement(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Element type is required");
    });

    test("should reject addElement with missing parentId", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "",
          elementName: "test",
          elementType: "string",
        },
      };

      const result = validateAddElement(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Parent ID cannot be empty");
    });
  });

  describe("validateRemoveElement", () => {
    test("should reject removeElement with missing elementId", () => {
      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: {
          elementId: "",
        },
      };

      const result = validateRemoveElement(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Element ID cannot be empty");
    });
  });

  describe("validateModifyElement", () => {
    test("should reject modifyElement with missing elementId", () => {
      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId: "",
          elementName: "newName",
        },
      };

      const result = validateModifyElement(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Element ID cannot be empty");
    });

    test("should reject modifyElement with invalid elementName", () => {
      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId: "/element:person",
          elementName: "123invalid",
        },
      };

      const result = validateModifyElement(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Element name must be a valid XML name");
    });

    test("should reject modifyElement with invalid elementType", () => {
      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId: "/element:person",
          elementType: "invalidType",
        },
      };

      const result = validateModifyElement(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid element type");
      expect(result.error).toContain("invalidType");
    });

    test("should accept modifyElement with valid built-in type", () => {
      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId: "/element:person",
          elementType: "xs:int",
        },
      };

      const result = validateModifyElement(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("should accept modifyElement with user-defined type", () => {
      const schemaWithTypes = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
  <xs:complexType name="PersonType">
    <xs:sequence>
      <xs:element name="name" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;
      const customSchema = unmarshal(schema, schemaWithTypes);

      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId: "/element:person",
          elementType: "PersonType",
        },
      };

      const result = validateModifyElement(command, customSchema);
      expect(result.valid).toBe(true);
    });

    test("should accept modifyElement with valid minOccurs and maxOccurs", () => {
      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId: "/element:person",
          minOccurs: 1,
          maxOccurs: 10,
        },
      };

      const result = validateModifyElement(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("should reject modifyElement with minOccurs > maxOccurs", () => {
      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId: "/element:person",
          minOccurs: 10,
          maxOccurs: 5,
        },
      };

      const result = validateModifyElement(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("minOccurs must be <= maxOccurs");
    });
  });

  describe("Reference element validation", () => {
    let seqSchema: schema;

    beforeEach(() => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
  <xs:complexType name="OrderType">
    <xs:sequence/>
  </xs:complexType>
</xs:schema>`;
      seqSchema = unmarshal(schema, xml);
    });

    test("should accept addElement with valid ref to sequence", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: { parentId: "/complexType:OrderType/sequence", ref: "person" },
      };
      expect(validateAddElement(command, seqSchema).valid).toBe(true);
    });

    test("should reject addElement with ref at schema level (top-level elements cannot be refs)", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: { parentId: "schema", ref: "person" },
      };
      const result = validateAddElement(command, seqSchema);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Top-level elements cannot be references");
    });

    test("should reject addElement with ref and elementName together", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "/complexType:OrderType/sequence",
          ref: "person",
          elementName: "person",
        },
      };
      const result = validateAddElement(command, seqSchema);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("A reference element cannot have a name or type");
    });

    test("should reject addElement with invalid ref name", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "/complexType:OrderType/sequence",
          ref: "123invalid",
        },
      };
      const result = validateAddElement(command, seqSchema);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Element ref must be a valid XML name");
    });

    test("should reject modifyElement with ref and elementName together", () => {
      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId: "/element:person",
          ref: "other",
          elementName: "person",
        },
      };
      const result = validateModifyElement(command, seqSchema);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Cannot set both ref and name/type on an element");
    });

    test("should reject addElement with ref that does not exist in schema", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: { parentId: "/complexType:OrderType/sequence", ref: "nonexistent" },
      };
      const result = validateAddElement(command, seqSchema);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Referenced element 'nonexistent' does not exist in schema");
    });

    test("should reject modifyElement with ref that does not exist in schema", () => {
      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: { elementId: "/element:person", ref: "nonexistent" },
      };
      const result = validateModifyElement(command, seqSchema);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Referenced element 'nonexistent' does not exist in schema");
    });
  });
});

describe("Attribute Validators", () => {
  let schemaObj: schema;

  beforeEach(() => {
    const simpleSchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
    schemaObj = unmarshal(schema, simpleSchemaXml);
  });

  describe("validateAddAttribute", () => {
    test("should reject addAttribute with missing attributeName", () => {
      const command: AddAttributeCommand = {
        type: "addAttribute",
        payload: {
          parentId: "element-1",
          attributeName: "",
          attributeType: "string",
        },
      };

      const result = validateAddAttribute(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Attribute name must be a valid XML name");
    });

    test("should reject addAttribute with missing parentId", () => {
      const command: AddAttributeCommand = {
        type: "addAttribute",
        payload: {
          parentId: "",
          attributeName: "testAttr",
          attributeType: "string",
        },
      };

      const result = validateAddAttribute(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Parent ID cannot be empty");
    });

    test("should reject addAttribute with both defaultValue and fixedValue", () => {
      const command: AddAttributeCommand = {
        type: "addAttribute",
        payload: {
          parentId: "schema",
          attributeName: "lang",
          attributeType: "xs:string",
          defaultValue: "en",
          fixedValue: "en",
        },
      };

      const result = validateAddAttribute(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        "An attribute cannot have both a default value and a fixed value"
      );
    });
  });

  describe("validateRemoveAttribute", () => {
    test("should reject removeAttribute with missing attributeId", () => {
      const command: RemoveAttributeCommand = {
        type: "removeAttribute",
        payload: {
          attributeId: "",
        },
      };

      const result = validateRemoveAttribute(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Attribute ID cannot be empty");
    });
  });

  describe("validateModifyAttribute", () => {
    test("should reject modifyAttribute with missing attributeId", () => {
      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: {
          attributeId: "",
        },
      };

      const result = validateModifyAttribute(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Attribute ID cannot be empty");
    });

    test("should accept modifyAttribute with valid payload", () => {
      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: {
          attributeId: "/attribute:attr1",
          attributeName: "validName",
          attributeType: "string",
        },
      };

      const result = validateModifyAttribute(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("should reject modifyAttribute with both defaultValue and fixedValue", () => {
      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: {
          attributeId: "/attribute:attr1",
          defaultValue: "en",
          fixedValue: "en",
        },
      };

      const result = validateModifyAttribute(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        "An attribute cannot have both a default value and a fixed value"
      );
    });
  });

  describe("Reference attribute validation", () => {
    let refSchema: schema;

    beforeEach(() => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attribute name="lang" type="xs:string"/>
  <xs:complexType name="PersonType"/>
</xs:schema>`;
      refSchema = unmarshal(schema, xml);
    });

    test("should accept addAttribute with valid ref to complex type", () => {
      const command: AddAttributeCommand = {
        type: "addAttribute",
        payload: { parentId: "/complexType:PersonType", ref: "lang" },
      };
      expect(validateAddAttribute(command, refSchema).valid).toBe(true);
    });

    test("should reject addAttribute with ref at schema level", () => {
      const command: AddAttributeCommand = {
        type: "addAttribute",
        payload: { parentId: "schema", ref: "lang" },
      };
      const result = validateAddAttribute(command, refSchema);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Top-level attributes cannot be references");
    });

    test("should reject addAttribute with ref and attributeName together", () => {
      const command: AddAttributeCommand = {
        type: "addAttribute",
        payload: {
          parentId: "/complexType:PersonType",
          ref: "lang",
          attributeName: "lang",
        },
      };
      const result = validateAddAttribute(command, refSchema);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("A reference attribute cannot have a name or type");
    });

    test("should reject addAttribute with ref and defaultValue together", () => {
      const command: AddAttributeCommand = {
        type: "addAttribute",
        payload: {
          parentId: "/complexType:PersonType",
          ref: "lang",
          defaultValue: "en",
        },
      };
      const result = validateAddAttribute(command, refSchema);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        "A reference attribute cannot have a default or fixed value"
      );
    });

    test("should reject addAttribute with invalid ref name", () => {
      const command: AddAttributeCommand = {
        type: "addAttribute",
        payload: { parentId: "/complexType:PersonType", ref: "123invalid" },
      };
      const result = validateAddAttribute(command, refSchema);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Attribute ref must be a valid XML name");
    });

    test("should reject modifyAttribute with ref and attributeName together", () => {
      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: {
          attributeId: "/complexType:PersonType/attribute:lang",
          ref: "lang",
          attributeName: "other",
        },
      };
      const result = validateModifyAttribute(command, refSchema);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Cannot set both ref and name/type on an attribute");
    });

    test("should reject modifyAttribute with ref and fixedValue together", () => {
      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: {
          attributeId: "/complexType:PersonType/attribute:lang",
          ref: "lang",
          fixedValue: "en",
        },
      };
      const result = validateModifyAttribute(command, refSchema);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        "A reference attribute cannot have a default or fixed value"
      );
    });

    test("should reject addAttribute with ref that does not exist in schema", () => {
      const command: AddAttributeCommand = {
        type: "addAttribute",
        payload: { parentId: "/complexType:PersonType", ref: "nonexistent" },
      };
      const result = validateAddAttribute(command, refSchema);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Referenced attribute 'nonexistent' does not exist in schema");
    });

    test("should reject modifyAttribute with ref that does not exist in schema", () => {
      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: {
          attributeId: "/complexType:PersonType/attribute:lang",
          ref: "nonexistent",
        },
      };
      const result = validateModifyAttribute(command, refSchema);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Referenced attribute 'nonexistent' does not exist in schema");
    });
  });
});
