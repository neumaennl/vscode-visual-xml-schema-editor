/**
 * Unit tests for the simple type validators.
 */

import {
  schema,
  AddSimpleTypeCommand,
  RemoveSimpleTypeCommand,
  ModifySimpleTypeCommand,
} from "../../shared/types.js";
import {
  validateAddSimpleType,
  validateRemoveSimpleType,
  validateModifySimpleType,
} from "./simpleTypeValidators.js";
import { ValidationResult } from "./validationUtils.js";
import { expectInvalid } from "../__tests__/validationTestHelpers.js";
import { emptySchema, schemaWith } from "../__tests__/schemaTestHelpers.js";

/**
 * A schema with a simple type, an element with an anonymous list type, an element without a type,
 * a complex type and a reference to an element in an anonymous complex type.
 */
const SIMPLE_TYPE_PARENTS = `<xs:simpleType name="AgeType"><xs:restriction base="xs:integer"/></xs:simpleType>
<xs:element name="codes"><xs:simpleType><xs:list itemType="xs:token"/></xs:simpleType></xs:element>
<xs:element name="plain"/>
<xs:element name="person"><xs:complexType><xs:sequence><xs:element ref="plain"/></xs:sequence></xs:complexType></xs:element>
<xs:complexType name="PersonType"/>`;

/** The ID of the reference to `plain` in the anonymous complex type of `person`. */
const REF_ID = "/element:person/anonymousComplexType[0]/group:sequence[0]/element:plain[0]";

/** The error for the type name `Unknown`, which names no type. */
const UNKNOWN_TYPE_ERROR =
  "Invalid element type 'Unknown': must be a built-in XSD type, a user-defined type in the schema, a type from a valid import with a matching namespace prefix, or a type from an included schema";

/**
 * Validates `addSimpleType` with the payload against {@link SIMPLE_TYPE_PARENTS}.
 *
 * @param payload - The payload
 * @returns The validation result
 */
function validateAdd(payload: AddSimpleTypeCommand["payload"]): ValidationResult {
  return validateAddSimpleType({ type: "addSimpleType", payload }, schemaWith(SIMPLE_TYPE_PARENTS));
}

/**
 * Validates `modifySimpleType` with the payload against {@link SIMPLE_TYPE_PARENTS}.
 *
 * @param payload - The payload
 * @returns The validation result
 */
function validateModify(payload: ModifySimpleTypeCommand["payload"]): ValidationResult {
  return validateModifySimpleType({ type: "modifySimpleType", payload }, schemaWith(SIMPLE_TYPE_PARENTS));
}

