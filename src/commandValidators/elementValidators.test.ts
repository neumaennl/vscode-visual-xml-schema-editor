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
          attributeId: "attr1",
          attributeName: "validName",
          attributeType: "string",
        },
      };

      const result = validateModifyAttribute(command, schemaObj);
      expect(result.valid).toBe(true);
    });
  });
});
