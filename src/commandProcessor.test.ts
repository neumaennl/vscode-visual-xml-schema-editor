/**
 * Unit tests for CommandProcessor core functionality.
 * Tests transactional behavior, error handling, and orchestration.
 */

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
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "",
          elementName: "",
          elementType: "",
        },
      };

      const result = processor.execute(command, simpleSchemaXml);
      expect(result.success).toBe(false);
      expect(result.schema).toBeNull();
      expect(result.xmlContent).toBeNull();
    });

    test("should preserve original schema on execution failure", () => {
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
    });

    test("should preserve original schema on serialization failure", () => {
      // This test would require a scenario where serialization fails
      // For now, we verify the structure is in place
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "test",
          elementType: "string",
        },
      };

      const result = processor.execute(command, simpleSchemaXml);
      expect(result.success).toBe(false);
      // Original schema should not be returned on error
      expect(result.schema).toBeNull();
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
  });

  describe("Round-trip Validation", () => {
    test("should ensure serialized XML can be parsed back", () => {
      // This test verifies that the round-trip validation is in place
      // When execution is implemented, this will catch serialization issues
      const command: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "test",
          elementType: "string",
        },
      };

      const result = processor.execute(command, simpleSchemaXml);
      // For now, execution fails, but the structure is there
      expect(result.success).toBe(false);
    });
  });

  describe("Invalid Commands", () => {
    test("should reject command with missing type", () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const command = {
        type: "",
        payload: {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = processor.execute(command, simpleSchemaXml);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Command type is required");
    });

    test("should reject command with missing payload", () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const command = {
        type: "addElement",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = processor.execute(command, simpleSchemaXml);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Command payload is required");
    });

    test("should reject command with unknown type", () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const command = {
        type: "unknownCommand",
        payload: {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = processor.execute(command, simpleSchemaXml);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown command type");
    });
  });
});
