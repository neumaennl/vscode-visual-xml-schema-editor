/**
 * Unit tests for attribute validators.
 */

import type { schema } from "../../shared/types.js";
import type { AddAttributeCommand, RemoveAttributeCommand, ModifyAttributeCommand } from "../../shared/types.js";
import { validateAddAttribute, validateRemoveAttribute, validateModifyAttribute } from "./attributeValidators.js";
import type { ValidationResult } from "../../shared/validation.js";
import { expectInvalid } from "../../shared/__tests__/validationTestHelpers.js";
import { schemaWith } from "../../shared/__tests__/schemaTestHelpers.js";

/** A top-level attribute `lang` and a complexType `T` with a local attribute `code` and a reference to `lang`. */
const ATTRIBUTES = `<xs:attribute name="lang" type="xs:string"/>
  <xs:complexType name="T">
    <xs:attribute name="code" type="xs:string"/>
    <xs:attribute ref="lang"/>
  </xs:complexType>
  <xs:element name="root" type="xs:string"/>`;

/** A complexType `T` that extends `B` and has the attribute `code` in its extension. */
const EXTENSION_WITH_ATTRIBUTE = `<xs:complexType name="T"><xs:complexContent><xs:extension base="B">
  <xs:attribute name="code" type="xs:string"/>
</xs:extension></xs:complexContent></xs:complexType>`;

describe("Attribute Validators", () => {
  let schemaObj: schema;

  beforeEach(() => {
    schemaObj = schemaWith(`<xs:attribute name="attr1" type="xs:string"/>`);
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
      expect(result.error).toBe("An attribute cannot have both a default value and a fixed value");
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
      expect(result.error).toBe("An attribute cannot have both a default value and a fixed value");
    });
  });

  describe("Reference attribute validation", () => {
    let refSchema: schema;

    beforeEach(() => {
      refSchema = schemaWith(`<xs:attribute name="lang" type="xs:string"/>
<xs:complexType name="PersonType">
  <xs:attribute name="lang" type="xs:string"/>
</xs:complexType>`);
    });

    test("should accept addAttribute with valid ref to complex type", () => {
      // PersonType must NOT already have a lang attribute to avoid the duplicate check
      const schemaWithoutDuplicate = schemaWith(`<xs:attribute name="lang" type="xs:string"/>
<xs:complexType name="PersonType"/>`);
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
      expect(result.error).toBe("A reference attribute cannot have a default or fixed value");
    });

    test("should reject addAttribute with invalid ref name", () => {
      const command: AddAttributeCommand = {
        type: "addAttribute",
        payload: { parentId: "/complexType:PersonType", ref: "123invalid" },
      };
      const result = validateAddAttribute(command, refSchema);
      expectInvalid(result);
      expect(result.error).toBe("Attribute ref must be a valid QName");
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
      expect(result.error).toBe("A reference attribute cannot have a default or fixed value");
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

    test.each<[string, AddAttributeCommand["payload"], string]>([
      ["a reference that the complexType already has", { parentId: "/complexType:T", ref: "lang" }, ATTRIBUTES],
      [
        "a name that a reference in the complexType already uses",
        { parentId: "/complexType:T", attributeName: "lang", attributeType: "xs:string" },
        ATTRIBUTES,
      ],
      [
        "a name that an attribute in the extension already uses",
        { parentId: "/complexType:T", attributeName: "code", attributeType: "xs:string" },
        EXTENSION_WITH_ATTRIBUTE,
      ],
    ])("should leave %s to the constraints that the pipeline checks after the command", (_case, payload, body) => {
      expect(validateAddAttribute({ type: "addAttribute", payload }, schemaWith(body))).toEqual({ valid: true });
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
        payload: { attributeId: "/complexType:T/attribute:lang", required: true },
      };

      const result = validateModifyAttribute(command, schemaWith(ATTRIBUTES));
      expect(result.valid).toBe(true);
    });

    test.each([
      {
        case: "changing an attribute to a reference with an invalid name",
        changes: { ref: "123-invalid" },
        error: "Attribute ref must be a valid QName",
      },
      {
        case: "renaming an attribute to an invalid name",
        changes: { attributeName: "123-invalid" },
        error: "Attribute name must be a valid XML name",
      },
    ])("should reject $case", ({ changes, error }) => {
      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: { attributeId: "/complexType:T/attribute:code", ...changes },
      };

      expect(validateModifyAttribute(command, schemaWith(ATTRIBUTES))).toEqual({ valid: false, error });
    });

    test("should accept changing an attribute to a reference to an existing top-level attribute", () => {
      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: { attributeId: "/complexType:T/attribute:code", ref: "lang" },
      };

      const result = validateModifyAttribute(
        command,
        schemaWith(
          `<xs:attribute name="lang" type="xs:string"/><xs:complexType name="T"><xs:attribute name="code" type="xs:string"/></xs:complexType>`
        )
      );
      expect(result.valid).toBe(true);
    });
  });

  describe("attributes in the extension of a derived complexType", () => {
    test("should accept removing an attribute in the extension", () => {
      const command: RemoveAttributeCommand = {
        type: "removeAttribute",
        payload: { attributeId: "/complexType:T/attribute:code" },
      };

      expect(validateRemoveAttribute(command, schemaWith(EXTENSION_WITH_ATTRIBUTE)).valid).toBe(true);
    });

    test("should accept modifying an attribute in the extension", () => {
      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: { attributeId: "/complexType:T/attribute:code", attributeType: "xs:integer" },
      };

      expect(validateModifyAttribute(command, schemaWith(EXTENSION_WITH_ATTRIBUTE)).valid).toBe(true);
    });
  });
});

describe("duplicates when an attribute changes", () => {
  /** {@link ATTRIBUTES} with a second top-level attribute `other`. */
  const SCHEMA = `${ATTRIBUTES}<xs:attribute name="other" type="xs:string"/>`;
  const CODE_ID = "/complexType:T/attribute:code";

  test.each<[string, ModifyAttributeCommand["payload"], ValidationResult]>([
    ["a local attribute to its own name", { attributeId: CODE_ID, attributeName: "code" }, { valid: true }],
    [
      "a local attribute to a name that only another parent has",
      { attributeId: CODE_ID, attributeName: "other" },
      { valid: true },
    ],
    [
      "a local attribute to the name of a reference, which the pipeline checks after the command",
      { attributeId: CODE_ID, attributeName: "lang" },
      { valid: true },
    ],
    [
      "a local attribute into a reference that the parent has, which the pipeline checks after the command",
      { attributeId: CODE_ID, ref: "lang" },
      { valid: true },
    ],
    [
      "a top-level attribute to the name of another one",
      { attributeId: "/attribute:other", attributeName: "lang" },
      { valid: false, error: "Cannot modify attribute: duplicate attribute name 'lang' in schema" },
    ],
  ])("should check changing %s", (_case, payload, expected) => {
    expect(validateModifyAttribute({ type: "modifyAttribute", payload }, schemaWith(SCHEMA))).toEqual(expected);
  });
});
