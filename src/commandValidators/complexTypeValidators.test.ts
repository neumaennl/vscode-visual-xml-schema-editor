/**
 * Unit tests for the complex type validators.
 */

import type {
  schema,
  AddComplexTypeCommand,
  RemoveComplexTypeCommand,
  ModifyComplexTypeCommand,
  ComplexTypeDerivationKind,
  Compositor,
} from "../../shared/types.js";
import {
  validateAddComplexType,
  validateRemoveComplexType,
  validateModifyComplexType,
} from "./complexTypeValidators.js";
import type { ValidationResult } from "../../shared/validation.js";
import { expectInvalid, type RuleCase } from "../../shared/__tests__/validationTestHelpers.js";
import { emptySchema, schemaWith } from "../../shared/__tests__/schemaTestHelpers.js";
import { readTestSchema } from "../__tests__/resourceTestHelpers.js";

/** A top-level element `person` with an inline complexType and an empty sequence. */
const PERSON_ELEMENT_WITH_EMPTY_SEQUENCE = `<xs:element name="person">
  <xs:complexType><xs:sequence/></xs:complexType>
</xs:element>`;

/**
 * A schema with a top-level attribute, an element without a type, a reference to it in an anonymous
 * complex type, and an anonymous complex type whose particle is a group reference.
 */
const COMPLEX_TYPE_PARENTS = `<xs:attribute name="lang" type="xs:language"/>
<xs:element name="plain"/>
<xs:element name="person"><xs:complexType><xs:sequence><xs:element ref="plain"/></xs:sequence></xs:complexType></xs:element>
<xs:group name="Contact"><xs:sequence/></xs:group>
<xs:element name="contact"><xs:complexType><xs:group ref="Contact"/></xs:complexType></xs:element>`;

/** The ID of the reference to `plain` in the anonymous complex type of `person`. */
const REF_ID = "/element:person/anonymousComplexType[0]/sequence[0]/element:plain[0]";

/** The ID of the anonymous complex type of `contact`, whose particle is a group reference. */
const CONTACT_TYPE_ID = "/element:contact/anonymousComplexType[0]";

/** A compositor that the payload type does not allow, as a message from the webview could have. */
const UNKNOWN_COMPOSITOR = "bogus" as Compositor;

/** A derivation kind that the payload type does not allow, as a message from the webview could have. */
const UNKNOWN_DERIVATION_KIND = "bogus" as ComplexTypeDerivationKind;

/**
 * Validates `addComplexType` with the payload against {@link COMPLEX_TYPE_PARENTS}.
 *
 * @param payload - The payload
 * @returns The validation result
 */
function validateAdd(payload: AddComplexTypeCommand["payload"]): ValidationResult {
  return validateAddComplexType({ type: "addComplexType", payload }, schemaWith(COMPLEX_TYPE_PARENTS));
}

/**
 * Validates `modifyComplexType` with the payload against {@link COMPLEX_TYPE_PARENTS}.
 *
 * @param payload - The payload
 * @returns The validation result
 */
function validateModify(payload: ModifyComplexTypeCommand["payload"]): ValidationResult {
  return validateModifyComplexType({ type: "modifyComplexType", payload }, schemaWith(COMPLEX_TYPE_PARENTS));
}

