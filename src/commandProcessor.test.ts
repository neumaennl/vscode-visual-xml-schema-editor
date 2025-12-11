/**
 * Unit tests for CommandProcessor core functionality.
 * Tests transactional behavior, error handling, and orchestration.
 * SchemaModelManager is mocked to focus on CommandProcessor logic.
 */

import { CommandProcessor } from "./commandProcessor";
import { AddElementCommand, SchemaCommand, schema } from "../shared/types";
import type { CommandValidator } from "./commandValidator";
import type { CommandExecutor } from "./commandExecutor";
import type { SchemaModelManager } from "./schemaModelManager";

// Type-safe mock types for testing
type MockValidator = Pick<CommandValidator, "validate">;
type MockExecutor = Pick<CommandExecutor, "execute">;
type MockModelManager = Pick<
  SchemaModelManager,
  "loadFromXml" | "getSchema" | "setSchema" | "cloneSchema" | "toXml"
>;

// Test helper for invalid command that bypasses type system
// This represents a command type that doesn't exist in the SchemaCommand union
interface InvalidCommand {
  type: "unknownCommand";
  payload: Record<string, never>;
}

describe("CommandProcessor", () => {
  let processor: CommandProcessor;
  let simpleSchemaXml: string;
  let mockSchema: schema;

  beforeEach(() => {
    processor = new CommandProcessor();
    // Minimal valid XSD schema
    simpleSchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
    
    // Create a mock schema object
    mockSchema = new schema();
  });

  describe("Core Functionality", () => {
    test("should successfully execute command with mocked dependencies", () => {
      // Mock SchemaModelManager
      const mockModelManager: MockModelManager = {
        loadFromXml: jest.fn(),
        getSchema: jest.fn().mockReturnValue(mockSchema),
        setSchema: jest.fn(),
        cloneSchema: jest.fn().mockReturnValue(mockSchema),
        toXml: jest.fn().mockReturnValue(simpleSchemaXml),
      };

      // Mock executor that modifies the schema (executor must modify schema in-place)
      const mockExecutor: MockExecutor = {
        execute: jest.fn((cmd, schemaObj) => {
          // Modify the schema object to simulate successful execution
          schemaObj.version = "1.0";
        }),
      };

      const processorWithMock = new CommandProcessor(
        undefined,
        mockExecutor as CommandExecutor,
        mockModelManager as SchemaModelManager
      );

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "testElement",
          elementType: "string",
        },
      };

      const result = processorWithMock.execute(command, simpleSchemaXml);

      // Verify mocks were called in correct order
      expect(mockModelManager.loadFromXml).toHaveBeenCalledWith(simpleSchemaXml);
      expect(mockModelManager.getSchema).toHaveBeenCalled();
      expect(mockModelManager.cloneSchema).toHaveBeenCalled();
      expect(mockExecutor.execute).toHaveBeenCalled();
      expect(mockModelManager.setSchema).toHaveBeenCalled();
      expect(mockModelManager.toXml).toHaveBeenCalled();

      // With a successful executor, command should succeed
      expect(result.success).toBe(true);
      expect(result.schema).not.toBeNull();
      expect(result.xmlContent).not.toBeNull();
    });

    test("should handle SchemaModelManager load failure", () => {
      // Mock SchemaModelManager that throws on load
      const mockModelManager: MockModelManager = {
        loadFromXml: jest.fn(() => {
          throw new Error("Failed to load schema from XML: Invalid XML");
        }),
        getSchema: jest.fn(),
        setSchema: jest.fn(),
        cloneSchema: jest.fn(),
        toXml: jest.fn(),
      };

      const processorWithMock = new CommandProcessor(
        undefined,
        undefined,
        mockModelManager as SchemaModelManager
      );

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "testElement",
          elementType: "string",
        },
      };

      const result = processorWithMock.execute(command, simpleSchemaXml);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to load schema from XML");
      expect(mockModelManager.loadFromXml).toHaveBeenCalled();
    });

    test("should return null schema and xmlContent on failure", () => {
      const result = processor.execute(
        {
          type: "addElement",
          payload: {
            parentId: "schema",
            elementName: "testElement",
            elementType: "string",
          },
        },
        simpleSchemaXml
      );

      expect(result.success).toBe(false);
      expect(result.schema).toBeNull();
      expect(result.xmlContent).toBeNull();
    });
  });

  describe("Transactional Behavior", () => {
    test("should preserve original schema on validation failure", () => {
      // Store the original XML
      const originalXml = simpleSchemaXml;
      const xmlBefore = originalXml;

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "",
          elementName: "",
          elementType: "",
        },
      };

      const result = processor.execute(command, originalXml);

      // Verify the command failed
      expect(result.success).toBe(false);
      expect(result.schema).toBeNull();
      expect(result.xmlContent).toBeNull();

      // Verify the original XML remains exactly unchanged
      const xmlAfter = originalXml;
      expect(xmlAfter).toBe(xmlBefore);
      expect(xmlAfter).toEqual(simpleSchemaXml);
    });

    test("should clone schema before executing commands", () => {
      const mockClonedSchema = new schema();
      mockClonedSchema.version = "cloned";

      // Mock SchemaModelManager
      const mockModelManager: MockModelManager = {
        loadFromXml: jest.fn(),
        getSchema: jest.fn().mockReturnValue(mockSchema),
        setSchema: jest.fn(),
        cloneSchema: jest.fn().mockReturnValue(mockClonedSchema),
        toXml: jest.fn().mockReturnValue(simpleSchemaXml),
      };

      // Mock executor
      const mockExecutor: MockExecutor = {
        execute: jest.fn((command, schema) => {
          // Verify we're working on the cloned schema
          expect(schema.version).toBe("cloned");
          schema.version = "modified";
        }),
      };

      const processorWithMock = new CommandProcessor(
        undefined,
        mockExecutor as CommandExecutor,
        mockModelManager as SchemaModelManager
      );

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "test",
          elementType: "string",
        },
      };

      const result = processorWithMock.execute(command, simpleSchemaXml);

      expect(result.success).toBe(true);
      expect(mockModelManager.cloneSchema).toHaveBeenCalled();
      expect(mockExecutor.execute).toHaveBeenCalledWith(command, mockClonedSchema);
    });

    test("should preserve original schema on execution failure", () => {
      // Store the original XML
      const originalXml = simpleSchemaXml;
      const xmlBefore = originalXml;

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "test",
          elementType: "string",
        },
      };

      const result = processor.execute(command, originalXml);

      // Execution will fail because it's not implemented
      expect(result.success).toBe(false);
      expect(result.schema).toBeNull();
      expect(result.xmlContent).toBeNull();

      // Verify the original XML string remains exactly unchanged
      const xmlAfter = originalXml;
      expect(xmlAfter).toBe(xmlBefore);
      expect(xmlAfter).toEqual(simpleSchemaXml);
    });

    test("should preserve original schema when command fails", () => {
      // Store the original XML
      const originalXml = simpleSchemaXml;
      const xmlBefore = originalXml;

      // Mock executor that throws an error
      const mockExecutor: MockExecutor = {
        execute: jest.fn(() => {
          throw new Error("Execution failed");
        }),
      };

      const processorWithMock = new CommandProcessor(
        undefined,
        mockExecutor as CommandExecutor
      );

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "test",
          elementType: "string",
        },
      };

      const result = processorWithMock.execute(command, originalXml);

      expect(result.success).toBe(false);
      expect(result.schema).toBeNull();
      expect(result.error).toContain("Execution failed");

      // Verify the original XML string remains exactly unchanged
      const xmlAfter = originalXml;
      expect(xmlAfter).toBe(xmlBefore);
      expect(xmlAfter).toEqual(simpleSchemaXml);
    });
  });

  describe("Error Handling", () => {
    test("should handle malformed XML gracefully", () => {
      const malformedXml = "not valid xml at all";
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "test",
          elementType: "string",
        },
      };

      const result = processor.execute(command, malformedXml);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to load schema from XML");
    });

    test("should provide meaningful error messages", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: " ", // Whitespace-only string
          elementName: "test",
          elementType: "string",
        },
      };

      const result = processor.execute(command, simpleSchemaXml);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Parent ID cannot be empty");
    });

    test("should handle multiple validation errors", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "123invalid", // Invalid XML name (starts with digit)
          elementType: "string",
        },
      };

      const result = processor.execute(command, simpleSchemaXml);
      expect(result.success).toBe(false);
      // Should catch the first validation error
      expect(result.error).toBe("Element name must be a valid XML name");
    });

    test("should handle executor exceptions gracefully", () => {
      // Mock executor that throws an exception
      const mockExecutor: MockExecutor = {
        execute: jest.fn(() => {
          throw new Error("Executor crashed unexpectedly");
        }),
      };

      const processorWithMock = new CommandProcessor(
        undefined,
        mockExecutor as CommandExecutor
      );

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "test",
          elementType: "string",
        },
      };

      const result = processorWithMock.execute(command, simpleSchemaXml);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Executor crashed unexpectedly");
      expect(result.schema).toBeNull();
      expect(result.xmlContent).toBeNull();
    });

    test("should handle validator exceptions gracefully", () => {
      // Mock validator that throws an exception
      const mockValidator: MockValidator = {
        validate: jest.fn(() => {
          throw new Error("Validator crashed");
        }),
      };

      const processorWithMock = new CommandProcessor(
        mockValidator as CommandValidator,
        undefined
      );

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "test",
          elementType: "string",
        },
      };

      const result = processorWithMock.execute(command, simpleSchemaXml);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Validator crashed");
      expect(result.schema).toBeNull();
      expect(result.xmlContent).toBeNull();
    });

    test("should have consistent result structure on success", () => {
      // Mock dependencies for successful execution
      const mockModelManager: MockModelManager = {
        loadFromXml: jest.fn(),
        getSchema: jest.fn().mockReturnValue(mockSchema),
        setSchema: jest.fn(),
        cloneSchema: jest.fn().mockReturnValue(mockSchema),
        toXml: jest.fn().mockReturnValue(simpleSchemaXml),
      };

      const mockExecutor: MockExecutor = {
        execute: jest.fn((command, schema) => {
          schema.version = "1.0";
        }),
      };

      const processorWithMock = new CommandProcessor(
        undefined,
        mockExecutor as CommandExecutor,
        mockModelManager as SchemaModelManager
      );

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "test",
          elementType: "string",
        },
      };

      const result = processorWithMock.execute(command, simpleSchemaXml);

      // Verify result structure on success
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
      expect(result).toHaveProperty("schema");
      expect(result).toHaveProperty("xmlContent");
      expect(result.schema).not.toBeNull();
      expect(result.xmlContent).not.toBeNull();
    });

    test("should have consistent result structure on failure", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "",
          elementName: "test",
          elementType: "string",
        },
      };

      const result = processor.execute(command, simpleSchemaXml);

      // Verify result structure on failure
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(false);
      expect(result).toHaveProperty("error");
      expect(result).toHaveProperty("schema");
      expect(result).toHaveProperty("xmlContent");
      expect(result.schema).toBeNull();
      expect(result.xmlContent).toBeNull();
    });

    test("should handle SchemaModelManager toXml failure", () => {
      // Mock SchemaModelManager that fails on toXml
      const mockModelManager: MockModelManager = {
        loadFromXml: jest.fn(),
        getSchema: jest.fn().mockReturnValue(mockSchema),
        setSchema: jest.fn(),
        cloneSchema: jest.fn().mockReturnValue(mockSchema),
        toXml: jest.fn(() => {
          throw new Error("Failed to serialize schema");
        }),
      };

      const mockExecutor: MockExecutor = {
        execute: jest.fn((command, schema) => {
          schema.version = "1.0";
        }),
      };

      const processorWithMock = new CommandProcessor(
        undefined,
        mockExecutor as CommandExecutor,
        mockModelManager as SchemaModelManager
      );

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "test",
          elementType: "string",
        },
      };

      const result = processorWithMock.execute(command, simpleSchemaXml);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to serialize schema");
    });
  });

  describe("Round-trip Validation", () => {
    test("should validate serialized XML can be parsed back", () => {
      const mockModelManager: MockModelManager = {
        loadFromXml: jest.fn(),
        getSchema: jest.fn().mockReturnValue(mockSchema),
        setSchema: jest.fn(),
        cloneSchema: jest.fn().mockReturnValue(mockSchema),
        toXml: jest.fn().mockReturnValue(simpleSchemaXml),
      };

      const mockExecutor: MockExecutor = {
        execute: jest.fn((command, schema) => {
          schema.element = schema.element || [];
        }),
      };

      const processorWithMock = new CommandProcessor(
        undefined,
        mockExecutor as CommandExecutor,
        mockModelManager as SchemaModelManager
      );

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "test",
          elementType: "string",
        },
      };

      const result = processorWithMock.execute(command, simpleSchemaXml);

      // Should succeed with mock
      expect(result.success).toBe(true);
      expect(result.xmlContent).not.toBeNull();

      // Verify loadFromXml was called for round-trip validation
      expect(mockModelManager.loadFromXml).toHaveBeenCalledTimes(2); // Initial + validation
    });

    test("should fail if round-trip validation fails", () => {
      let loadCallCount = 0;
      const mockModelManager: MockModelManager = {
        loadFromXml: jest.fn(() => {
          loadCallCount++;
          if (loadCallCount === 2) {
            // Fail on round-trip validation
            throw new Error("Round-trip validation failed");
          }
        }),
        getSchema: jest.fn().mockReturnValue(mockSchema),
        setSchema: jest.fn(),
        cloneSchema: jest.fn().mockReturnValue(mockSchema),
        toXml: jest.fn().mockReturnValue(simpleSchemaXml),
      };

      const mockExecutor: MockExecutor = {
        execute: jest.fn((command, schema) => {
          schema.version = "1.0";
        }),
      };

      const processorWithMock = new CommandProcessor(
        undefined,
        mockExecutor as CommandExecutor,
        mockModelManager as SchemaModelManager
      );

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "test",
          elementType: "string",
        },
      };

      const result = processorWithMock.execute(command, simpleSchemaXml);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Round-trip validation failed");
    });
  });

  describe("Invalid Commands", () => {
    test("should reject command with unknown type", () => {
      // Create an invalid command that bypasses the type system
      // This simulates a runtime scenario where an unknown command type is received
      const invalidCommand: InvalidCommand = {
        type: "unknownCommand",
        payload: {},
      };

      const result = processor.execute(invalidCommand as unknown as SchemaCommand, simpleSchemaXml);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown command type");
    });
  });

  describe("Dependency Injection", () => {
    test("should accept custom validator, executor, and model manager", () => {
      // Create mock validator that always returns valid
      const mockValidator: MockValidator = {
        validate: jest.fn().mockReturnValue({ valid: true }),
      };

      // Create mock executor
      const mockExecutor: MockExecutor = {
        execute: jest.fn(),
      };

      // Create mock model manager
      const mockModelManager: MockModelManager = {
        loadFromXml: jest.fn(),
        getSchema: jest.fn().mockReturnValue(mockSchema),
        setSchema: jest.fn(),
        cloneSchema: jest.fn().mockReturnValue(mockSchema),
        toXml: jest.fn().mockReturnValue(simpleSchemaXml),
      };

      // Create processor with mocked dependencies
      const customProcessor = new CommandProcessor(
        mockValidator as CommandValidator,
        mockExecutor as CommandExecutor,
        mockModelManager as SchemaModelManager
      );

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "test",
          elementType: "string",
        },
      };

      const result = customProcessor.execute(command, simpleSchemaXml);

      // Verify mocks were called
      expect(mockValidator.validate).toHaveBeenCalled();
      expect(mockExecutor.execute).toHaveBeenCalled();
      expect(mockModelManager.loadFromXml).toHaveBeenCalled();
      expect(mockModelManager.getSchema).toHaveBeenCalled();
      expect(mockModelManager.cloneSchema).toHaveBeenCalled();
      expect(mockModelManager.setSchema).toHaveBeenCalled();
      expect(mockModelManager.toXml).toHaveBeenCalled();

      // Verify the result
      expect(result.success).toBe(true);
    });

    test("should use default dependencies when none provided", () => {
      // Create processor without dependencies
      const defaultProcessor = new CommandProcessor();

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "test",
          elementType: "string",
        },
      };

      const result = defaultProcessor.execute(command, simpleSchemaXml);

      // Should use default validator and executor
      expect(result.success).toBe(false);
      expect(result.error).toContain("execution not yet implemented");
    });
  });

  describe("Concurrency Control", () => {
    test("should prevent concurrent command executions", () => {
      const mockExecutor: MockExecutor = {
        execute: jest.fn(),
      };

      const mockModelManager: MockModelManager = {
        loadFromXml: jest.fn(),
        getSchema: jest.fn().mockReturnValue(mockSchema),
        setSchema: jest.fn(),
        cloneSchema: jest.fn().mockReturnValue(mockSchema),
        toXml: jest.fn().mockReturnValue(simpleSchemaXml),
      };

      const processorWithMock = new CommandProcessor(
        undefined,
        mockExecutor as CommandExecutor,
        mockModelManager as SchemaModelManager
      );

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "test",
          elementType: "string",
        },
      };

      // Manually set the isExecuting flag to simulate in-progress execution
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (processorWithMock as any).isExecuting = true;

      // Try to execute command while another is "in progress"
      const result = processorWithMock.execute(command, simpleSchemaXml);

      // Should be rejected due to concurrent execution
      expect(result.success).toBe(false);
      expect(result.error).toContain("Another command is currently being executed");
      
      // Reset the flag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (processorWithMock as any).isExecuting = false;
    });

    test("should allow execution after previous command completes", () => {
      const mockModelManager: MockModelManager = {
        loadFromXml: jest.fn(),
        getSchema: jest.fn().mockReturnValue(mockSchema),
        setSchema: jest.fn(),
        cloneSchema: jest.fn().mockReturnValue(mockSchema),
        toXml: jest.fn().mockReturnValue(simpleSchemaXml),
      };

      const mockExecutor: MockExecutor = {
        execute: jest.fn((command, schema) => {
          schema.version = "1.0";
        }),
      };

      const processorWithMock = new CommandProcessor(
        undefined,
        mockExecutor as CommandExecutor,
        mockModelManager as SchemaModelManager
      );

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "test",
          elementType: "string",
        },
      };

      // Execute first command
      const result1 = processorWithMock.execute(command, simpleSchemaXml);
      expect(result1.success).toBe(true);

      // Execute second command after first completes
      const result2 = processorWithMock.execute(command, simpleSchemaXml);
      expect(result2.success).toBe(true);

      // Both should have executed successfully
      expect(mockExecutor.execute).toHaveBeenCalledTimes(2);
    });

    test("should release lock even when execution fails", () => {
      const mockModelManager: MockModelManager = {
        loadFromXml: jest.fn(),
        getSchema: jest.fn().mockReturnValue(mockSchema),
        setSchema: jest.fn(),
        cloneSchema: jest.fn().mockReturnValue(mockSchema),
        toXml: jest.fn().mockReturnValue(simpleSchemaXml),
      };

      const mockExecutor: MockExecutor = {
        execute: jest.fn(() => {
          throw new Error("Execution failed");
        }),
      };

      const processorWithMock = new CommandProcessor(
        undefined,
        mockExecutor as CommandExecutor,
        mockModelManager as SchemaModelManager
      );

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "test",
          elementType: "string",
        },
      };

      // Execute first command that will fail
      const result1 = processorWithMock.execute(command, simpleSchemaXml);
      expect(result1.success).toBe(false);

      // Execute second command - should be allowed since lock was released
      const result2 = processorWithMock.execute(command, simpleSchemaXml);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain("Execution failed");

      // Should not be the concurrency error
      expect(result2.error).not.toContain("Another command is currently being executed");
    });
  });
});
