/**
 * Unit tests for CommandExecutor class.
 * Tests the execute() method delegation logic and error handling.
 */

import { CommandExecutor } from "./commandExecutor";
import { schema, SchemaCommand, topLevelElement } from "../shared/types";

describe("CommandExecutor", () => {
  let executor: CommandExecutor;
  let mockSchema: schema;

  beforeEach(() => {
    executor = new CommandExecutor();
    mockSchema = {
      targetNamespace: "http://example.com/schema",
      version: "1.0",
      elementFormDefault: "qualified",
      attributeFormDefault: "unqualified",
    } as schema;
  });

  describe("execute() method", () => {
    it("should throw error for unknown command types", () => {
      // Create an invalid command that TypeScript doesn't know about
      interface InvalidCommand {
        type: string;
        payload: Record<string, unknown>;
      }
      const invalidCommand: InvalidCommand = {
        type: "unknownCommandType",
        payload: {},
      };

      expect(() => {
        executor.execute(invalidCommand as unknown as SchemaCommand, mockSchema);
      }).toThrow("Unknown command type: unknownCommandType");
    });

    it("should delegate addElement execution successfully", () => {
      const command: SchemaCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "testElement",
          elementType: "string",
        },
      };

      expect(() => {
        executor.execute(command, mockSchema);
      }).not.toThrow();
      
      // Verify the element was added
      expect(mockSchema.element).toBeDefined();
    });

    it("should delegate removeElement execution successfully", () => {
      // Add an element first
      mockSchema.element = [
        {
          name: "element1",
          type_: "string",
        } as topLevelElement,
      ];

      const command: SchemaCommand = {
        type: "removeElement",
        payload: {
          elementId: "/element:element1",
        },
      };

      // Should not throw
      expect(() => {
        executor.execute(command, mockSchema);
      }).not.toThrow();
      
      // Verify the element was removed
      expect(mockSchema.element).toBeUndefined();
    });

    it("should delegate modifyElement execution and throw not implemented error", () => {
      const command: SchemaCommand = {
        type: "modifyElement",
        payload: {
          elementId: "element1",
          elementName: "modifiedElement",
        },
      };

      expect(() => {
        executor.execute(command, mockSchema);
      }).toThrow("modifyElement execution not yet implemented");
    });

    it("should delegate addAttribute execution and throw not implemented error", () => {
      const command: SchemaCommand = {
        type: "addAttribute",
        payload: {
          parentId: "element1",
          attributeName: "testAttr",
          attributeType: "string",
        },
      };

      expect(() => {
        executor.execute(command, mockSchema);
      }).toThrow("addAttribute execution not yet implemented");
    });

    it("should delegate addSimpleType execution and throw not implemented error", () => {
      const command: SchemaCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "testType",
          baseType: "string",
        },
      };

      expect(() => {
        executor.execute(command, mockSchema);
      }).toThrow("addSimpleType execution not yet implemented");
    });

    it("should delegate addComplexType execution and throw not implemented error", () => {
      const command: SchemaCommand = {
        type: "addComplexType",
        payload: {
          typeName: "testComplexType",
          contentModel: "sequence",
        },
      };

      expect(() => {
        executor.execute(command, mockSchema);
      }).toThrow("addComplexType execution not yet implemented");
    });

    it("should delegate addGroup execution and throw not implemented error", () => {
      const command: SchemaCommand = {
        type: "addGroup",
        payload: {
          groupName: "testGroup",
          contentModel: "sequence",
        },
      };

      expect(() => {
        executor.execute(command, mockSchema);
      }).toThrow("addGroup execution not yet implemented");
    });

    it("should delegate addAttributeGroup execution and throw not implemented error", () => {
      const command: SchemaCommand = {
        type: "addAttributeGroup",
        payload: {
          groupName: "testAttrGroup",
        },
      };

      expect(() => {
        executor.execute(command, mockSchema);
      }).toThrow("addAttributeGroup execution not yet implemented");
    });

    it("should delegate addAnnotation execution and throw not implemented error", () => {
      const command: SchemaCommand = {
        type: "addAnnotation",
        payload: {
          targetId: "element1",
          documentation: "Test annotation",
        },
      };

      expect(() => {
        executor.execute(command, mockSchema);
      }).toThrow("addAnnotation execution not yet implemented");
    });

    it("should delegate addDocumentation execution and throw not implemented error", () => {
      const command: SchemaCommand = {
        type: "addDocumentation",
        payload: {
          targetId: "element1",
          content: "Test documentation",
        },
      };

      expect(() => {
        executor.execute(command, mockSchema);
      }).toThrow("addDocumentation execution not yet implemented");
    });

    it("should delegate addImport execution and throw not implemented error", () => {
      const command: SchemaCommand = {
        type: "addImport",
        payload: {
          namespace: "http://example.com/imported",
          schemaLocation: "imported.xsd",
        },
      };

      expect(() => {
        executor.execute(command, mockSchema);
      }).toThrow("addImport execution not yet implemented");
    });

    it("should delegate addInclude execution and throw not implemented error", () => {
      const command: SchemaCommand = {
        type: "addInclude",
        payload: {
          schemaLocation: "included.xsd",
        },
      };

      expect(() => {
        executor.execute(command, mockSchema);
      }).toThrow("addInclude execution not yet implemented");
    });
  });
});
