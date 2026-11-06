/**
 * Unit tests for attribute validators.
 */

import { schema } from "../../shared/types.js";
import {
  AddAttributeCommand,
  RemoveAttributeCommand,
  ModifyAttributeCommand,
} from "../../shared/types.js";
import {
  validateAddAttribute,
  validateRemoveAttribute,
  validateModifyAttribute,
} from "./attributeValidators.js";
import { expectInvalid } from "../__tests__/validationTestHelpers.js";
import { schemaWith } from "../__tests__/schemaTestHelpers.js";

/** A top-level attribute `lang` and a complexType `T` with a local attribute `code` and a reference to `lang`. */
const ATTRIBUTES = `<xs:attribute name="lang" type="xs:string"/>
  <xs:complexType name="T">
    <xs:attribute name="code" type="xs:string"/>
    <xs:attribute ref="lang"/>
  </xs:complexType>
  <xs:element name="root" type="xs:string"/>`;

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
