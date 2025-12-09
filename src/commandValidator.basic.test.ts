/**
 * Unit tests for CommandValidator - Basic Commands.
 * Tests validation for element, attribute, and type commands.
 */

import { CommandValidator } from "./commandValidator";
import { unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../shared/types";
import {
  AddElementCommand,
  RemoveElementCommand,
  ModifyElementCommand,
  AddAttributeCommand,
  RemoveAttributeCommand,
  ModifyAttributeCommand,
  AddSimpleTypeCommand,
  RemoveSimpleTypeCommand,
  ModifySimpleTypeCommand,
  AddComplexTypeCommand,
  RemoveComplexTypeCommand,
  ModifyComplexTypeCommand,
} from "../shared/types";

describe("CommandValidator - Basic Commands", () => {
  let validator: CommandValidator;
  let schemaObj: schema;

  beforeEach(() => {
    validator = new CommandValidator();
    const simpleSchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
    schemaObj = unmarshal(schema, simpleSchemaXml);
  });

  describe("Element Commands", () => {
    test("should validate addElement command with valid payload", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "testElement",
          elementType: "string",
        },
      };

      const result = validator.validate(command, schemaObj);
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

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Element name is required");
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

      const result = validator.validate(command, schemaObj);
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

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Parent ID is required");
    });

    test("should reject removeElement with missing elementId", () => {
      const command: RemoveElementCommand = {
        type: "removeElement",
        payload: {
          elementId: "",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Element ID is required");
    });

    test("should reject modifyElement with missing elementId", () => {
      const command: ModifyElementCommand = {
        type: "modifyElement",
        payload: {
          elementId: "",
          elementName: "newName",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Element ID is required");
    });
  });

  describe("Attribute Commands", () => {
    test("should reject addAttribute with missing attributeName", () => {
      const command: AddAttributeCommand = {
        type: "addAttribute",
        payload: {
          parentId: "element-1",
          attributeName: "",
          attributeType: "string",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Attribute name is required");
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

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Parent ID is required");
    });

    test("should reject removeAttribute with missing attributeId", () => {
      const command: RemoveAttributeCommand = {
        type: "removeAttribute",
        payload: {
          attributeId: "",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Attribute ID is required");
    });

    test("should reject modifyAttribute with missing attributeId", () => {
      const command: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: {
          attributeId: "",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Attribute ID is required");
    });
  });

  describe("SimpleType Commands", () => {
    test("should reject addSimpleType with missing typeName", () => {
      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "",
          baseType: "string",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Type name is required");
    });

    test("should reject removeSimpleType with missing typeId", () => {
      const command: RemoveSimpleTypeCommand = {
        type: "removeSimpleType",
        payload: {
          typeId: "",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Type ID is required");
    });

    test("should reject modifySimpleType with missing typeId", () => {
      const command: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: {
          typeId: "",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Type ID is required");
    });
  });

  describe("ComplexType Commands", () => {
    test("should reject addComplexType with missing typeName", () => {
      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: {
          typeName: "",
          contentModel: "sequence",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Type name is required");
    });

    test("should reject addComplexType with missing contentModel", () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const command = {
        type: "addComplexType",
        payload: {
          typeName: "TestType",
          contentModel: "",
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Content model is required");
    });

    test("should reject removeComplexType with missing typeId", () => {
      const command: RemoveComplexTypeCommand = {
        type: "removeComplexType",
        payload: {
          typeId: "",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Type ID is required");
    });

    test("should reject modifyComplexType with missing typeId", () => {
      const command: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: {
          typeId: "",
        },
      };

      const result = validator.validate(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Type ID is required");
    });
  });
});
