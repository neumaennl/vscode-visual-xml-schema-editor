/**
 * Unit tests for element and attribute validators.
 */

import { unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../../shared/types.js";
import {
  AddElementCommand,
  RemoveElementCommand,
  ModifyElementCommand,
  AddAttributeCommand,
  RemoveAttributeCommand,
  ModifyAttributeCommand,
} from "../../shared/types.js";
import {
  validateAddElement,
  validateRemoveElement,
  validateModifyElement,
  validateAddAttribute,
  validateRemoveAttribute,
  validateModifyAttribute,
} from "./elementValidators.js";
import { expectInvalid } from "../__tests__/validationTestHelpers.js";
import { schemaWith } from "../__tests__/schemaTestHelpers.js";

/** A top-level element `root` and a complexType `T` whose sequence holds two local elements and a reference to `root`. */
const SEQUENCE_WITH_ELEMENTS = `<xs:element name="root" type="xs:string"/>
  <xs:complexType name="T">
    <xs:sequence>
      <xs:element name="first" type="xs:string"/>
      <xs:element name="second" type="xs:string"/>
      <xs:element ref="root"/>
    </xs:sequence>
  </xs:complexType>`;

/** A top-level attribute `lang` and a complexType `T` with a local attribute `code` and a reference to `lang`. */
const ATTRIBUTES = `<xs:attribute name="lang" type="xs:string"/>
  <xs:complexType name="T">
    <xs:attribute name="code" type="xs:string"/>
    <xs:attribute ref="lang"/>
  </xs:complexType>
  <xs:element name="root" type="xs:string"/>`;

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
          parentId: "/schema",
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
          parentId: "/schema",
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
          parentId: "/schema",
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
          parentId: "/schema",
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
          parentId: "/schema",
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
          parentId: "/schema",
          elementName: "testElement",
          elementType: "invalidType",
        },
      };

      const result = validateAddElement(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("Invalid element type");
      expect(result.error).toContain("invalidType");
    });

    test("should reject prefixed type when no imports or includes exist", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "/schema",
          elementName: "testElement",
          elementType: "unknown:SomeType",
        },
      };

      const result = validateAddElement(command, schemaObj);
      expectInvalid(result);
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
          parentId: "/schema",
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
          parentId: "/schema",
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
          parentId: "/schema",
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
          parentId: "/schema",
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
          parentId: "/schema",
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
          parentId: "/schema",
          elementName: "testElement",
          elementType: "wrongprefix:SomeType",
        },
      };

      const result = validateAddElement(command, customSchema);
      expectInvalid(result);
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
          parentId: "/schema",
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
          parentId: "/schema",
          elementName: "",
          elementType: "string",
        },
      };

      const result = validateAddElement(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Element name must be a valid XML name");
    });

    test("should reject addElement with missing elementType", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "/schema",
          elementName: "test",
          elementType: "",
        },
      };

      const result = validateAddElement(command, schemaObj);
      expectInvalid(result);
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
      expectInvalid(result);
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
      expectInvalid(result);
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
      expectInvalid(result);
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
      expectInvalid(result);
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
      expectInvalid(result);
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

    test("should reject stale top-level rename replay after a successful rename", () => {
      const renamedSchema = unmarshal(
        schema,
        `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="personRenamed" type="xs:string"/>
</xs:schema>`
      );

      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId: "/element:person",
          elementName: "personRenamed",
        },
      };

      const result = validateModifyElement(command, renamedSchema);
      expectInvalid(result);
      expect(result.error).toBe("Element not found: person");
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
      expectInvalid(result);
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

    test("should accept addElement for sequence in complexContent extension using group path", () => {
      const extensionSchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
  <xs:complexType name="WorkerType">
    <xs:complexContent>
      <xs:extension base="PersonType">
        <xs:sequence/>
      </xs:extension>
    </xs:complexContent>
  </xs:complexType>
</xs:schema>`;
      const extensionSchema = unmarshal(schema, extensionSchemaXml);

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "/complexType:WorkerType/group:sequence[0]",
          elementName: "department",
          elementType: "xs:string",
        },
      };

      expect(validateAddElement(command, extensionSchema).valid).toBe(true);
    });

    test("should reject addElement with ref at schema level (top-level elements cannot be refs)", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: { parentId: "/schema", ref: "person" },
      };
      const result = validateAddElement(command, seqSchema);
      expectInvalid(result);
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
      expectInvalid(result);
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
      expectInvalid(result);
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
      expectInvalid(result);
      expect(result.error).toBe("Cannot set both ref and name/type on an element");
    });

    test("should reject addElement with ref that does not exist in schema", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: { parentId: "/complexType:OrderType/sequence", ref: "nonexistent" },
      };
      const result = validateAddElement(command, seqSchema);
      expectInvalid(result);
      expect(result.error).toBe("Referenced element 'nonexistent' does not exist in schema");
    });

    test("should reject modifyElement with ref that does not exist in schema", () => {
      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: { elementId: "/element:person", ref: "nonexistent" },
      };
      const result = validateModifyElement(command, seqSchema);
      expectInvalid(result);
      expect(result.error).toBe("Referenced element 'nonexistent' does not exist in schema");
    });
  });
  describe("parents and positions of elements", () => {
    test("should accept adding an element to an all", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: { parentId: "/complexType:T/all", elementName: "third", elementType: "xs:string" },
      };

      const result = validateAddElement(command, schemaWith(`<xs:complexType name="T"><xs:all/></xs:complexType>`));
      expect(result.valid).toBe(true);
    });

    test("should reject an element name that already exists in the all", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: { parentId: "/complexType:T/all", elementName: "first", elementType: "xs:string" },
      };

      const result = validateAddElement(
        command,
        schemaWith(`<xs:complexType name="T"><xs:all><xs:element name="first" type="xs:string"/></xs:all></xs:complexType>`),
      );
      expectInvalid(result);
      expect(result.error).toBe("Cannot add element: duplicate element name 'first' in all");
    });

    test("should reject an element without name and ref", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: { parentId: "/complexType:T/sequence" },
      };

      const result = validateAddElement(command, schemaWith(SEQUENCE_WITH_ELEMENTS));
      expectInvalid(result);
      expect(result.error).toBe("Element name must be a valid XML name");
    });

    test("should reject adding an element directly to a complexType, which needs a compositor", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: { parentId: "/complexType:T", elementName: "third", elementType: "xs:string" },
      };

      const result = validateAddElement(command, schemaWith(SEQUENCE_WITH_ELEMENTS));
      expectInvalid(result);
      expect(result.error).toBe("Cannot add element to parent of type: topLevelComplexType");
    });

    test("should reject a reference that already exists in the sequence", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: { parentId: "/complexType:T/sequence", ref: "root" },
      };

      const result = validateAddElement(command, schemaWith(SEQUENCE_WITH_ELEMENTS));
      expectInvalid(result);
      expect(result.error).toBe("Cannot add element: duplicate element reference 'root' in sequence");
    });

    test("should accept removing an element identified by position", () => {
      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: { elementId: "/complexType:T/sequence/element[1]" },
      };

      const result = validateRemoveElement(command, schemaWith(SEQUENCE_WITH_ELEMENTS));
      expect(result.valid).toBe(true);
    });

    test("should reject removing an element at a position after the last one", () => {
      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: { elementId: "/complexType:T/sequence/element[3]" },
      };

      const result = validateRemoveElement(command, schemaWith(SEQUENCE_WITH_ELEMENTS));
      expectInvalid(result);
      expect(result.error).toBe("Element not found at position: 3");
    });

    test("should reject removing an element whose parent does not exist", () => {
      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: { elementId: "/complexType:Missing/sequence/element:first" },
      };

      const result = validateRemoveElement(command, schemaWith(SEQUENCE_WITH_ELEMENTS));
      expectInvalid(result);
      expect(result.error).toBe("Parent node not found for element: /complexType:Missing/sequence/element:first");
    });

    test("should reject removing an element from a parent that cannot hold elements", () => {
      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: { elementId: "/complexType:T/element:first" },
      };

      const result = validateRemoveElement(command, schemaWith(SEQUENCE_WITH_ELEMENTS));
      expectInvalid(result);
      expect(result.error).toBe("Cannot remove element from parent of type: topLevelComplexType");
    });

    test("should reject modifying an element whose parent does not exist", () => {
      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: { elementId: "/complexType:Missing/sequence/element:first", elementName: "renamed" },
      };

      const result = validateModifyElement(command, schemaWith(SEQUENCE_WITH_ELEMENTS));
      expectInvalid(result);
      expect(result.error).toBe("Parent node not found for element: /complexType:Missing/sequence/element:first");
    });

    test("should reject modifying an element in a parent that cannot hold elements", () => {
      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: { elementId: "/complexType:T/element:first", elementName: "renamed" },
      };

      const result = validateModifyElement(command, schemaWith(SEQUENCE_WITH_ELEMENTS));
      expectInvalid(result);
      expect(result.error).toBe("Cannot modify element in parent of type: topLevelComplexType");
    });

    test("should reject modifying an element at a position after the last one", () => {
      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: { elementId: "/complexType:T/sequence/element[3]", elementName: "renamed" },
      };

      const result = validateModifyElement(command, schemaWith(SEQUENCE_WITH_ELEMENTS));
      expectInvalid(result);
      expect(result.error).toContain("Element not found");
    });

    test("should reject changing an element to a reference with an invalid name", () => {
      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: { elementId: "/complexType:T/sequence/element:first", ref: "123-invalid" },
      };

      const result = validateModifyElement(command, schemaWith(SEQUENCE_WITH_ELEMENTS));
      expectInvalid(result);
      expect(result.error).toBe("Element ref must be a valid XML name");
    });

    test("should accept changing an element to a reference to an existing top-level element", () => {
      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: { elementId: "/complexType:T/sequence/element:first", ref: "root" },
      };

      const result = validateModifyElement(
        command,
        schemaWith(
          `<xs:element name="root" type="xs:string"/><xs:complexType name="T"><xs:sequence><xs:element name="first" type="xs:string"/></xs:sequence></xs:complexType>`,
        ),
      );
      expect(result.valid).toBe(true);
    });
  });

});

describe("Attribute Validators", () => {
  let schemaObj: schema;

  beforeEach(() => {
    const simpleSchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attribute name="attr1" type="xs:string"/>
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
      expectInvalid(result);
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
      expectInvalid(result);
      expect(result.error).toBe("Parent ID cannot be empty");
    });

    test("should reject addAttribute with both defaultValue and fixedValue", () => {
      const command: AddAttributeCommand = {
        type: "addAttribute",
        payload: {
          parentId: "/schema",
          attributeName: "lang",
          attributeType: "xs:string",
          defaultValue: "en",
          fixedValue: "en",
        },
      };

      const result = validateAddAttribute(command, schemaObj);
      expectInvalid(result);
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
      expectInvalid(result);
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
      expectInvalid(result);
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
      expectInvalid(result);
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
  <xs:complexType name="PersonType">
    <xs:attribute name="lang" type="xs:string"/>
  </xs:complexType>
</xs:schema>`;
      refSchema = unmarshal(schema, xml);
    });

    test("should accept addAttribute with valid ref to complex type", () => {
      // PersonType must NOT already have a lang attribute to avoid the duplicate check
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attribute name="lang" type="xs:string"/>
  <xs:complexType name="PersonType"/>
</xs:schema>`;
      const schemaWithoutDuplicate = unmarshal(schema, xml);
      const command: AddAttributeCommand = {
        type: "addAttribute",
        payload: { parentId: "/complexType:PersonType", ref: "lang" },
      };
      expect(validateAddAttribute(command, schemaWithoutDuplicate).valid).toBe(true);
    });

    test("should reject addAttribute with ref at schema level", () => {
      const command: AddAttributeCommand = {
        type: "addAttribute",
        payload: { parentId: "/schema", ref: "lang" },
      };
      const result = validateAddAttribute(command, refSchema);
      expectInvalid(result);
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
      expectInvalid(result);
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
      expectInvalid(result);
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
      expectInvalid(result);
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
      expectInvalid(result);
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
      expectInvalid(result);
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
      expectInvalid(result);
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
      expectInvalid(result);
      expect(result.error).toBe("Referenced attribute 'nonexistent' does not exist in schema");
    });
  });
  describe("parents, positions and duplicates of attributes", () => {
    test("should reject an attribute without name and ref", () => {
      const command: AddAttributeCommand = {
        type: "addAttribute",
        payload: { parentId: "/complexType:T" },
      };

      const result = validateAddAttribute(command, schemaWith(ATTRIBUTES));
      expectInvalid(result);
      expect(result.error).toBe("Attribute name must be a valid XML name");
    });

    test("should reject adding an attribute directly to an element", () => {
      const command: AddAttributeCommand = {
        type: "addAttribute",
        payload: { parentId: "/element:root", attributeName: "id", attributeType: "xs:ID" },
      };

      const result = validateAddAttribute(command, schemaWith(ATTRIBUTES));
      expectInvalid(result);
      expect(result.error).toBe("Cannot add attribute to parent of type: topLevelElement");
    });

    test("should reject a reference that already exists in the complexType", () => {
      const command: AddAttributeCommand = {
        type: "addAttribute",
        payload: { parentId: "/complexType:T", ref: "lang" },
      };

      const result = validateAddAttribute(command, schemaWith(ATTRIBUTES));
      expectInvalid(result);
      expect(result.error).toBe("Cannot add attribute: duplicate attribute reference 'lang' in topLevelComplexType");
    });

    test("should reject a name that a reference in the complexType already uses", () => {
      const command: AddAttributeCommand = {
        type: "addAttribute",
        payload: { parentId: "/complexType:T", attributeName: "lang", attributeType: "xs:string" },
      };

      const result = validateAddAttribute(command, schemaWith(ATTRIBUTES));
      expectInvalid(result);
      expect(result.error).toBe("Cannot add attribute: duplicate attribute name 'lang' in topLevelComplexType");
    });

    test("should reject a top-level attribute name that already exists", () => {
      const command: AddAttributeCommand = {
        type: "addAttribute",
        payload: { parentId: "/schema", attributeName: "lang", attributeType: "xs:string" },
      };

      const result = validateAddAttribute(command, schemaWith(ATTRIBUTES));
      expectInvalid(result);
      expect(result.error).toBe("Cannot add attribute: duplicate attribute name 'lang' in schema");
    });

    test("should accept removing a top-level attribute", () => {
      const command: RemoveAttributeCommand = {
        type: "removeAttribute",
        payload: { attributeId: "/attribute:lang" },
      };

      const result = validateRemoveAttribute(command, schemaWith(ATTRIBUTES));
      expect(result.valid).toBe(true);
    });

    test("should accept removing an attribute reference identified by the referenced name", () => {
      const command: RemoveAttributeCommand = {
        type: "removeAttribute",
        payload: { attributeId: "/complexType:T/attribute:lang" },
      };

      const result = validateRemoveAttribute(command, schemaWith(ATTRIBUTES));
      expect(result.valid).toBe(true);
    });

    test("should accept removing an attribute identified by position", () => {
      const command: RemoveAttributeCommand = {
        type: "removeAttribute",
        payload: { attributeId: "/complexType:T/attribute[1]" },
      };

      const result = validateRemoveAttribute(command, schemaWith(ATTRIBUTES));
      expect(result.valid).toBe(true);
    });

    test("should reject removing an attribute at a position after the last one", () => {
      const command: RemoveAttributeCommand = {
        type: "removeAttribute",
        payload: { attributeId: "/complexType:T/attribute[2]" },
      };

      const result = validateRemoveAttribute(command, schemaWith(ATTRIBUTES));
      expectInvalid(result);
      expect(result.error).toBe("Attribute not found at position: 2");
    });

    test("should reject removing an attribute whose name does not exist", () => {
      const command: RemoveAttributeCommand = {
        type: "removeAttribute",
        payload: { attributeId: "/complexType:T/attribute:missing" },
      };

      const result = validateRemoveAttribute(command, schemaWith(ATTRIBUTES));
      expectInvalid(result);
      expect(result.error).toBe("Attribute not found with name: missing");
    });

    test("should reject removing an attribute whose parent does not exist", () => {
      const command: RemoveAttributeCommand = {
        type: "removeAttribute",
        payload: { attributeId: "/complexType:Missing/attribute:code" },
      };

      const result = validateRemoveAttribute(command, schemaWith(ATTRIBUTES));
      expectInvalid(result);
      expect(result.error).toBe("Parent node not found for attribute: /complexType:Missing/attribute:code");
    });

    test("should reject removing an attribute from a parent that cannot hold attributes", () => {
      const command: RemoveAttributeCommand = {
        type: "removeAttribute",
        payload: { attributeId: "/element:root/attribute:code" },
      };

      const result = validateRemoveAttribute(command, schemaWith(ATTRIBUTES));
      expectInvalid(result);
      expect(result.error).toBe("Cannot remove attribute from parent of type: topLevelElement");
    });

    test("should reject modifying an attribute whose parent does not exist", () => {
      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: { attributeId: "/complexType:Missing/attribute:code", attributeName: "renamed" },
      };

      const result = validateModifyAttribute(command, schemaWith(ATTRIBUTES));
      expectInvalid(result);
      expect(result.error).toBe("Parent node not found for attribute: /complexType:Missing/attribute:code");
    });

    test("should reject modifying an attribute in a parent that cannot hold attributes", () => {
      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: { attributeId: "/element:root/attribute:code", attributeName: "renamed" },
      };

      const result = validateModifyAttribute(command, schemaWith(ATTRIBUTES));
      expectInvalid(result);
      expect(result.error).toBe("Cannot modify attribute in parent of type: topLevelElement");
    });

    test("should reject modifying an attribute at a position after the last one", () => {
      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: { attributeId: "/complexType:T/attribute[2]", attributeName: "renamed" },
      };

      const result = validateModifyAttribute(command, schemaWith(ATTRIBUTES));
      expectInvalid(result);
      expect(result.error).toContain("Attribute not found");
    });

    test("should accept modifying an attribute reference identified by the referenced name", () => {
      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: { attributeId: "/complexType:T/attribute:lang", documentation: "Language of the content" },
      };

      const result = validateModifyAttribute(command, schemaWith(ATTRIBUTES));
      expect(result.valid).toBe(true);
    });

    test("should reject changing an attribute to a reference with an invalid name", () => {
      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: { attributeId: "/complexType:T/attribute:code", ref: "123-invalid" },
      };

      const result = validateModifyAttribute(command, schemaWith(ATTRIBUTES));
      expectInvalid(result);
      expect(result.error).toBe("Attribute ref must be a valid XML name");
    });

    test("should accept changing an attribute to a reference to an existing top-level attribute", () => {
      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: { attributeId: "/complexType:T/attribute:code", ref: "lang" },
      };

      const result = validateModifyAttribute(
        command,
        schemaWith(`<xs:attribute name="lang" type="xs:string"/><xs:complexType name="T"><xs:attribute name="code" type="xs:string"/></xs:complexType>`),
      );
      expect(result.valid).toBe(true);
    });

    test("should reject renaming an attribute to an invalid name", () => {
      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: { attributeId: "/complexType:T/attribute:code", attributeName: "123-invalid" },
      };

      const result = validateModifyAttribute(command, schemaWith(ATTRIBUTES));
      expectInvalid(result);
      expect(result.error).toBe("Attribute name must be a valid XML name");
    });
  });

});
