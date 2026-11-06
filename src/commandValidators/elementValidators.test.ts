/**
 * Unit tests for element validators.
 */

import { unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../../shared/types.js";
import {
  AddElementCommand,
  RemoveElementCommand,
  ModifyElementCommand,
} from "../../shared/types.js";
import {
  validateAddElement,
  validateRemoveElement,
  validateModifyElement,
} from "./elementValidators.js";
import { expectInvalid } from "../__tests__/validationTestHelpers.js";
import { readTestSchema, schemaWith } from "../__tests__/schemaTestHelpers.js";

/** An import of the namespace `http://example.com/external`. */
const EXTERNAL_IMPORT = `<xs:import namespace="http://example.com/external" schemaLocation="external.xsd"/>`;

/** The prefix `ext` for the namespace `http://example.com/external`. */
const EXT_PREFIX = { ext: "http://example.com/external" };

/** A top-level element `root` and a complexType `T` whose sequence holds two local elements and a reference to `root`. */
const SEQUENCE_WITH_ELEMENTS = `<xs:element name="root" type="xs:string"/>
  <xs:complexType name="T">
    <xs:sequence>
      <xs:element name="first" type="xs:string"/>
      <xs:element name="second" type="xs:string"/>
      <xs:element ref="root"/>
    </xs:sequence>
  </xs:complexType>`;

describe("Element Validators", () => {
  let schemaObj: schema;

  beforeEach(() => {
    schemaObj = schemaWith(`<xs:element name="person" type="xs:string"/>`);
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
      const customSchema = readTestSchema("person-type-with-name-element.xsd");

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
      const customSchema = schemaWith(`<xs:simpleType name="AgeType">
  <xs:restriction base="xs:integer">
    <xs:minInclusive value="0"/>
    <xs:maxInclusive value="120"/>
  </xs:restriction>
</xs:simpleType>`);

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
      const prefixes = { tns: "http://example.com/types" };
      const customSchema = schemaWith(`<xs:complexType name="PersonType">
  <xs:sequence>
    <xs:element name="name" type="xs:string"/>
  </xs:sequence>
</xs:complexType>`, prefixes);

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
      const customSchema = schemaWith(EXTERNAL_IMPORT, EXT_PREFIX);

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
      const customSchema = schemaWith(`<xs:include schemaLocation="included.xsd"/>
<xs:simpleType name="IncludedType">
  <xs:restriction base="xs:string"/>
</xs:simpleType>`);

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
      const customSchema = schemaWith(EXTERNAL_IMPORT, EXT_PREFIX);

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
      const customSchema = schemaWith(`<xs:element name="person" type="xs:string"/>
<xs:complexType name="PersonType">
  <xs:sequence>
    <xs:element name="name" type="xs:string"/>
  </xs:sequence>
</xs:complexType>`);

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
      const renamedSchema = schemaWith(`<xs:element name="personRenamed" type="xs:string"/>`);

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
      seqSchema = readTestSchema("person-element-and-order-type.xsd");
    });

    test("should accept addElement with valid ref to sequence", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: { parentId: "/complexType:OrderType/group:sequence[0]", ref: "person" },
      };
      expect(validateAddElement(command, seqSchema).valid).toBe(true);
    });

    test("should accept addElement for sequence in complexContent extension using group path", () => {
      const extensionSchema = readTestSchema("person-element-and-worker-type-extension.xsd");

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
          parentId: "/complexType:OrderType/group:sequence[0]",
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
          parentId: "/complexType:OrderType/group:sequence[0]",
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
        payload: { parentId: "/complexType:OrderType/group:sequence[0]", ref: "nonexistent" },
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
        payload: { parentId: "/complexType:T/group:all[0]", elementName: "third", elementType: "xs:string" },
      };

      const result = validateAddElement(command, schemaWith(`<xs:complexType name="T"><xs:all/></xs:complexType>`));
      expect(result.valid).toBe(true);
    });

    test("should reject an element name that already exists in the all", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: { parentId: "/complexType:T/group:all[0]", elementName: "first", elementType: "xs:string" },
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
        payload: { parentId: "/complexType:T/group:sequence[0]" },
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
        payload: { parentId: "/complexType:T/group:sequence[0]", ref: "root" },
      };

      const result = validateAddElement(command, schemaWith(SEQUENCE_WITH_ELEMENTS));
      expectInvalid(result);
      expect(result.error).toBe("Cannot add element: duplicate element reference 'root' in sequence");
    });

    test("should accept removing an element identified by position", () => {
      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: { elementId: "/complexType:T/group:sequence[0]/element[1]" },
      };

      const result = validateRemoveElement(command, schemaWith(SEQUENCE_WITH_ELEMENTS));
      expect(result.valid).toBe(true);
    });

    test("should reject removing an element at a position after the last one", () => {
      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: { elementId: "/complexType:T/group:sequence[0]/element[3]" },
      };

      const result = validateRemoveElement(command, schemaWith(SEQUENCE_WITH_ELEMENTS));
      expectInvalid(result);
      expect(result.error).toBe("Element not found at position: 3");
    });

    test("should reject removing an element whose parent does not exist", () => {
      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: { elementId: "/complexType:Missing/group:sequence[0]/element:first" },
      };

      const result = validateRemoveElement(command, schemaWith(SEQUENCE_WITH_ELEMENTS));
      expectInvalid(result);
      expect(result.error).toBe("Parent node not found for element: /complexType:Missing/group:sequence[0]/element:first");
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
        payload: { elementId: "/complexType:Missing/group:sequence[0]/element:first", elementName: "renamed" },
      };

      const result = validateModifyElement(command, schemaWith(SEQUENCE_WITH_ELEMENTS));
      expectInvalid(result);
      expect(result.error).toBe("Parent node not found for element: /complexType:Missing/group:sequence[0]/element:first");
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
        payload: { elementId: "/complexType:T/group:sequence[0]/element[3]", elementName: "renamed" },
      };

      const result = validateModifyElement(command, schemaWith(SEQUENCE_WITH_ELEMENTS));
      expectInvalid(result);
      expect(result.error).toContain("Element not found");
    });

    test("should reject changing an element to a reference with an invalid name", () => {
      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: { elementId: "/complexType:T/group:sequence[0]/element:first", ref: "123-invalid" },
      };

      const result = validateModifyElement(command, schemaWith(SEQUENCE_WITH_ELEMENTS));
      expectInvalid(result);
      expect(result.error).toBe("Element ref must be a valid XML name");
    });

    test("should accept changing an element to a reference to an existing top-level element", () => {
      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: { elementId: "/complexType:T/group:sequence[0]/element:first", ref: "root" },
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
