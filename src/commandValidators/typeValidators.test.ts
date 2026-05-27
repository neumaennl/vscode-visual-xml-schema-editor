/**
 * Unit tests for type validators (SimpleType and ComplexType).
 */

import { describe, test, expect, beforeEach } from "vitest";
import { unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../../shared/types";
import {
  AddSimpleTypeCommand,
  RemoveSimpleTypeCommand,
  ModifySimpleTypeCommand,
  AddComplexTypeCommand,
  RemoveComplexTypeCommand,
  ModifyComplexTypeCommand,
} from "../../shared/types";
import {
  validateAddSimpleType,
  validateRemoveSimpleType,
  validateModifySimpleType,
  validateAddComplexType,
  validateRemoveComplexType,
  validateModifyComplexType,
} from "./typeValidators";
import { expectInvalid } from "./validationTestHelpers";

describe("SimpleType Validators", () => {
  let emptySchemaObj: schema;
  let schemaWithAgeType: schema;

  beforeEach(() => {
    const emptySchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
    emptySchemaObj = unmarshal(schema, emptySchemaXml);

    const schemaWithTypeXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:simpleType name="AgeType">
    <xs:restriction base="xs:integer"/>
  </xs:simpleType>
</xs:schema>`;
    schemaWithAgeType = unmarshal(schema, schemaWithTypeXml);
  });

  describe("validateAddSimpleType", () => {
    test("should reject addSimpleType with missing typeName", () => {
      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "",
          baseType: "xs:string",
        },
      };

      const result = validateAddSimpleType(command, emptySchemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Type name must be a valid XML name");
    });

    test("should reject addSimpleType with missing baseType", () => {
      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "NameType",
          baseType: "",
        },
      };

      const result = validateAddSimpleType(command, emptySchemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Base type cannot be empty");
    });

    test("should reject addSimpleType with unrecognized baseType", () => {
      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "NameType",
          baseType: "xs:nonExistentType",
        },
      };

      const result = validateAddSimpleType(command, emptySchemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Base type 'xs:nonExistentType' is not a recognized XSD type");
    });

    test("should reject addSimpleType when type name already exists in schema", () => {
      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "AgeType",
          baseType: "xs:integer",
        },
      };

      const result = validateAddSimpleType(command, schemaWithAgeType);
      expectInvalid(result);
      expect(result.error).toBe("Simple type 'AgeType' already exists in schema");
    });

    test("should accept addSimpleType with valid typeName and built-in baseType", () => {
      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "AgeType",
          baseType: "xs:integer",
        },
      };

      const result = validateAddSimpleType(command, emptySchemaObj);
      expect(result.valid).toBe(true);
    });

    test("should accept addSimpleType using a user-defined type as baseType", () => {
      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "RestrictedAgeType",
          baseType: "AgeType",
        },
      };

      const result = validateAddSimpleType(command, schemaWithAgeType);
      expect(result.valid).toBe(true);
    });
  });

  describe("validateRemoveSimpleType", () => {
    test("should reject removeSimpleType with missing typeId", () => {
      const command: RemoveSimpleTypeCommand = {
        type: "removeSimpleType",
        payload: {
          typeId: "",
        },
      };

      const result = validateRemoveSimpleType(command, emptySchemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Type ID cannot be empty");
    });

    test("should accept removeSimpleType with valid typeId", () => {
      const command: RemoveSimpleTypeCommand = {
        type: "removeSimpleType",
        payload: {
          typeId: "/simpleType:AgeType",
        },
      };

      const result = validateRemoveSimpleType(command, schemaWithAgeType);
      expect(result.valid).toBe(true);
    });
  });

  describe("validateModifySimpleType", () => {
    test("should reject modifySimpleType with missing typeId", () => {
      const command: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: {
          typeId: "",
        },
      };

      const result = validateModifySimpleType(command, emptySchemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Type ID cannot be empty");
    });

    test("should reject modifySimpleType with invalid typeName", () => {
      const command: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: {
          typeId: "/simpleType:AgeType",
          typeName: "123-invalid",
        },
      };

      const result = validateModifySimpleType(command, schemaWithAgeType);
      expectInvalid(result);
      expect(result.error).toBe("Type name must be a valid XML name");
    });

    test("should reject modifySimpleType when typeId does not exist in schema", () => {
      const command: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: {
          typeId: "/simpleType:NonExistent",
          typeName: "NewName",
        },
      };

      const result = validateModifySimpleType(command, emptySchemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Simple type 'NonExistent' not found in schema");
    });

    test("should accept modifySimpleType when typeId exists and no typeName provided", () => {
      const command: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: {
          typeId: "/simpleType:AgeType",
          baseType: "xs:positiveInteger",
        },
      };

      const result = validateModifySimpleType(command, schemaWithAgeType);
      expect(result.valid).toBe(true);
    });
  });

  describe("Anonymous SimpleType Validators", () => {
    let schemaWithElement: schema;
    let schemaWithElementAndSimpleType: schema;

    beforeEach(() => {
      schemaWithElement = unmarshal(
        schema,
        `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="age"/>
</xs:schema>`
      );

      schemaWithElementAndSimpleType = unmarshal(
        schema,
        `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="age">
    <xs:simpleType>
      <xs:restriction base="xs:integer"/>
    </xs:simpleType>
  </xs:element>
</xs:schema>`
      );
    });

    describe("validateAddSimpleType (anonymous)", () => {
      test("should accept adding an anonymous simpleType to an element", () => {
        const command: AddSimpleTypeCommand = {
          type: "addSimpleType",
          payload: { parentId: "/element:age", baseType: "xs:integer" },
        };

        const result = validateAddSimpleType(command, schemaWithElement);
        expect(result.valid).toBe(true);
      });

      test("should reject when parent element not found", () => {
        const command: AddSimpleTypeCommand = {
          type: "addSimpleType",
          payload: { parentId: "/element:nonExistent", baseType: "xs:integer" },
        };

        const result = validateAddSimpleType(command, schemaWithElement);
        expectInvalid(result);
        expect(result.error).toContain("Parent not found");
      });

      test("should reject when element already has an anonymous simpleType", () => {
        const command: AddSimpleTypeCommand = {
          type: "addSimpleType",
          payload: { parentId: "/element:age", baseType: "xs:string" },
        };

        const result = validateAddSimpleType(command, schemaWithElementAndSimpleType);
        expectInvalid(result);
        expect(result.error).toContain("already has an anonymous simpleType");
      });

      test("should reject when element already has a type attribute", () => {
        const schemaWithTypedElement = unmarshal(
          schema,
          `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="age" type="xs:integer"/>
</xs:schema>`
        );
        const command: AddSimpleTypeCommand = {
          type: "addSimpleType",
          payload: { parentId: "/element:age", baseType: "xs:integer" },
        };

        const result = validateAddSimpleType(command, schemaWithTypedElement);
        expectInvalid(result);
        expect(result.error).toContain("already has a type attribute");
      });

      test("should reject unrecognized baseType for anonymous simpleType", () => {
        const command: AddSimpleTypeCommand = {
          type: "addSimpleType",
          payload: { parentId: "/element:age", baseType: "xs:badType" },
        };

        const result = validateAddSimpleType(command, schemaWithElement);
        expectInvalid(result);
        expect(result.error).toBe("Base type: Invalid element type 'xs:badType': must be a built-in XSD type, a user-defined type in the schema, or a type from a valid import with a matching namespace prefix");
      });
    });

    describe("validateRemoveSimpleType (anonymous)", () => {
      test("should accept removing an anonymous simpleType that exists", () => {
        const command: RemoveSimpleTypeCommand = {
          type: "removeSimpleType",
          payload: { typeId: "/element:age/anonymousSimpleType[0]" },
        };

        const result = validateRemoveSimpleType(command, schemaWithElementAndSimpleType);
        expect(result.valid).toBe(true);
      });

      test("should reject when no anonymous simpleType exists in element", () => {
        const command: RemoveSimpleTypeCommand = {
          type: "removeSimpleType",
          payload: { typeId: "/element:age/anonymousSimpleType[0]" },
        };

        const result = validateRemoveSimpleType(command, schemaWithElement);
        expectInvalid(result);
        expect(result.error).toContain("No anonymous simpleType found");
      });

      test("should reject when parent element not found", () => {
        const command: RemoveSimpleTypeCommand = {
          type: "removeSimpleType",
          payload: { typeId: "/element:nonExistent/anonymousSimpleType[0]" },
        };

        const result = validateRemoveSimpleType(command, schemaWithElement);
        expectInvalid(result);
        expect(result.error).toContain("Parent not found");
      });
    });

    describe("validateModifySimpleType (anonymous)", () => {
      test("should accept modifying an anonymous simpleType that exists", () => {
        const command: ModifySimpleTypeCommand = {
          type: "modifySimpleType",
          payload: {
            typeId: "/element:age/anonymousSimpleType[0]",
            baseType: "xs:positiveInteger",
          },
        };

        const result = validateModifySimpleType(command, schemaWithElementAndSimpleType);
        expect(result.valid).toBe(true);
      });

      test("should reject when no anonymous simpleType exists in element", () => {
        const command: ModifySimpleTypeCommand = {
          type: "modifySimpleType",
          payload: {
            typeId: "/element:age/anonymousSimpleType[0]",
            baseType: "xs:string",
          },
        };

        const result = validateModifySimpleType(command, schemaWithElement);
        expectInvalid(result);
        expect(result.error).toContain("No anonymous simpleType found");
      });

      test("should reject when parent element not found", () => {
        const command: ModifySimpleTypeCommand = {
          type: "modifySimpleType",
          payload: { typeId: "/element:nonExistent/anonymousSimpleType[0]" },
        };

        const result = validateModifySimpleType(command, schemaWithElement);
        expectInvalid(result);
        expect(result.error).toContain("Parent not found");
      });
    });
  });
});

describe("Anonymous SimpleType in Attributes Validators", () => {
  const schemaWithAttribute = unmarshal(
    schema,
    `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attribute name="color"/>
</xs:schema>`
  );

  const schemaWithTypedAttribute = unmarshal(
    schema,
    `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attribute name="color" type="xs:string"/>
</xs:schema>`
  );

  const schemaWithAttributeAndSimpleType = unmarshal(
    schema,
    `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attribute name="color">
    <xs:simpleType>
      <xs:restriction base="xs:string">
        <xs:enumeration value="red"/>
      </xs:restriction>
    </xs:simpleType>
  </xs:attribute>
</xs:schema>`
  );

  describe("validateAddSimpleType (anonymous inside attribute)", () => {
    test("should accept adding an anonymous simpleType to a top-level attribute", () => {
      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: { parentId: "/attribute:color", baseType: "xs:string" },
      };

      const result = validateAddSimpleType(command, schemaWithAttribute);
      expect(result.valid).toBe(true);
    });

    test("should reject when parent attribute not found", () => {
      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: { parentId: "/attribute:nonExistent", baseType: "xs:string" },
      };

      const result = validateAddSimpleType(command, schemaWithAttribute);
      expectInvalid(result);
      expect(result.error).toContain("Parent not found");
    });

    test("should reject when attribute already has a type attribute", () => {
      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: { parentId: "/attribute:color", baseType: "xs:string" },
      };

      const result = validateAddSimpleType(command, schemaWithTypedAttribute);
      expectInvalid(result);
      expect(result.error).toContain("already has a type attribute");
    });

    test("should reject when attribute already has an anonymous simpleType", () => {
      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: { parentId: "/attribute:color", baseType: "xs:string" },
      };

      const result = validateAddSimpleType(command, schemaWithAttributeAndSimpleType);
      expectInvalid(result);
      expect(result.error).toContain("already has an anonymous simpleType");
    });
  });

  describe("validateRemoveSimpleType (anonymous inside attribute)", () => {
    test("should accept removing an anonymous simpleType that exists in an attribute", () => {
      const command: RemoveSimpleTypeCommand = {
        type: "removeSimpleType",
        payload: { typeId: "/attribute:color/anonymousSimpleType[0]" },
      };

      const result = validateRemoveSimpleType(command, schemaWithAttributeAndSimpleType);
      expect(result.valid).toBe(true);
    });

    test("should reject when no anonymous simpleType exists in attribute", () => {
      const command: RemoveSimpleTypeCommand = {
        type: "removeSimpleType",
        payload: { typeId: "/attribute:color/anonymousSimpleType[0]" },
      };

      const result = validateRemoveSimpleType(command, schemaWithAttribute);
      expectInvalid(result);
      expect(result.error).toContain("No anonymous simpleType found");
    });

    test("should reject when parent attribute not found", () => {
      const command: RemoveSimpleTypeCommand = {
        type: "removeSimpleType",
        payload: { typeId: "/attribute:nonExistent/anonymousSimpleType[0]" },
      };

      const result = validateRemoveSimpleType(command, schemaWithAttribute);
      expectInvalid(result);
      expect(result.error).toContain("Parent not found");
    });
  });

  describe("validateModifySimpleType (anonymous inside attribute)", () => {
    test("should accept modifying an anonymous simpleType that exists in an attribute", () => {
      const command: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: {
          typeId: "/attribute:color/anonymousSimpleType[0]",
          baseType: "xs:token",
        },
      };

      const result = validateModifySimpleType(command, schemaWithAttributeAndSimpleType);
      expect(result.valid).toBe(true);
    });

    test("should reject when no anonymous simpleType exists in attribute", () => {
      const command: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: {
          typeId: "/attribute:color/anonymousSimpleType[0]",
          baseType: "xs:string",
        },
      };

      const result = validateModifySimpleType(command, schemaWithAttribute);
      expectInvalid(result);
      expect(result.error).toContain("No anonymous simpleType found");
    });

    test("should reject when parent attribute not found", () => {
      const command: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: { typeId: "/attribute:nonExistent/anonymousSimpleType[0]" },
      };

      const result = validateModifySimpleType(command, schemaWithAttribute);
      expectInvalid(result);
      expect(result.error).toContain("Parent not found");
    });
  });
});

describe("ComplexType Validators", () => {
  let emptySchemaObj: schema;
  let schemaWithPersonType: schema;
  let schemaWithElement: schema;

  beforeEach(() => {
    emptySchemaObj = unmarshal(
      schema,
      `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`
    );

    schemaWithPersonType = unmarshal(
      schema,
      `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="PersonType">
    <xs:sequence/>
  </xs:complexType>
</xs:schema>`
    );

    schemaWithElement = unmarshal(
      schema,
      `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person"/>
</xs:schema>`
    );
  });

  describe("validateAddComplexType", () => {
    // ── top-level ──────────────────────────────────────────────────────────
    test("should accept a valid top-level addComplexType command", () => {
      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: { typeName: "PersonType", contentModel: "sequence" },
      };
      const result = validateAddComplexType(command, emptySchemaObj);
      expect(result.valid).toBe(true);
    });

    test("should reject addComplexType with missing typeName", () => {
      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: { typeName: "", contentModel: "sequence" },
      };
      const result = validateAddComplexType(command, emptySchemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Type name must be a valid XML name");
    });

    test("should reject addComplexType with missing contentModel", () => {
      // eslint-disable-next-line no-restricted-syntax -- `contentModel` absent intentionally; TypeScript requires it, but it is omitted to test the validator rejection
      const command = { type: "addComplexType", payload: { typeName: "TestType" } } as unknown as AddComplexTypeCommand;
      const result = validateAddComplexType(command, emptySchemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Content model is required");
    });

    test("should reject addComplexType when type name already exists", () => {
      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: { typeName: "PersonType", contentModel: "choice" },
      };
      const result = validateAddComplexType(command, schemaWithPersonType);
      expectInvalid(result);
      expect(result.error).toBe("Complex type 'PersonType' already exists in schema");
    });

    // ── anonymous ──────────────────────────────────────────────────────────
    test("should accept a valid anonymous addComplexType command", () => {
      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: { parentId: "/element:person", contentModel: "sequence" },
      };
      const result = validateAddComplexType(command, schemaWithElement);
      expect(result.valid).toBe(true);
    });

    test("should reject anonymous addComplexType when parent element not found", () => {
      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: { parentId: "/element:nonExistent", contentModel: "sequence" },
      };
      const result = validateAddComplexType(command, emptySchemaObj);
      expectInvalid(result);
      expect(result.error).toContain("Parent not found");
    });

    test("should reject anonymous addComplexType when element already has a complexType", () => {
      const schemaWithInlineCT = unmarshal(
        schema,
        `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person">
    <xs:complexType><xs:sequence/></xs:complexType>
  </xs:element>
</xs:schema>`
      );
      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: { parentId: "/element:person", contentModel: "choice" },
      };
      const result = validateAddComplexType(command, schemaWithInlineCT);
      expectInvalid(result);
      expect(result.error).toContain("already has an anonymous complexType");
    });

    test("should reject anonymous addComplexType when element already has a type attribute", () => {
      const schemaWithTypedEl = unmarshal(
        schema,
        `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
</xs:schema>`
      );
      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: { parentId: "/element:person", contentModel: "sequence" },
      };
      const result = validateAddComplexType(command, schemaWithTypedEl);
      expectInvalid(result);
      expect(result.error).toContain("already has a type attribute");
    });
  });

  describe("validateRemoveComplexType", () => {
    test("should reject removeComplexType with missing typeId", () => {
      const command: RemoveComplexTypeCommand = {
        type: "removeComplexType",
        payload: { typeId: "" },
      };
      const result = validateRemoveComplexType(command, emptySchemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Type ID cannot be empty");
    });

    test("should accept removeComplexType for an existing top-level type", () => {
      const command: RemoveComplexTypeCommand = {
        type: "removeComplexType",
        payload: { typeId: "/complexType:PersonType" },
      };
      const result = validateRemoveComplexType(command, schemaWithPersonType);
      expect(result.valid).toBe(true);
    });

    test("should reject removeComplexType when top-level type does not exist", () => {
      const command: RemoveComplexTypeCommand = {
        type: "removeComplexType",
        payload: { typeId: "/complexType:NonExistent" },
      };
      const result = validateRemoveComplexType(command, emptySchemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Complex type 'NonExistent' not found in schema");
    });

    test("should accept removeComplexType for an existing anonymous complexType", () => {
      const schemaWithInlineCT = unmarshal(
        schema,
        `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person">
    <xs:complexType><xs:sequence/></xs:complexType>
  </xs:element>
</xs:schema>`
      );
      const command: RemoveComplexTypeCommand = {
        type: "removeComplexType",
        payload: { typeId: "/element:person/anonymousComplexType[0]" },
      };
      const result = validateRemoveComplexType(command, schemaWithInlineCT);
      expect(result.valid).toBe(true);
    });

    test("should reject removeComplexType when parent element has no anonymous complexType", () => {
      const command: RemoveComplexTypeCommand = {
        type: "removeComplexType",
        payload: { typeId: "/element:person/anonymousComplexType[0]" },
      };
      const result = validateRemoveComplexType(command, schemaWithElement);
      expectInvalid(result);
      expect(result.error).toContain("No anonymous complexType found");
    });

    test("should reject removeComplexType when parent element not found", () => {
      const command: RemoveComplexTypeCommand = {
        type: "removeComplexType",
        payload: { typeId: "/element:nonExistent/anonymousComplexType[0]" },
      };
      const result = validateRemoveComplexType(command, emptySchemaObj);
      expectInvalid(result);
      expect(result.error).toContain("Parent not found");
    });
  });

  describe("validateModifyComplexType", () => {
    test("should reject modifyComplexType with missing typeId", () => {
      const command: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: { typeId: "" },
      };
      const result = validateModifyComplexType(command, emptySchemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Type ID cannot be empty");
    });

    test("should accept modifyComplexType for an existing top-level type", () => {
      const command: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: { typeId: "/complexType:PersonType", typeName: "NewName" },
      };
      const result = validateModifyComplexType(command, schemaWithPersonType);
      expect(result.valid).toBe(true);
    });

    test("should reject modifyComplexType when top-level type does not exist", () => {
      const command: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: { typeId: "/complexType:NonExistent" },
      };
      const result = validateModifyComplexType(command, emptySchemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Complex type 'NonExistent' not found in schema");
    });

    test("should reject modifyComplexType with invalid new typeName", () => {
      const command: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: { typeId: "/complexType:PersonType", typeName: "123invalid" },
      };
      const result = validateModifyComplexType(command, schemaWithPersonType);
      expectInvalid(result);
      expect(result.error).toBe("Type name must be a valid XML name");
    });

    test("should reject modifyComplexType with invalid contentModel", () => {
      // eslint-disable-next-line no-restricted-syntax -- `contentModel: "invalid"` outside the ContentModel union; cast needed to test validator rejection
      const command = { type: "modifyComplexType", payload: { typeId: "/complexType:PersonType", contentModel: "invalid" } } as unknown as ModifyComplexTypeCommand;
      const result = validateModifyComplexType(command, schemaWithPersonType);
      expectInvalid(result);
      expect(result.error).toContain("Content model must be one of");
    });

    test("should accept modifyComplexType for an existing anonymous complexType", () => {
      const schemaWithInlineCT = unmarshal(
        schema,
        `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person">
    <xs:complexType><xs:sequence/></xs:complexType>
  </xs:element>
</xs:schema>`
      );
      const command: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: {
          typeId: "/element:person/anonymousComplexType[0]",
          contentModel: "choice",
        },
      };
      const result = validateModifyComplexType(command, schemaWithInlineCT);
      expect(result.valid).toBe(true);
    });

    test("should reject modifyComplexType when parent element not found (anonymous)", () => {
      const command: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: { typeId: "/element:nonExistent/anonymousComplexType[0]" },
      };
      const result = validateModifyComplexType(command, emptySchemaObj);
      expectInvalid(result);
      expect(result.error).toContain("Parent not found");
    });

    test("should reject modifyComplexType when parent element has no anonymous complexType", () => {
      const command: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: { typeId: "/element:person/anonymousComplexType[0]" },
      };
      const result = validateModifyComplexType(command, schemaWithElement);
      expectInvalid(result);
      expect(result.error).toContain("No anonymous complexType found");
    });

    test("should reject providing typeName when modifying an anonymous complexType", () => {
      const schemaWithInlineCT = unmarshal(
        schema,
        `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person">
    <xs:complexType><xs:sequence/></xs:complexType>
  </xs:element>
</xs:schema>`
      );
      const command: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: {
          typeId: "/element:person/anonymousComplexType[0]",
          typeName: "SomeName",
        },
      };
      const result = validateModifyComplexType(command, schemaWithInlineCT);
      expectInvalid(result);
      expect(result.error).toContain("Cannot provide 'typeName'");
    });
  });
});