describe("ComplexType Validators", () => {
  let emptySchemaObj: schema;
  let schemaWithPersonType: schema;
  let schemaWithElement: schema;

  beforeEach(() => {
    emptySchemaObj = emptySchema();

    schemaWithPersonType = schemaWith(`<xs:complexType name="PersonType">
  <xs:sequence/>
</xs:complexType>`);

    schemaWithElement = schemaWith(`<xs:element name="person"/>`);
  });

  describe("validateAddComplexType", () => {
    // ── top-level ──────────────────────────────────────────────────────────
    test("should accept a valid top-level addComplexType command", () => {
      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: { typeName: "PersonType", compositor: "sequence" },
      };
      const result = validateAddComplexType(command, emptySchemaObj);
      expect(result.valid).toBe(true);
    });

    test("should reject addComplexType with missing typeName", () => {
      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: { typeName: "", compositor: "sequence" },
      };
      const result = validateAddComplexType(command, emptySchemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Type name must be a valid XML name");
    });

    test("should reject addComplexType with missing compositor", () => {
      // eslint-disable-next-line no-restricted-syntax -- `compositor` absent intentionally; TypeScript requires it, but it is omitted to test the validator rejection
      const command = { type: "addComplexType", payload: { typeName: "TestType" } } as unknown as AddComplexTypeCommand;
      const result = validateAddComplexType(command, emptySchemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Compositor is required");
    });

    test("should reject addComplexType when type name already exists", () => {
      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: { typeName: "PersonType", compositor: "choice" },
      };
      const result = validateAddComplexType(command, schemaWithPersonType);
      expectInvalid(result);
      expect(result.error).toBe("Complex type 'PersonType' already exists in schema");
    });

    // ── anonymous ──────────────────────────────────────────────────────────
    test("should accept an anonymous addComplexType command, also in place of a type attribute", () => {
      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: { parentId: "/element:person", compositor: "sequence" },
      };

      expect(validateAddComplexType(command, schemaWithElement).valid).toBe(true);
      expect(validateAddComplexType(command, schemaWith(`<xs:element name="person" type="xs:string"/>`)).valid).toBe(
        true
      );
    });

    test("should reject anonymous addComplexType when parent element not found", () => {
      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: { parentId: "/element:nonExistent", compositor: "sequence" },
      };
      const result = validateAddComplexType(command, emptySchemaObj);
      expectInvalid(result);
      expect(result.error).toContain("Parent not found");
    });

    test("should reject anonymous addComplexType when element already has a complexType", () => {
      const schemaWithInlineCT = schemaWith(PERSON_ELEMENT_WITH_EMPTY_SEQUENCE);
      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: { parentId: "/element:person", compositor: "choice" },
      };
      const result = validateAddComplexType(command, schemaWithInlineCT);
      expectInvalid(result);
      expect(result.error).toContain("already has an anonymous complexType");
    });

    test("should reject addComplexType with a derivation kind but no base type", () => {
      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: { typeName: "OrderType", compositor: "sequence", derivationKind: "restriction" },
      };
      const result = validateAddComplexType(command, emptySchemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Derivation kind requires a base type");
    });
  });

  describe("validateRemoveComplexType", () => {
    test("should reject removeComplexType with missing typeId", () => {
      const result = validateRemoveComplexType({ type: "removeComplexType", payload: { typeId: "" } }, emptySchemaObj);
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
      const schemaWithInlineCT = schemaWith(PERSON_ELEMENT_WITH_EMPTY_SEQUENCE);
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
      const result = validateModifyComplexType({ type: "modifyComplexType", payload: { typeId: "" } }, emptySchemaObj);
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

    test("should reject stale complexType rename replay after a successful rename", () => {
      const renamedSchema = schemaWith(`<xs:complexType name="PersonTypeRenamed">
  <xs:sequence/>
</xs:complexType>`);
      const command: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: {
          typeId: "/complexType:PersonType",
          typeName: "PersonTypeRenamed",
        },
      };

      const result = validateModifyComplexType(command, renamedSchema);
      expectInvalid(result);
      expect(result.error).toBe("Complex type 'PersonType' not found in schema");
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

    test.each([
      { field: "compositor", expected: "Compositor must be one of" },
      { field: "derivationKind", expected: "Derivation kind must be one of" },
    ])("should reject modifyComplexType with an invalid $field", ({ field, expected }) => {
      // eslint-disable-next-line no-restricted-syntax -- the value "invalid" is outside the union of the field; cast needed to test validator rejection
      const command = {
        type: "modifyComplexType",
        payload: { typeId: "/complexType:PersonType", [field]: "invalid" },
      } as unknown as ModifyComplexTypeCommand;
      const result = validateModifyComplexType(command, schemaWithPersonType);
      expectInvalid(result);
      expect(result.error).toContain(expected);
    });

    test("should accept modifyComplexType with restriction derivation kind", () => {
      const command: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: {
          typeId: "/complexType:PersonType",
          baseType: "xs:anyType",
          derivationKind: "restriction",
        },
      };
      const result = validateModifyComplexType(command, schemaWithPersonType);
      expect(result.valid).toBe(true);
    });

    test.each([
      [
        "a derivation kind for a type without a base type",
        (): schema => schemaWithPersonType,
        { typeId: "/complexType:PersonType", derivationKind: "restriction" as const },
        "Derivation kind requires a base type",
      ],
      [
        "an unknown base type",
        (): schema => schemaWithPersonType,
        { typeId: "/complexType:PersonType", baseType: "NoSuchType" },
        "Base type",
      ],
      [
        "a compositor for a type whose particle is a group reference",
        (): schema => readTestSchema("person-type-with-group-ref.xsd"),
        { typeId: "/complexType:PersonType", compositor: "sequence" as const },
        "already has a particle",
      ],
      [
        "a base type for a type with simple content",
        (): schema => readTestSchema("price-type-with-simple-content.xsd"),
        { typeId: "/complexType:PriceType", baseType: "xs:string" },
        "has simple content",
      ],
    ])("should reject modifyComplexType with %s", (_, schemaOf, payload, message) => {
      const command: ModifyComplexTypeCommand = { type: "modifyComplexType", payload };
      const result = validateModifyComplexType(command, schemaOf());
      expectInvalid(result);
      expect(result.error).toContain(message);
    });

    test("should accept modifyComplexType for an existing anonymous complexType", () => {
      const schemaWithInlineCT = schemaWith(PERSON_ELEMENT_WITH_EMPTY_SEQUENCE);
      const command: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: {
          typeId: "/element:person/anonymousComplexType[0]",
          compositor: "choice",
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
      const schemaWithInlineCT = schemaWith(PERSON_ELEMENT_WITH_EMPTY_SEQUENCE);
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

describe("Complex type rules", () => {
  test.each<RuleCase>([
    {
      rule: "an anonymous type in a missing parent",
      result: validateAdd({ parentId: "/element:missing", compositor: "sequence" }),
      error: "Parent not found: /element:missing",
    },
    {
      rule: "an anonymous type in an attribute",
      result: validateAdd({ parentId: "/attribute:lang", compositor: "sequence" }),
      error: "Parent of type 'topLevelAttribute' cannot contain a complexType",
    },
    {
      rule: "an anonymous type in an element reference",
      result: validateAdd({ parentId: REF_ID, compositor: "sequence" }),
      error: `'${REF_ID}' has a ref attribute and cannot carry an inline complexType`,
    },
    {
      rule: "an unknown compositor for an anonymous type",
      result: validateAdd({ parentId: "/element:plain", compositor: UNKNOWN_COMPOSITOR }),
      error: "Compositor must be one of: sequence, choice, all",
    },
    {
      rule: "an unknown derivation kind for an anonymous type",
      result: validateAdd({
        parentId: "/element:plain",
        compositor: "sequence",
        derivationKind: UNKNOWN_DERIVATION_KIND,
      }),
      error: "Derivation kind must be one of: extension, restriction",
    },
    {
      rule: "a derivation kind without a base type for an anonymous type",
      result: validateAdd({ parentId: "/element:plain", compositor: "sequence", derivationKind: "extension" }),
      error: "Derivation kind requires a base type",
    },
    {
      rule: "a top-level type without a name",
      result: validateAdd({ parentId: "/schema", compositor: "sequence" }),
      error: "Type name must be a valid XML name",
    },
    {
      rule: "an unknown derivation kind for a top-level type",
      result: validateAdd({
        parentId: "/schema",
        typeName: "T",
        compositor: "sequence",
        derivationKind: UNKNOWN_DERIVATION_KIND,
      }),
      error: "Derivation kind must be one of: extension, restriction",
    },
    {
      rule: "an unknown compositor when changing an anonymous type",
      result: validateModify({ typeId: CONTACT_TYPE_ID, compositor: UNKNOWN_COMPOSITOR }),
      error: "Compositor must be one of: sequence, choice, all",
    },
    {
      rule: "an unknown derivation kind when changing an anonymous type",
      result: validateModify({ typeId: CONTACT_TYPE_ID, derivationKind: UNKNOWN_DERIVATION_KIND }),
      error: "Derivation kind must be one of: extension, restriction",
    },
    {
      rule: "a compositor next to the group reference of an anonymous type",
      result: validateModify({ typeId: CONTACT_TYPE_ID, compositor: "sequence" }),
      error: `'${CONTACT_TYPE_ID}' already has a particle (a group reference) and cannot get a compositor`,
    },
  ])("should reject $rule", ({ result, error }) => {
    expect(result).toEqual({ valid: false, error });
  });
});

describe("names of complex types that other types have", () => {
  /** Two complex types and a simple type. */
  const TYPES = schemaWith(`<xs:complexType name="A"/><xs:complexType name="B"/>
<xs:simpleType name="S"><xs:restriction base="xs:string"/></xs:simpleType>`);

  test.each([
    ["another complex type", "B", "Complex type 'B' already exists in schema"],
    ["a simple type", "S", "Simple type 'S' already exists in schema"],
  ])("should reject renaming a complex type to the name of %s", (_case, typeName, error) => {
    const result = validateModifyComplexType(
      { type: "modifyComplexType", payload: { typeId: "/complexType:A", typeName } },
      TYPES
    );
    expectInvalid(result);
    expect(result.error).toBe(error);
  });

  test("should accept the unchanged name", () => {
    const result = validateModifyComplexType(
      { type: "modifyComplexType", payload: { typeId: "/complexType:A", typeName: "A" } },
      TYPES
    );
    expect(result).toEqual({ valid: true });
  });

  test("should reject a new complex type with the name of a simple type", () => {
    const result = validateAddComplexType(
      { type: "addComplexType", payload: { typeName: "S", compositor: "sequence" } },
      TYPES
    );
    expectInvalid(result);
    expect(result.error).toBe("Simple type 'S' already exists in schema");
  });
});

describe("compositors that cannot become an all", () => {
  test("should reject an all for a complex type whose sequence holds a choice", () => {
    const schemaObj = schemaWith(
      `<xs:complexType name="T"><xs:sequence><xs:choice><xs:element name="a" type="xs:string"/></xs:choice></xs:sequence></xs:complexType>`
    );

    const result = validateModifyComplexType(
      { type: "modifyComplexType", payload: { typeId: "/complexType:T", compositor: "all" } },
      schemaObj
    );

    expectInvalid(result);
    expect(result.error).toBe("A sequence with particles other than elements cannot become an all");
  });
});
