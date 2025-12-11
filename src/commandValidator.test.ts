/**
 * Unit tests for CommandValidator class.
 * Tests the validate() method delegation logic with mocked validators.
 * No knowledge of validator implementation - proper unit testing with DI.
 */

import { CommandValidator, ValidatorFunctions } from "./commandValidator";
import { schema, SchemaCommand } from "../shared/types";
import { ValidationResult } from "./commandValidators/validationUtils";

describe("CommandValidator", () => {
  let mockSchema: schema;
  let mockValidators: ValidatorFunctions;
  let validator: CommandValidator;

  beforeEach(() => {
    mockSchema = {
      targetNamespace: "http://example.com/schema",
      version: "1.0",
      elementFormDefault: "qualified",
      attributeFormDefault: "unqualified",
    } as schema;

    // Create mock validator functions that return success by default
    const createMockValidator = (): jest.Mock<ValidationResult, [SchemaCommand, schema]> => {
      return jest.fn<ValidationResult, [SchemaCommand, schema]>(() => ({
        valid: true,
      }));
    };

    mockValidators = {
      validateAddElement: createMockValidator(),
      validateRemoveElement: createMockValidator(),
      validateModifyElement: createMockValidator(),
      validateAddAttribute: createMockValidator(),
      validateRemoveAttribute: createMockValidator(),
      validateModifyAttribute: createMockValidator(),
      validateAddSimpleType: createMockValidator(),
      validateRemoveSimpleType: createMockValidator(),
      validateModifySimpleType: createMockValidator(),
      validateAddComplexType: createMockValidator(),
      validateRemoveComplexType: createMockValidator(),
      validateModifyComplexType: createMockValidator(),
      validateAddGroup: createMockValidator(),
      validateRemoveGroup: createMockValidator(),
      validateModifyGroup: createMockValidator(),
      validateAddAttributeGroup: createMockValidator(),
      validateRemoveAttributeGroup: createMockValidator(),
      validateModifyAttributeGroup: createMockValidator(),
      validateAddAnnotation: createMockValidator(),
      validateRemoveAnnotation: createMockValidator(),
      validateModifyAnnotation: createMockValidator(),
      validateAddDocumentation: createMockValidator(),
      validateRemoveDocumentation: createMockValidator(),
      validateModifyDocumentation: createMockValidator(),
      validateAddImport: createMockValidator(),
      validateRemoveImport: createMockValidator(),
      validateModifyImport: createMockValidator(),
      validateAddInclude: createMockValidator(),
      validateRemoveInclude: createMockValidator(),
      validateModifyInclude: createMockValidator(),
    };

    validator = new CommandValidator(mockValidators);
  });

  describe("validate() method", () => {
    it("should handle unknown command types", () => {
      // Create an invalid command that TypeScript doesn't know about
      // This simulates runtime scenarios where command.type could be corrupted
      interface InvalidCommand {
        type: string;
        payload: Record<string, unknown>;
      }
      const invalidCommand: InvalidCommand = {
        type: "unknownCommandType",
        payload: {},
      };

      const result = validator.validate(
        invalidCommand as SchemaCommand,
        mockSchema
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Unknown command type");
      expect(result.error).toContain("unknownCommandType");

      // Verify no validators were called
      Object.values(mockValidators).forEach((mockValidator) => {
        expect(mockValidator).not.toHaveBeenCalled();
      });
    });

    it("should delegate addElement to validateAddElement", () => {
      const command: SchemaCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "testElement",
          elementType: "string",
        },
      };

      const result = validator.validate(command, mockSchema);

      expect(result.valid).toBe(true);
      expect(mockValidators.validateAddElement).toHaveBeenCalledWith(
        command,
        mockSchema
      );
      expect(mockValidators.validateAddElement).toHaveBeenCalledTimes(1);
    });

    it("should delegate addSimpleType to validateAddSimpleType", () => {
      const command: SchemaCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "testType",
          baseType: "string",
        },
      };

      const result = validator.validate(command, mockSchema);

      expect(result.valid).toBe(true);
      expect(mockValidators.validateAddSimpleType).toHaveBeenCalledWith(
        command,
        mockSchema
      );
      expect(mockValidators.validateAddSimpleType).toHaveBeenCalledTimes(1);
    });

    it("should delegate addGroup to validateAddGroup", () => {
      const command: SchemaCommand = {
        type: "addGroup",
        payload: {
          groupName: "testGroup",
          contentModel: "sequence",
        },
      };

      const result = validator.validate(command, mockSchema);

      expect(result.valid).toBe(true);
      expect(mockValidators.validateAddGroup).toHaveBeenCalledWith(
        command,
        mockSchema
      );
      expect(mockValidators.validateAddGroup).toHaveBeenCalledTimes(1);
    });

    it("should delegate addAnnotation to validateAddAnnotation", () => {
      const command: SchemaCommand = {
        type: "addAnnotation",
        payload: {
          targetId: "element1",
          documentation: "Test annotation",
        },
      };

      const result = validator.validate(command, mockSchema);

      expect(result.valid).toBe(true);
      expect(mockValidators.validateAddAnnotation).toHaveBeenCalledWith(
        command,
        mockSchema
      );
      expect(mockValidators.validateAddAnnotation).toHaveBeenCalledTimes(1);
    });

    it("should delegate addImport to validateAddImport", () => {
      const command: SchemaCommand = {
        type: "addImport",
        payload: {
          namespace: "http://example.com/imported",
          schemaLocation: "imported.xsd",
        },
      };

      const result = validator.validate(command, mockSchema);

      expect(result.valid).toBe(true);
      expect(mockValidators.validateAddImport).toHaveBeenCalledWith(
        command,
        mockSchema
      );
      expect(mockValidators.validateAddImport).toHaveBeenCalledTimes(1);
    });

    it("should return validator error when validator returns invalid", () => {
      const command: SchemaCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "", // Invalid: empty name
          elementType: "string",
        },
      };

      // Mock validator to return failure
      (mockValidators.validateAddElement as jest.Mock).mockReturnValueOnce({
        valid: false,
        error: "Element name cannot be empty",
      });

      const result = validator.validate(command, mockSchema);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Element name cannot be empty");
      expect(mockValidators.validateAddElement).toHaveBeenCalledWith(
        command,
        mockSchema
      );
    });

    it("should delegate modifyComplexType to validateModifyComplexType", () => {
      const command: SchemaCommand = {
        type: "modifyComplexType",
        payload: {
          typeId: "type1",
          contentModel: "sequence",
        },
      };

      const result = validator.validate(command, mockSchema);

      expect(result.valid).toBe(true);
      expect(mockValidators.validateModifyComplexType).toHaveBeenCalledWith(
        command,
        mockSchema
      );
      expect(mockValidators.validateModifyComplexType).toHaveBeenCalledTimes(1);
    });

    it("should delegate removeAttributeGroup to validateRemoveAttributeGroup", () => {
      const command: SchemaCommand = {
        type: "removeAttributeGroup",
        payload: {
          attributeGroupId: "attrGroup1",
        },
      };

      const result = validator.validate(command, mockSchema);

      expect(result.valid).toBe(true);
      expect(mockValidators.validateRemoveAttributeGroup).toHaveBeenCalledWith(
        command,
        mockSchema
      );
      expect(mockValidators.validateRemoveAttributeGroup).toHaveBeenCalledTimes(1);
    });
  });

  describe("default constructor behavior", () => {
    it("should use actual validators when no mocks are provided", () => {
      const defaultValidator = new CommandValidator();
      const command: SchemaCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "testElement",
          elementType: "string",
        },
      };

      // This should use the real validator and succeed
      const result = defaultValidator.validate(command, mockSchema);

      // Real validator should validate successfully
      expect(result.valid).toBe(true);
    });
  });
});
