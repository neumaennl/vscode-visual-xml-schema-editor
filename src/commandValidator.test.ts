/**
 * Unit tests for CommandValidator class.
 * Tests the validate() method delegation logic without duplicating validator module tests.
 */

import { CommandValidator } from "./commandValidator";
import { schema, SchemaCommand } from "../shared/types";

describe("CommandValidator", () => {
  let validator: CommandValidator;
  let mockSchema: schema;

  beforeEach(() => {
    validator = new CommandValidator();
    mockSchema = {
      targetNamespace: "http://example.com/schema",
      version: "1.0",
      elementFormDefault: "qualified",
      attributeFormDefault: "unqualified",
    } as schema;
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
    });

    it("should delegate addElement validation to elementValidators module", () => {
      const command: SchemaCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "testElement",
          elementType: "string",
        },
      };

      const result = validator.validate(command, mockSchema);

      // Validation should succeed (delegated to elementValidators)
      expect(result.valid).toBe(true);
    });

    it("should delegate addSimpleType validation to typeValidators module", () => {
      const command: SchemaCommand = {
        type: "addSimpleType",
        payload: {
          parentId: "schema",
          typeName: "testType",
          baseType: "string",
        },
      };

      const result = validator.validate(command, mockSchema);

      // Validation should succeed (delegated to typeValidators)
      expect(result.valid).toBe(true);
    });

    it("should delegate addGroup validation to groupValidators module", () => {
      const command: SchemaCommand = {
        type: "addGroup",
        payload: {
          parentId: "schema",
          groupName: "testGroup",
          contentModel: "sequence",
        },
      };

      const result = validator.validate(command, mockSchema);

      // Validation should succeed (delegated to groupValidators)
      expect(result.valid).toBe(true);
    });

    it("should delegate addAnnotation validation to annotationValidators module", () => {
      const command: SchemaCommand = {
        type: "addAnnotation",
        payload: {
          parentId: "element1",
          content: "Test annotation",
        },
      };

      const result = validator.validate(command, mockSchema);

      // Validation should succeed (delegated to annotationValidators)
      expect(result.valid).toBe(true);
    });

    it("should delegate addImport validation to schemaValidators module", () => {
      const command: SchemaCommand = {
        type: "addImport",
        payload: {
          parentId: "schema",
          namespace: "http://example.com/imported",
          schemaLocation: "imported.xsd",
        },
      };

      const result = validator.validate(command, mockSchema);

      // Validation should succeed (delegated to schemaValidators)
      expect(result.valid).toBe(true);
    });
  });
});