describe("SimpleType Validators", () => {
  let emptySchemaObj: schema;
  let schemaWithAgeType: schema;

  beforeEach(() => {
    emptySchemaObj = emptySchema();

    schemaWithAgeType = schemaWith(`<xs:simpleType name="AgeType">
  <xs:restriction base="xs:integer"/>
</xs:simpleType>`);
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

    test("should reject addSimpleType restriction without any facets", () => {
      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "NameType",
          baseType: "xs:string",
          restrictions: {},
        },
      };

      const result = validateAddSimpleType(command, emptySchemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Restriction simpleType body must include at least one facet");
    });

    test("should reject addSimpleType with missing body for a restriction body", () => {
      const command = {
        type: "addSimpleType",
        payload: {
          typeName: "NameType",
        },
      } as AddSimpleTypeCommand;

      const result = validateAddSimpleType(command, emptySchemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Simple type body is required");
    });

    test("should reject addSimpleType with missing body for a list body", () => {
      const command = {
        type: "addSimpleType",
        payload: {
          typeName: "TokenListType",
        },
      } as AddSimpleTypeCommand;

      const result = validateAddSimpleType(command, emptySchemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Simple type body is required");
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
      expect(result.error).toBe("Base type: Invalid element type 'xs:nonExistentType': must be a built-in XSD type, a user-defined type in the schema, a type from a valid import with a matching namespace prefix, or a type from an included schema");
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

    test("should accept addSimpleType list with valid item type", () => {
      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "TokenListType",
          listItemType: "xs:token",
        },
      };

      const result = validateAddSimpleType(command, emptySchemaObj);
      expect(result.valid).toBe(true);
    });

    test("should reject addSimpleType list with missing item type", () => {
      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "TokenListType",
          listItemType: "",
        },
      };

      const result = validateAddSimpleType(command, emptySchemaObj);
      expectInvalid(result);
      expect(result.error).toBe("List item type cannot be empty");
    });

    test("should accept addSimpleType union with valid member types", () => {
      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "TextOrNumberType",
          unionMemberTypes: ["xs:string", "xs:integer"],
        },
      };

      const result = validateAddSimpleType(command, emptySchemaObj);
      expect(result.valid).toBe(true);
    });

    test("should reject addSimpleType union with empty member type list", () => {
      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "TextOrNumberType",
          unionMemberTypes: [],
        },
      };

      const result = validateAddSimpleType(command, emptySchemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Union member types cannot be empty");
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

    test("should accept facets without a base type for a restriction", () => {
      const command: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:AgeType", restrictions: { minInclusive: "0" } },
      };

      expect(validateModifySimpleType(command, schemaWithAgeType).valid).toBe(true);
    });

    test("should reject facets without a base type for a list", () => {
      const listSchema = schemaWith(`<xs:simpleType name="Ages"><xs:list itemType="xs:integer"/></xs:simpleType>`);
      const command: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:Ages", restrictions: { minInclusive: "0" } },
      };

      const result = validateModifySimpleType(command, listSchema);
      expectInvalid(result);
      expect(result.error).toBe("Cannot apply restrictions without a base type");
    });

    test("should reject stale simpleType rename replay after a successful rename", () => {
      const renamedSchema = schemaWith(`<xs:simpleType name="AgeTypeRenamed">
  <xs:restriction base="xs:int"/>
</xs:simpleType>`);
      const command: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: {
          typeId: "/simpleType:AgeType",
          typeName: "AgeTypeRenamed",
        },
      };

      const result = validateModifySimpleType(command, renamedSchema);
      expectInvalid(result);
      expect(result.error).toBe("Simple type 'AgeType' not found in schema");
    });
  });

  describe("Anonymous SimpleType Validators", () => {
    let schemaWithElement: schema;
    let schemaWithElementAndSimpleType: schema;

    beforeEach(() => {
      schemaWithElement = schemaWith(`<xs:element name="age"/>`);

      schemaWithElementAndSimpleType = schemaWith(`<xs:element name="age">
  <xs:simpleType>
    <xs:restriction base="xs:integer"/>
  </xs:simpleType>
</xs:element>`);
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

      test("should accept replacing an element type attribute with an anonymous simpleType", () => {
        const schemaWithTypedElement = schemaWith(`<xs:element name="age" type="xs:integer"/>`);
        const command: AddSimpleTypeCommand = {
          type: "addSimpleType",
          payload: { parentId: "/element:age", baseType: "xs:integer" },
        };

        const result = validateAddSimpleType(command, schemaWithTypedElement);
        expect(result.valid).toBe(true);
      });

      test("should reject unrecognized baseType for anonymous simpleType", () => {
        const command: AddSimpleTypeCommand = {
          type: "addSimpleType",
          payload: { parentId: "/element:age", baseType: "xs:badType" },
        };

        const result = validateAddSimpleType(command, schemaWithElement);
        expectInvalid(result);
        expect(result.error).toBe("Base type: Invalid element type 'xs:badType': must be a built-in XSD type, a user-defined type in the schema, a type from a valid import with a matching namespace prefix, or a type from an included schema");
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

      test("should reject providing typeName when modifying an anonymous simpleType", () => {
        const command: ModifySimpleTypeCommand = {
          type: "modifySimpleType",
          payload: {
            typeId: "/element:age/anonymousSimpleType[0]",
            baseType: "xs:positiveInteger",
            typeName: "AgeType",
          },
        };

        const result = validateModifySimpleType(command, schemaWithElementAndSimpleType);
        expectInvalid(result);
        expect(result.error).toBe("Cannot provide 'typeName' when modifying an anonymous simpleType");
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
  const schemaWithAttribute = schemaWith(`<xs:attribute name="color"/>`);

  const schemaWithTypedAttribute = schemaWith(`<xs:attribute name="color" type="xs:string"/>`);

  const schemaWithAttributeAndSimpleType = schemaWith(`<xs:attribute name="color">
  <xs:simpleType>
    <xs:restriction base="xs:string">
      <xs:enumeration value="red"/>
    </xs:restriction>
  </xs:simpleType>
</xs:attribute>`);

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

    test("should accept replacing an attribute type attribute with an anonymous simpleType", () => {
      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: { parentId: "/attribute:color", baseType: "xs:string" },
      };

      const result = validateAddSimpleType(command, schemaWithTypedAttribute);
      expect(result.valid).toBe(true);
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

describe("Simple type rules", () => {
  test.each<{ rule: string; result: ValidationResult; error: string }>([
    {
      rule: "facets that are all undefined",
      result: validateAdd({ parentId: "/schema", typeName: "T", baseType: "xs:string", restrictions: { minLength: undefined } }),
      error: "Restriction simpleType body must include at least one facet",
    },
    {
      rule: "an empty pattern list as the only facet",
      result: validateAdd({ parentId: "/schema", typeName: "T", baseType: "xs:string", restrictions: { pattern: [] } }),
      error: "Restriction simpleType body must include at least one facet",
    },
    {
      rule: "facets without a base type for a new type",
      result: validateAdd({ parentId: "/schema", typeName: "T", restrictions: { minLength: 1 } }),
      error: "Base type cannot be empty",
    },
    {
      rule: "a body of two kinds",
      result: validateAdd({ parentId: "/schema", typeName: "T", baseType: "xs:string", listItemType: "xs:token" }),
      error: "Simple type body must be specified as exactly one of restriction, list, or union",
    },
    {
      rule: "an unknown list item type",
      result: validateAdd({ parentId: "/schema", typeName: "T", listItemType: "Unknown" }),
      error: `List item type: ${UNKNOWN_TYPE_ERROR}`,
    },
    {
      rule: "an empty union member",
      result: validateAdd({ parentId: "/schema", typeName: "T", unionMemberTypes: ["xs:int", " "] }),
      error: "Union member types cannot contain empty entries",
    },
    {
      rule: "an unknown union member",
      result: validateAdd({ parentId: "/schema", typeName: "T", unionMemberTypes: ["Unknown"] }),
      error: "Union member type 'Unknown' is not a recognized type",
    },
    {
      rule: "a top-level type without a name",
      result: validateAdd({ parentId: "/schema", baseType: "xs:string" }),
      error: "Type name must be a valid XML name",
    },
    {
      rule: "an anonymous type in a missing parent",
      result: validateAdd({ parentId: "/element:missing", baseType: "xs:string" }),
      error: "Parent not found: /element:missing",
    },
    {
      rule: "an anonymous type in a complex type",
      result: validateAdd({ parentId: "/complexType:PersonType", baseType: "xs:string" }),
      error: "Parent of type 'topLevelComplexType' cannot contain a simpleType",
    },
    {
      rule: "an anonymous type in an element reference",
      result: validateAdd({ parentId: REF_ID, baseType: "xs:string" }),
      error: `'${REF_ID}' has a ref attribute and cannot carry an inline simpleType`,
    },
    {
      rule: "changing an anonymous type that does not exist",
      result: validateModify({ typeId: "/element:plain/anonymousSimpleType[0]", documentation: "Docs" }),
      error: "No anonymous simpleType found in parent: /element:plain",
    },
    {
      rule: "facets without a base type for an anonymous list type",
      result: validateModify({ typeId: "/element:codes/anonymousSimpleType[0]", restrictions: { minLength: 1 } }),
      error: "Cannot apply restrictions without a base type",
    },
    {
      rule: "an anonymous type ID without a parent",
      result: validateRemoveSimpleType(
        { type: "removeSimpleType", payload: { typeId: "/anonymousSimpleType[0]" } },
        schemaWith(SIMPLE_TYPE_PARENTS)
      ),
      error: "Invalid anonymous simpleType ID: /anonymousSimpleType[0]",
    },
  ])("should reject $rule", ({ result, error }) => {
    expect(result).toEqual({ valid: false, error });
  });

  test("should ignore undefined facets next to defined ones", () => {
    const result = validateAdd({
      parentId: "/schema",
      typeName: "T",
      baseType: "xs:string",
      restrictions: { minLength: undefined, maxLength: 5 },
    });

    expect(result).toEqual({ valid: true });
  });
});
