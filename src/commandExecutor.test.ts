/**
 * Unit tests for CommandExecutor class.
 * Tests the execute() method delegation logic and error handling.
 */

import { CommandExecutor } from "./commandExecutor";
import { schema, SchemaCommand, topLevelElement } from "../shared/types";
import { toArray } from "../shared/schemaUtils";

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
      expect(() => {
        executor.execute(
          // eslint-disable-next-line no-restricted-syntax -- `type` not in SchemaCommand union; cast needed to test runtime rejection
          { type: "unknownCommandType", payload: {} } as unknown as SchemaCommand,
          mockSchema
        );
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
        },
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

    it("should delegate modifyElement execution", () => {
      // Add an element first so we have something to modify
      const testSchema = new schema();
      const element = new topLevelElement();
      element.name = "testElement";
      element.type_ = "string";
      testSchema.element = [element];

      const command: SchemaCommand = {
        type: "modifyElement",
        payload: {
          elementId: "/element:testElement",
          elementName: "modifiedElement",
          elementType: "int",
        },
      };

      executor.execute(command, testSchema);
      
      // Verify the element was modified
      expect(testSchema.element).toBeDefined();
      const elements = Array.isArray(testSchema.element) ? testSchema.element : [testSchema.element];
      expect(elements[0].name).toBe("modifiedElement");
      expect(elements[0].type_).toBe("int");
    });

    it("should delegate addAttribute execution successfully", () => {
      const command: SchemaCommand = {
        type: "addAttribute",
        payload: {
          parentId: "schema",
          attributeName: "testAttr",
          attributeType: "xs:string",
        },
      };

      expect(() => {
        executor.execute(command, mockSchema);
      }).not.toThrow();

      // Verify the attribute was added
      expect(mockSchema.attribute).toBeDefined();
    });

    it("should delegate addSimpleType execution successfully", () => {
      const command: SchemaCommand = {
        type: "addSimpleType",
        payload: {
          typeName: "testType",
          baseType: "xs:string",
        },
      };

      expect(() => {
        executor.execute(command, mockSchema);
      }).not.toThrow();

      expect(mockSchema.simpleType).toBeDefined();
    });

    it("should delegate addComplexType execution and add the type to the schema", () => {
      const command: SchemaCommand = {
        type: "addComplexType",
        payload: {
          typeName: "testComplexType",
          contentModel: "sequence",
        },
      };

      executor.execute(command, mockSchema);

      expect(mockSchema.complexType).toBeDefined();
      expect(mockSchema.complexType![0].name).toBe("testComplexType");
    });

    it("should delegate addGroup execution and add the group to the schema", () => {
      const command: SchemaCommand = {
        type: "addGroup",
        payload: {
          groupName: "testGroup",
          contentModel: "sequence",
        },
      };

      executor.execute(command, mockSchema);

      expect(mockSchema.group).toBeDefined();
      expect(mockSchema.group![0].name).toBe("testGroup");
    });

    it("should delegate addAttributeGroup execution and add the group to the schema", () => {
      const command: SchemaCommand = {
        type: "addAttributeGroup",
        payload: {
          groupName: "testAttrGroup",
        },
      };

      executor.execute(command, mockSchema);

      expect(mockSchema.attributeGroup).toBeDefined();
      expect(toArray(mockSchema.attributeGroup)[0].name).toBe("testAttrGroup");
    });

    it("should delegate addAnnotation execution successfully", () => {
      // Add annotation to the schema root itself — it supports xs:annotation natively.
      const command: SchemaCommand = {
        type: "addAnnotation",
        payload: {
          targetId: "schema",
          documentation: "Test schema annotation",
        },
      };

      expect(() => {
        executor.execute(command, mockSchema);
      }).not.toThrow();

      expect(toArray(mockSchema.annotation)).toHaveLength(1);
      expect(toArray(toArray(mockSchema.annotation)[0].documentation)[0].value).toBe(
        "Test schema annotation"
      );
    });

    it("should delegate addDocumentation execution successfully", () => {
      // Add documentation directly to the schema root's annotation.
      const command: SchemaCommand = {
        type: "addDocumentation",
        payload: {
          targetId: "schema",
          content: "Test schema documentation",
          lang: "en",
        },
      };

      expect(() => {
        executor.execute(command, mockSchema);
      }).not.toThrow();

      const docs = toArray(toArray(mockSchema.annotation)[0]?.documentation);
      expect(docs).toHaveLength(1);
      expect(docs[0].value).toBe("Test schema documentation");
    });

    it("should delegate addImport execution successfully", () => {
      const command: SchemaCommand = {
        type: "addImport",
        payload: {
          namespace: "http://example.com/imported",
          schemaLocation: "imported.xsd",
        },
      };

      expect(() => {
        executor.execute(command, mockSchema);
      }).not.toThrow();

      expect(toArray(mockSchema.import_)).toHaveLength(1);
    });

    it("should delegate addInclude execution successfully", () => {
      const command: SchemaCommand = {
        type: "addInclude",
        payload: {
          schemaLocation: "included.xsd",
        },
      };

      expect(() => {
        executor.execute(command, mockSchema);
      }).not.toThrow();

      expect(toArray(mockSchema.include)).toHaveLength(1);
      expect(toArray(mockSchema.include)[0].schemaLocation).toBe("included.xsd");
    });
  });
});
