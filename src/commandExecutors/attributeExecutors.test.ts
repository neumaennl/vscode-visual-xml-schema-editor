/**
 * Unit tests for attribute executors.
 * Tests the implementation of add, remove, and modify attribute execution logic.
 */

import { unmarshal, marshal } from "@neumaennl/xmlbind-ts";
import {
  schema,
  attribute,
  AddAttributeCommand,
  RemoveAttributeCommand,
  ModifyAttributeCommand,
} from "../../shared/types.js";
import {
  executeAddAttribute,
  executeRemoveAttribute,
  executeModifyAttribute,
} from "./attributeExecutors.js";
import { toArray } from "../../shared/schemaUtils.js";

/**
 * Unmarshals a schema with the given content.
 *
 * @param body - The XSD content of the schema
 * @returns The schema object
 */
function schemaWith(body: string): schema {
  return unmarshal(
    schema,
    `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  ${body}
</xs:schema>`,
  );
}

/**
 * Returns the local attributes of the complexType `T`.
 *
 * @param schemaObj - The schema object
 * @returns The attributes, in document order
 */
function attributesOfT(schemaObj: schema): attribute[] {
  return toArray(toArray(schemaObj.complexType).find((ct) => ct.name === "T")?.attribute);
}

describe("Attribute Executors", () => {
  describe("executeAddAttribute", () => {
    describe("Adding top-level attributes to schema", () => {
      it("should add a top-level attribute to schema", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: AddAttributeCommand = {
          type: "addAttribute",
          payload: {
            parentId: "/schema",
            attributeName: "lang",
            attributeType: "xs:string",
          },
        };

        executeAddAttribute(command, schemaObj);

        expect(schemaObj.attribute).toBeDefined();
        const attributes = Array.isArray(schemaObj.attribute)
          ? schemaObj.attribute
          : [schemaObj.attribute];
        expect(attributes).toHaveLength(1);
        expect(attributes[0]!.name).toBe("lang");
        expect(attributes[0]!.type_).toBe("xs:string");
      });

      it("should add a top-level attribute with default and fixed values", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: AddAttributeCommand = {
          type: "addAttribute",
          payload: {
            parentId: "/schema",
            attributeName: "version",
            attributeType: "xs:string",
            defaultValue: "1.0",
          },
        };

        executeAddAttribute(command, schemaObj);

        const attributes = Array.isArray(schemaObj.attribute)
          ? schemaObj.attribute
          : [schemaObj.attribute];
        expect(attributes[0]!.default_).toBe("1.0");
      });

      it("should add a top-level attribute with documentation", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: AddAttributeCommand = {
          type: "addAttribute",
          payload: {
            parentId: "/schema",
            attributeName: "lang",
            attributeType: "xs:string",
            documentation: "Language code",
          },
        };

        executeAddAttribute(command, schemaObj);

        const attributes = Array.isArray(schemaObj.attribute)
          ? schemaObj.attribute
          : [schemaObj.attribute];
        expect(attributes[0]!.annotation).toBeDefined();
        expect(attributes[0]!.annotation!.documentation![0].value).toBe("Language code");
      });

    });

    describe("Adding attributes to complex types", () => {
      it("should add an attribute to a top-level complex type", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="PersonType">
    <xs:sequence>
      <xs:element name="name" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: AddAttributeCommand = {
          type: "addAttribute",
          payload: {
            parentId: "/complexType:PersonType",
            attributeName: "id",
            attributeType: "xs:integer",
            required: true,
          },
        };

        executeAddAttribute(command, schemaObj);

        const complexTypes = Array.isArray(schemaObj.complexType)
          ? schemaObj.complexType
          : [schemaObj.complexType];
        const attrs = complexTypes[0]!.attribute;
        const attributeArr = Array.isArray(attrs) ? attrs : [attrs];
        expect(attributeArr).toHaveLength(1);
        expect(attributeArr[0]!.name).toBe("id");
        expect(attributeArr[0]!.type_).toBe("xs:integer");
        expect(attributeArr[0]!.use).toBe("required");
      });

      it("should add an optional attribute (use=optional) to a complex type", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="PersonType">
    <xs:sequence>
      <xs:element name="name" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: AddAttributeCommand = {
          type: "addAttribute",
          payload: {
            parentId: "/complexType:PersonType",
            attributeName: "nickname",
            attributeType: "xs:string",
            required: false,
          },
        };

        executeAddAttribute(command, schemaObj);

        const complexTypes = Array.isArray(schemaObj.complexType)
          ? schemaObj.complexType
          : [schemaObj.complexType];
        const attrs = Array.isArray(complexTypes[0]!.attribute)
          ? complexTypes[0]!.attribute
          : [complexTypes[0]!.attribute];
        expect(attrs[0]!.use).toBe("optional");
      });

      it("should add an attribute to an anonymous complex type", () => {
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

        const command: AddAttributeCommand = {
          type: "addAttribute",
          payload: {
            parentId: "/element:person/anonymousComplexType[0]",
            attributeName: "status",
            attributeType: "xs:string",
          },
        };

        executeAddAttribute(command, schemaObj);

        const elements = Array.isArray(schemaObj.element)
          ? schemaObj.element
          : [schemaObj.element];
        const attrs = elements[0]!.complexType!.attribute;
        const attributeArr = Array.isArray(attrs) ? attrs : [attrs];
        expect(attributeArr).toHaveLength(1);
        expect(attributeArr[0]!.name).toBe("status");
      });

      it("should add attribute with fixed value to complex type", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="PersonType"/>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: AddAttributeCommand = {
          type: "addAttribute",
          payload: {
            parentId: "/complexType:PersonType",
            attributeName: "version",
            attributeType: "xs:string",
            fixedValue: "2.0",
          },
        };

        executeAddAttribute(command, schemaObj);

        const complexTypes = Array.isArray(schemaObj.complexType)
          ? schemaObj.complexType
          : [schemaObj.complexType];
        const attrs = Array.isArray(complexTypes[0]!.attribute)
          ? complexTypes[0]!.attribute
          : [complexTypes[0]!.attribute];
        expect(attrs[0]!.fixed).toBe("2.0");
      });

    });
  });

  describe("executeRemoveAttribute", () => {
    it("should remove a top-level attribute by name", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attribute name="lang" type="xs:string"/>
  <xs:attribute name="version" type="xs:string"/>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveAttributeCommand = {
        type: "removeAttribute",
        payload: {
          attributeId: "/attribute:lang",
        },
      };

      executeRemoveAttribute(command, schemaObj);

      const attributes = Array.isArray(schemaObj.attribute)
        ? schemaObj.attribute
        : [schemaObj.attribute];
      expect(attributes).toHaveLength(1);
      expect(attributes[0]!.name).toBe("version");
    });

    it("should remove an attribute from a complex type", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="PersonType">
    <xs:attribute name="id" type="xs:integer"/>
    <xs:attribute name="status" type="xs:string"/>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveAttributeCommand = {
        type: "removeAttribute",
        payload: {
          attributeId: "/complexType:PersonType/attribute:id",
        },
      };

      executeRemoveAttribute(command, schemaObj);

      const complexTypes = Array.isArray(schemaObj.complexType)
        ? schemaObj.complexType
        : [schemaObj.complexType];
      const attrs = Array.isArray(complexTypes[0]!.attribute)
        ? complexTypes[0]!.attribute
        : [complexTypes[0]!.attribute];
      expect(attrs).toHaveLength(1);
      expect(attrs[0]!.name).toBe("status");
    });

    it("should remove an attribute from an anonymous complex type", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person">
    <xs:complexType>
      <xs:attribute name="id" type="xs:integer"/>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveAttributeCommand = {
        type: "removeAttribute",
        payload: {
          attributeId: "/element:person/anonymousComplexType[0]/attribute:id",
        },
      };

      executeRemoveAttribute(command, schemaObj);

      const elements = Array.isArray(schemaObj.element)
        ? schemaObj.element
        : [schemaObj.element];
      expect(elements[0]!.complexType!.attribute).toBeUndefined();
    });

  });

  describe("executeModifyAttribute", () => {
    it("should modify attribute name", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="PersonType">
    <xs:attribute name="id" type="xs:integer"/>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: {
          attributeId: "/complexType:PersonType/attribute:id",
          attributeName: "personId",
        },
      };

      executeModifyAttribute(command, schemaObj);

      const complexTypes = Array.isArray(schemaObj.complexType)
        ? schemaObj.complexType
        : [schemaObj.complexType];
      const attrs = Array.isArray(complexTypes[0]!.attribute)
        ? complexTypes[0]!.attribute
        : [complexTypes[0]!.attribute];
      expect(attrs[0]!.name).toBe("personId");
      expect(attrs[0]!.type_).toBe("xs:integer");
    });

    it("should modify attribute type", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="PersonType">
    <xs:attribute name="id" type="xs:integer"/>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: {
          attributeId: "/complexType:PersonType/attribute:id",
          attributeType: "xs:string",
        },
      };

      executeModifyAttribute(command, schemaObj);

      const complexTypes = Array.isArray(schemaObj.complexType)
        ? schemaObj.complexType
        : [schemaObj.complexType];
      const attrs = Array.isArray(complexTypes[0]!.attribute)
        ? complexTypes[0]!.attribute
        : [complexTypes[0]!.attribute];
      expect(attrs[0]!.type_).toBe("xs:string");
    });

    it("should modify attribute required status", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="PersonType">
    <xs:attribute name="id" type="xs:integer" use="optional"/>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: {
          attributeId: "/complexType:PersonType/attribute:id",
          required: true,
        },
      };

      executeModifyAttribute(command, schemaObj);

      const complexTypes = Array.isArray(schemaObj.complexType)
        ? schemaObj.complexType
        : [schemaObj.complexType];
      const attrs = Array.isArray(complexTypes[0]!.attribute)
        ? complexTypes[0]!.attribute
        : [complexTypes[0]!.attribute];
      expect(attrs[0]!.use).toBe("required");
    });

    it("should modify attribute default value", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="PersonType">
    <xs:attribute name="status" type="xs:string"/>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: {
          attributeId: "/complexType:PersonType/attribute:status",
          defaultValue: "active",
        },
      };

      executeModifyAttribute(command, schemaObj);

      const complexTypes = Array.isArray(schemaObj.complexType)
        ? schemaObj.complexType
        : [schemaObj.complexType];
      const attrs = Array.isArray(complexTypes[0]!.attribute)
        ? complexTypes[0]!.attribute
        : [complexTypes[0]!.attribute];
      expect(attrs[0]!.default_).toBe("active");
    });

    it("should modify attribute fixed value", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="PersonType">
    <xs:attribute name="version" type="xs:string"/>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: {
          attributeId: "/complexType:PersonType/attribute:version",
          fixedValue: "2.0",
        },
      };

      executeModifyAttribute(command, schemaObj);

      const complexTypes = Array.isArray(schemaObj.complexType)
        ? schemaObj.complexType
        : [schemaObj.complexType];
      const attrs = Array.isArray(complexTypes[0]!.attribute)
        ? complexTypes[0]!.attribute
        : [complexTypes[0]!.attribute];
      expect(attrs[0]!.fixed).toBe("2.0");
    });

    it("should add documentation to attribute", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="PersonType">
    <xs:attribute name="id" type="xs:integer"/>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: {
          attributeId: "/complexType:PersonType/attribute:id",
          documentation: "Unique person identifier",
        },
      };

      executeModifyAttribute(command, schemaObj);

      const complexTypes = Array.isArray(schemaObj.complexType)
        ? schemaObj.complexType
        : [schemaObj.complexType];
      const attrs = Array.isArray(complexTypes[0]!.attribute)
        ? complexTypes[0]!.attribute
        : [complexTypes[0]!.attribute];
      expect(attrs[0]!.annotation).toBeDefined();
      expect(attrs[0]!.annotation!.documentation![0].value).toBe("Unique person identifier");
    });

    it("should modify a top-level attribute name", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attribute name="lang" type="xs:string"/>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: {
          attributeId: "/attribute:lang",
          attributeName: "language",
        },
      };

      executeModifyAttribute(command, schemaObj);

      const attributes = Array.isArray(schemaObj.attribute)
        ? schemaObj.attribute
        : [schemaObj.attribute];
      expect(attributes[0]!.name).toBe("language");
    });

    it("should clear fixed value when setting default value on an attribute that already has fixed", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="PersonType">
    <xs:attribute name="status" type="xs:string" fixed="active"/>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: {
          attributeId: "/complexType:PersonType/attribute:status",
          defaultValue: "pending",
        },
      };

      executeModifyAttribute(command, schemaObj);

      const complexTypes = Array.isArray(schemaObj.complexType)
        ? schemaObj.complexType
        : [schemaObj.complexType];
      const attrs = toArray(complexTypes[0]!.attribute);
      expect(attrs[0].default_).toBe("pending");
      expect(attrs[0].fixed).toBeUndefined();
    });

    it("should clear default value when setting fixed value on an attribute that already has default", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="PersonType">
    <xs:attribute name="status" type="xs:string" default="pending"/>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: {
          attributeId: "/complexType:PersonType/attribute:status",
          fixedValue: "active",
        },
      };

      executeModifyAttribute(command, schemaObj);

      const complexTypes = Array.isArray(schemaObj.complexType)
        ? schemaObj.complexType
        : [schemaObj.complexType];
      const attrs = toArray(complexTypes[0]!.attribute);
      expect(attrs[0].fixed).toBe("active");
      expect(attrs[0].default_).toBeUndefined();
    });
  });

  describe("Round-trip XML serialization", () => {
    it("should produce valid XML after adding an attribute", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="PersonType">
    <xs:sequence>
      <xs:element name="name" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddAttributeCommand = {
        type: "addAttribute",
        payload: {
          parentId: "/complexType:PersonType",
          attributeName: "id",
          attributeType: "xs:integer",
          required: true,
          documentation: "Person ID",
        },
      };

      executeAddAttribute(command, schemaObj);

      const resultXml = marshal(schemaObj);
      const reparsed = unmarshal(schema, resultXml);
      const complexTypes = Array.isArray(reparsed.complexType)
        ? reparsed.complexType
        : [reparsed.complexType];
      const attrs = Array.isArray(complexTypes[0]!.attribute)
        ? complexTypes[0]!.attribute
        : [complexTypes[0]!.attribute];
      expect(attrs[0]!.name).toBe("id");
      expect(attrs[0]!.use).toBe("required");
    });

    it("should produce valid XML after modifying an attribute", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="PersonType">
    <xs:attribute name="id" type="xs:integer" use="optional"/>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: {
          attributeId: "/complexType:PersonType/attribute:id",
          attributeName: "personId",
          attributeType: "xs:string",
          required: true,
        },
      };

      executeModifyAttribute(command, schemaObj);

      const resultXml = marshal(schemaObj);
      const reparsed = unmarshal(schema, resultXml);
      const complexTypes = Array.isArray(reparsed.complexType)
        ? reparsed.complexType
        : [reparsed.complexType];
      const attrs = Array.isArray(complexTypes[0]!.attribute)
        ? complexTypes[0]!.attribute
        : [complexTypes[0]!.attribute];
      expect(attrs[0]!.name).toBe("personId");
      expect(attrs[0]!.type_).toBe("xs:string");
      expect(attrs[0]!.use).toBe("required");
    });
  });

  describe("Reference attribute support", () => {
    const baseXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attribute name="lang" type="xs:string"/>
  <xs:complexType name="PersonType"/>
</xs:schema>`;

    it("should add a reference attribute to a complex type", () => {
      const schemaObj = unmarshal(schema, baseXml);

      const command: AddAttributeCommand = {
        type: "addAttribute",
        payload: {
          parentId: "/complexType:PersonType",
          ref: "lang",
        },
      };

      executeAddAttribute(command, schemaObj);

      const complexTypes = Array.isArray(schemaObj.complexType)
        ? schemaObj.complexType
        : [schemaObj.complexType];
      const attrs = toArray(complexTypes[0]!.attribute);
      expect(attrs).toHaveLength(1);
      expect(attrs[0].ref).toBe("lang");
      expect(attrs[0].name).toBeUndefined();
      expect(attrs[0].type_).toBeUndefined();
    });

    it("should add a required reference attribute", () => {
      const schemaObj = unmarshal(schema, baseXml);

      const command: AddAttributeCommand = {
        type: "addAttribute",
        payload: {
          parentId: "/complexType:PersonType",
          ref: "lang",
          required: true,
        },
      };

      executeAddAttribute(command, schemaObj);

      const complexTypes = Array.isArray(schemaObj.complexType)
        ? schemaObj.complexType
        : [schemaObj.complexType];
      const attrs = toArray(complexTypes[0]!.attribute);
      expect(attrs[0].ref).toBe("lang");
      expect(attrs[0].use).toBe("required");
    });

    it("should remove a reference attribute by ref name", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attribute name="lang" type="xs:string"/>
  <xs:complexType name="PersonType">
    <xs:attribute ref="lang"/>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, xml);

      const command: RemoveAttributeCommand = {
        type: "removeAttribute",
        payload: { attributeId: "/complexType:PersonType/attribute:lang" },
      };

      executeRemoveAttribute(command, schemaObj);

      const complexTypes = Array.isArray(schemaObj.complexType)
        ? schemaObj.complexType
        : [schemaObj.complexType];
      expect(complexTypes[0]!.attribute).toBeUndefined();
    });

    it("should modify a named attribute to become a reference", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attribute name="lang" type="xs:string"/>
  <xs:complexType name="PersonType">
    <xs:attribute name="locale" type="xs:string"/>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, xml);

      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: {
          attributeId: "/complexType:PersonType/attribute:locale",
          ref: "lang",
        },
      };

      executeModifyAttribute(command, schemaObj);

      const complexTypes = Array.isArray(schemaObj.complexType)
        ? schemaObj.complexType
        : [schemaObj.complexType];
      const attrs = toArray(complexTypes[0]!.attribute);
      expect(attrs[0].ref).toBe("lang");
      expect(attrs[0].name).toBeUndefined();
      expect(attrs[0].type_).toBeUndefined();
    });

    it("should modify a reference attribute to become named", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attribute name="lang" type="xs:string"/>
  <xs:complexType name="PersonType">
    <xs:attribute ref="lang"/>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, xml);

      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: {
          attributeId: "/complexType:PersonType/attribute:lang",
          attributeName: "locale",
          attributeType: "xs:string",
        },
      };

      executeModifyAttribute(command, schemaObj);

      const complexTypes = Array.isArray(schemaObj.complexType)
        ? schemaObj.complexType
        : [schemaObj.complexType];
      const attrs = toArray(complexTypes[0]!.attribute);
      expect(attrs[0].name).toBe("locale");
      expect(attrs[0].type_).toBe("xs:string");
      expect(attrs[0].ref).toBeUndefined();
    });

    it("should produce valid XML for a reference attribute", () => {
      const schemaObj = unmarshal(schema, baseXml);

      executeAddAttribute(
        {
          type: "addAttribute",
          payload: { parentId: "/complexType:PersonType", ref: "lang" },
        },
        schemaObj
      );

      const xml = marshal(schemaObj);
      expect(xml).toContain('ref="lang"');
      expect(xml).not.toContain('name="lang" type=');
    });
  });
  describe("values, use and documentation", () => {
    it("should set the fixed value of a new top-level attribute", () => {
      const schemaObj = schemaWith("");
      const command: AddAttributeCommand = {
        type: "addAttribute",
        payload: { parentId: "/schema", attributeName: "version", attributeType: "xs:string", fixedValue: "1.0" },
      };

      executeAddAttribute(command, schemaObj);

      expect(schemaObj.attribute![0].fixed).toBe("1.0");
      expect(schemaObj.attribute![0].default_).toBeUndefined();
    });

    it("should set the default value of a new local attribute", () => {
      const schemaObj = schemaWith(`<xs:complexType name="T"/>`);
      const command: AddAttributeCommand = {
        type: "addAttribute",
        payload: { parentId: "/complexType:T", attributeName: "lang", attributeType: "xs:string", defaultValue: "en" },
      };

      executeAddAttribute(command, schemaObj);

      expect(attributesOfT(schemaObj)[0].default_).toBe("en");
    });

    it("should mark a new local attribute as optional when it is not required", () => {
      const schemaObj = schemaWith(`<xs:complexType name="T"/>`);
      const command: AddAttributeCommand = {
        type: "addAttribute",
        payload: { parentId: "/complexType:T", attributeName: "lang", attributeType: "xs:string", required: false },
      };

      executeAddAttribute(command, schemaObj);

      expect(attributesOfT(schemaObj)[0].use).toBe("optional");
    });

    it("should add documentation to a new attribute reference", () => {
      const schemaObj = schemaWith(`<xs:attribute name="lang" type="xs:string"/><xs:complexType name="T"/>`);
      const command: AddAttributeCommand = {
        type: "addAttribute",
        payload: { parentId: "/complexType:T", ref: "lang", documentation: "Language of the content" },
      };

      executeAddAttribute(command, schemaObj);

      const added = attributesOfT(schemaObj)[0];
      expect(added.ref).toBe("lang");
      expect(toArray(added.annotation?.documentation).map((d) => d.value)).toEqual(["Language of the content"]);
    });

    it("should make a local attribute optional", () => {
      const schemaObj = schemaWith(`<xs:complexType name="T"><xs:attribute name="lang" type="xs:string" use="required"/></xs:complexType>`);
      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: { attributeId: "/complexType:T/attribute:lang", required: false },
      };

      executeModifyAttribute(command, schemaObj);

      expect(attributesOfT(schemaObj)[0].use).toBe("optional");
    });

    it("should replace the documentation of an attribute and keep its appinfo", () => {
      const schemaObj = schemaWith(
        `<xs:complexType name="T"><xs:attribute name="lang" type="xs:string"><xs:annotation><xs:appinfo>tool data</xs:appinfo><xs:documentation>Old</xs:documentation></xs:annotation></xs:attribute></xs:complexType>`,
      );
      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: { attributeId: "/complexType:T/attribute:lang", documentation: "New" },
      };

      executeModifyAttribute(command, schemaObj);

      const annotation = attributesOfT(schemaObj)[0].annotation!;
      expect(toArray(annotation.documentation).map((d) => d.value)).toEqual(["New"]);
      expect(toArray(annotation.appinfo)).toHaveLength(1);
    });
  });

  describe("removing the last attribute", () => {
    it("should leave no empty attribute list when the last top-level attribute is removed", () => {
      const schemaObj = schemaWith(`<xs:attribute name="lang" type="xs:string"/>`);
      const command: RemoveAttributeCommand = {
        type: "removeAttribute",
        payload: { attributeId: "/attribute:lang" },
      };

      executeRemoveAttribute(command, schemaObj);

      expect(schemaObj.attribute).toBeUndefined();
    });

  });

});
