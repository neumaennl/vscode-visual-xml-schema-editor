/**
 * Unit tests for type validators (SimpleType and ComplexType).
 */

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

describe("SimpleType Validators", () => {
  let schemaObj: schema;

  beforeEach(() => {
    const simpleSchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
    schemaObj = unmarshal(schema, simpleSchemaXml);
  });

  describe("validateAddSimpleType", () => {
    test("should reject addSimpleType with missing typeName", () => {
      const command: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "",
          baseType: "string",
        },
      };

      const result = validateAddSimpleType(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Type name must be a valid XML name");
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

      const result = validateRemoveSimpleType(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Type ID cannot be empty");
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

      const result = validateModifySimpleType(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Type ID cannot be empty");
    });
  });
});

describe("ComplexType Validators", () => {
  let schemaObj: schema;

  beforeEach(() => {
    const simpleSchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
    schemaObj = unmarshal(schema, simpleSchemaXml);
  });

  describe("validateAddComplexType", () => {
    test("should reject addComplexType with missing typeName", () => {
      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: {
          typeName: "",
          contentModel: "sequence",
        },
      };

      const result = validateAddComplexType(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Type name must be a valid XML name");
    });

    test("should reject addComplexType with missing contentModel", () => {
      // Using type assertion to test validation of missing content model
      const command = {
        type: "addComplexType",
        payload: {
          parentId: "schema",
          typeName: "TestType",
          contentModel: undefined,
        },
      } as unknown as AddComplexTypeCommand;

      const result = validateAddComplexType(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Content model is required");
    });
  });

  describe("validateRemoveComplexType", () => {
    test("should reject removeComplexType with missing typeId", () => {
      const command: RemoveComplexTypeCommand = {
        type: "removeComplexType",
        payload: {
          typeId: "",
        },
      };

      const result = validateRemoveComplexType(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Type ID cannot be empty");
    });
  });

  describe("validateModifyComplexType", () => {
    test("should reject modifyComplexType with missing typeId", () => {
      const command: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: {
          typeId: "",
        },
      };

      const result = validateModifyComplexType(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Type ID cannot be empty");
    });

    test("should accept modifyComplexType with valid payload", () => {
      const command: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: {
          typeId: "type1",
          typeName: "validTypeName",
        },
      };

      const result = validateModifyComplexType(command, schemaObj);
      expect(result.valid).toBe(true);
    });
  });
});
