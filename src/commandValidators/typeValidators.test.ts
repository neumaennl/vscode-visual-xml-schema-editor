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
      expect(result.valid).toBe(false);
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
      expect(result.valid).toBe(false);
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
      expect(result.valid).toBe(false);
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
      expect(result.valid).toBe(false);
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
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Type ID cannot be empty");
    });

    test("should accept removeSimpleType with valid typeId", () => {
      const command: RemoveSimpleTypeCommand = {
        type: "removeSimpleType",
        payload: {
          typeId: "/simpleType:AgeType",
        },
      };

      const result = validateRemoveSimpleType(command, emptySchemaObj);
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
      expect(result.valid).toBe(false);
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
      expect(result.valid).toBe(false);
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
      expect(result.valid).toBe(false);
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
