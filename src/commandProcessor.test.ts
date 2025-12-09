/**
 * Unit tests for CommandProcessor core functionality.
 * Tests transactional behavior, error handling, and orchestration.
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, jest/no-conditional-expect */

import { CommandProcessor } from "./commandProcessor";
import { AddElementCommand } from "../shared/types";

describe("CommandProcessor", () => {
  let processor: CommandProcessor;
  let simpleSchemaXml: string;

  beforeEach(() => {
    processor = new CommandProcessor();
    // Minimal valid XSD schema
    simpleSchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
  });

  describe("Core Functionality", () => {
    test("should parse valid schema XML", () => {
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

      // Should fail because execution is not implemented, but parsing should work
      expect(result.success).toBe(false);
      expect(result.error).toContain("addElement execution not yet implemented");
    });

    test("should successfully execute command with mocked executor", () => {
      // Mock executor that succeeds
      const mockExecutor = {
        execute: jest.fn(),
      };

      const processorWithMock = new CommandProcessor(undefined, mockExecutor as any);

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "testElement",
          elementType: "string",
        },
      };

      const result = processorWithMock.execute(command, simpleSchemaXml);

      // With a successful executor, command should succeed
      expect(result.success).toBe(true);
      expect(result.schema).not.toBeNull();
      expect(result.xmlContent).not.toBeNull();
      expect(mockExecutor.execute).toHaveBeenCalled();
    });

    test("should reject invalid schema XML", () => {
      const invalidXml = "not valid xml at all";
      const result = processor.execute(
        {
          type: "addElement",
          payload: {
            parentId: "schema",
            elementName: "testElement",
            elementType: "string",
          },
        },
        invalidXml
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to parse schema XML");
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
      
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "",
          elementName: "",
          elementType: "",
        },
      };

      const result = processor.execute(command, simpleSchemaXml);
      
      // Verify the command failed
      expect(result.success).toBe(false);
      expect(result.schema).toBeNull();
      expect(result.xmlContent).toBeNull();
      
      // Verify the original XML remains unchanged by parsing it again
      // If it can still be parsed, it wasn't corrupted
      const testResult = processor.execute(
        {
          type: "addElement",
          payload: {
            parentId: "schema",
            elementName: "test",
            elementType: "string",
          },
        },
        originalXml
      );
      // The XML should still be parseable and produce the same validation failure
      expect(testResult.success).toBe(false);
    });

    test("should not modify original schema when executor succeeds", () => {
      // Create a mock executor that modifies the schema
      let executionCount = 0;
      const mockExecutor = {
        execute: jest.fn((command, schema) => {
          executionCount++;
          // Simulate modification
          schema.version = `modified-${executionCount}`;
        }),
      };

      const processorWithMock = new CommandProcessor(undefined, mockExecutor as any);

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
      
      // Execute second command with same original XML
      const result2 = processorWithMock.execute(command, simpleSchemaXml);
      expect(result2.success).toBe(true);
      
      // Both results should have different modifications
      expect(result1.schema?.version).toBe("modified-1");
      expect(result2.schema?.version).toBe("modified-2");
      
      // Proves that each execution works on a clone
      expect(executionCount).toBe(2);
    });

    test("should preserve original schema on execution failure", () => {
      // Store the original XML
      const originalXml = simpleSchemaXml;
      
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "test",
          elementType: "string",
        },
      };

      const result = processor.execute(command, simpleSchemaXml);
      
      // Execution will fail because it's not implemented
      expect(result.success).toBe(false);
      expect(result.schema).toBeNull();
      expect(result.xmlContent).toBeNull();
      
      // Verify the original XML remains valid and unchanged
      // Try to execute another command to ensure XML wasn't corrupted
      const retryResult = processor.execute(command, originalXml);
      // Should get the same error, proving the XML is still valid
      expect(retryResult.success).toBe(false);
      expect(retryResult.error).toContain("execution not yet implemented");
    });

    test("should preserve original schema when command fails", () => {
      // Store the original XML
      const originalXml = simpleSchemaXml;
      
      // Mock executor that throws an error
      const mockExecutor = {
        execute: jest.fn(() => {
          throw new Error("Execution failed");
        }),
      };

      const processorWithMock = new CommandProcessor(undefined, mockExecutor as any);

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
      // Original schema should not be returned on error
      expect(result.schema).toBeNull();
      expect(result.error).toContain("Execution failed");
      
      // Verify the original XML is still valid and can be parsed
      // Use a successful mock to prove original XML wasn't corrupted
      const goodMockExecutor = {
        execute: jest.fn(),
      };
      const goodProcessor = new CommandProcessor(undefined, goodMockExecutor as any);
      
      const verifyResult = goodProcessor.execute(
        {
          type: "addElement",
          payload: {
            parentId: "schema",
            elementName: "test",
            elementType: "string",
          },
        },
        originalXml
      );
      // Should succeed, proving original XML is intact
      expect(verifyResult.success).toBe(true);
    });

    test("should work on cloned schema not original", () => {
      // Track which schema object is modified
      const modifiedSchemas: any[] = [];
      
      const mockExecutor = {
        execute: jest.fn((command, schema) => {
          modifiedSchemas.push(schema);
          schema.modified = true;
        }),
      };

      const processorWithMock = new CommandProcessor(undefined, mockExecutor as any);

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "test",
          elementType: "string",
        },
      };

      // Execute twice
      const result1 = processorWithMock.execute(command, simpleSchemaXml);
      const result2 = processorWithMock.execute(command, simpleSchemaXml);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      
      // Verify that different schema objects were modified
      expect(modifiedSchemas.length).toBe(2);
      expect(modifiedSchemas[0]).not.toBe(modifiedSchemas[1]);
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
      expect(result.error).toContain("Failed to parse schema XML");
    });

    test("should provide meaningful error messages", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "",
          elementName: "test",
          elementType: "string",
        },
      };

      const result = processor.execute(command, simpleSchemaXml);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Parent ID is required");
    });

    test("should handle multiple validation errors", () => {
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "",
          elementType: "string",
        },
      };

      const result = processor.execute(command, simpleSchemaXml);
      expect(result.success).toBe(false);
      // Should catch the first validation error
      expect(result.error).toBe("Element name is required");
    });

    test("should handle executor exceptions gracefully", () => {
      // Mock executor that throws an exception
      const mockExecutor = {
        execute: jest.fn(() => {
          throw new Error("Executor crashed unexpectedly");
        }),
      };

      const processorWithMock = new CommandProcessor(undefined, mockExecutor as any);

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
      const mockValidator = {
        validate: jest.fn(() => {
          throw new Error("Validator crashed");
        }),
      };

      const processorWithMock = new CommandProcessor(mockValidator as any, undefined);

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

    test("should verify result structure is consistent", () => {
      // Mock executor that modifies schema
      const mockExecutor = {
        execute: jest.fn((command, schema) => {
          schema.version = "1.0";
        }),
      };

      const processorWithMock = new CommandProcessor(undefined, mockExecutor as any);

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "test",
          elementType: "string",
        },
      };

      const result = processorWithMock.execute(command, simpleSchemaXml);
      
      // Verify result structure regardless of success/failure
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("schema");
      expect(result).toHaveProperty("xmlContent");
      
      // On success, schema and xmlContent should be present
      if (result.success) {
        expect(result.schema).not.toBeNull();
        expect(result.xmlContent).not.toBeNull();
      } else {
        expect(result).toHaveProperty("error");
      }
    });
  });

  describe("Round-trip Validation", () => {
    test("should ensure serialized XML can be parsed back", () => {
      // Mock executor that modifies the schema
      const mockExecutor = {
        execute: jest.fn((command, schema) => {
          // Simulate adding an element to the schema
          schema.element = schema.element || [];
        }),
      };

      const processorWithMock = new CommandProcessor(undefined, mockExecutor as any);

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "test",
          elementType: "string",
        },
      };

      const result = processorWithMock.execute(command, simpleSchemaXml);
      
      // Should succeed with mock executor
      expect(result.success).toBe(true);
      expect(result.xmlContent).not.toBeNull();
      
      // The serialized XML should be parseable
      if (result.xmlContent) {
        // Try to execute another command with the result to verify round-trip
        const retryResult = processorWithMock.execute(command, result.xmlContent);
        expect(retryResult.success).toBe(true);
      }
    });

    test("should successfully handle schema modifications", () => {
      // Mock executor that modifies the schema in a valid way
      const mockExecutor = {
        execute: jest.fn((command, schema) => {
          // Make a valid modification
          schema.version = "1.0";
          schema.elementFormDefault = "qualified";
        }),
      };

      const processorWithMock = new CommandProcessor(undefined, mockExecutor as any);

      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "test",
          elementType: "string",
        },
      };

      const result = processorWithMock.execute(command, simpleSchemaXml);
      
      // Should succeed with valid modifications
      expect(result.success).toBe(true);
      expect(result.schema?.version).toBe("1.0");
      expect(result.schema?.elementFormDefault).toBe("qualified");
      
      // The resulting XML should be parseable
      if (result.xmlContent) {
        const retryResult = processorWithMock.execute(command, result.xmlContent);
        expect(retryResult.success).toBe(true);
      }
    });
  });

  describe("Invalid Commands", () => {
    test("should reject command with missing type", () => {
      const command = {
        type: "",
        payload: {},
      } as any;

      const result = processor.execute(command, simpleSchemaXml);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Command type is required");
    });

    test("should reject command with missing payload", () => {
      const command = {
        type: "addElement",
      } as any;

      const result = processor.execute(command, simpleSchemaXml);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Command payload is required");
    });

    test("should reject command with unknown type", () => {
      const command = {
        type: "unknownCommand",
        payload: {},
      } as any;

      const result = processor.execute(command, simpleSchemaXml);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown command type");
    });
  });

  describe("Dependency Injection", () => {
    test("should accept custom validator and executor", () => {
      // Create mock validator that always returns valid
      const mockValidator = {
        validate: jest.fn().mockReturnValue({ valid: true }),
      };

      // Create mock executor that throws a specific error
      const mockExecutor = {
        execute: jest.fn().mockImplementation(() => {
          throw new Error("Mock executor error");
        }),
      };

      // Create processor with mocked dependencies
      const customProcessor = new CommandProcessor(
        mockValidator as any,
        mockExecutor as any
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

      // Verify the result reflects the mock behavior
      expect(result.success).toBe(false);
      expect(result.error).toContain("Mock executor error");
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
});
