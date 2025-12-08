/**
 * Unit tests for DiagramBuilder class.
 */

import { DiagramBuilder } from "../diagram/DiagramBuilder";
import {
  schema,
  topLevelElement,
  topLevelComplexType,
  topLevelSimpleType,
} from "../../shared/types";

/**
 * Creates a valid schema object for testing.
 * Properly typed to match the schema class structure.
 */
function createTestSchema(overrides: Partial<schema> = {}): schema {
  const testSchema = new schema();
  Object.assign(testSchema, overrides);
  return testSchema;
}

describe("DiagramBuilder", () => {
  let builder: DiagramBuilder;

  beforeEach(() => {
    builder = new DiagramBuilder();
  });

  describe("buildFromSchema", () => {
    it("should create diagram with schema root node", () => {
      const schemaObj = createTestSchema({
        targetNamespace: "http://example.com/ns",
      });

      const diagram = builder.buildFromSchema(schemaObj);

      expect(diagram.rootElements).toHaveLength(1);
      expect(diagram.rootElements[0].name).toContain("Schema:");
      expect(diagram.rootElements[0].name).toContain("http://example.com/ns");
    });

    it("should process schema elements", () => {
      const element1 = new topLevelElement();
      element1.name = "Person";
      element1.type_ = "PersonType";
      
      const element2 = new topLevelElement();
      element2.name = "Address";
      element2.type_ = "AddressType";
      
      const schemaObj = createTestSchema({
        element: [element1, element2],
      });

      const diagram = builder.buildFromSchema(schemaObj);

      const schemaNode = diagram.rootElements[0];
      expect(schemaNode.childElements).toHaveLength(2);
      expect(schemaNode.childElements[0].name).toBe("Person");
      expect(schemaNode.childElements[1].name).toBe("Address");
    });

    it("should process complex types", () => {
      const complexType = new topLevelComplexType();
      complexType.name = "PersonType";
      
      const schemaObj = createTestSchema({
        complexType: [complexType],
      });

      const diagram = builder.buildFromSchema(schemaObj);

      const schemaNode = diagram.rootElements[0];
      expect(schemaNode.childElements).toHaveLength(1);
      expect(schemaNode.childElements[0].type).toBe("complexType");
    });

    it("should add placeholder when no children found", () => {
      const schemaObj = createTestSchema();

      const diagram = builder.buildFromSchema(schemaObj);

      const schemaNode = diagram.rootElements[0];
      expect(schemaNode.childElements).toHaveLength(1);
      expect(schemaNode.childElements[0].name).toBe("No elements found");
    });

    it("should process simple types", () => {
      const simpleType = new topLevelSimpleType();
      simpleType.name = "EmailType";
      simpleType.restriction = { base: "string" };
      
      const schemaObj = createTestSchema({
        simpleType: [simpleType],
      });

      const diagram = builder.buildFromSchema(schemaObj);

      const schemaNode = diagram.rootElements[0];
      expect(schemaNode.childElements).toHaveLength(1);
      expect(schemaNode.childElements[0].type).toContain("simpleType");
    });

    it("should process multiple simple types", () => {
      const simpleType1 = new topLevelSimpleType();
      simpleType1.name = "Type1";
      simpleType1.restriction = { base: "string" };
      
      const simpleType2 = new topLevelSimpleType();
      simpleType2.name = "Type2";
      simpleType2.restriction = { base: "int" };
      
      const schemaObj = createTestSchema({
        simpleType: [simpleType1, simpleType2],
      });

      const diagram = builder.buildFromSchema(schemaObj);

      const schemaNode = diagram.rootElements[0];
      expect(schemaNode.childElements).toHaveLength(2);
    });

    it("should process elements with inline complex types", () => {
      const element = new topLevelElement();
      element.name = "Person";
      // Using type assertion for nested complex structures from generated schema
      element.complexType = {
        sequence: {
          element: [{ name: "name", type_: "string" }],
        },
      } as topLevelElement["complexType"];
      
      const schemaObj = createTestSchema({
        element: [element],
      });

      const diagram = builder.buildFromSchema(schemaObj);

      const schemaNode = diagram.rootElements[0];
      expect(schemaNode.childElements).toHaveLength(1);
    });

    it("should process elements with inline simple types", () => {
      const element = new topLevelElement();
      element.name = "Age";
      // Using type assertion for nested structures from generated schema
      element.simpleType = {
        restriction: { base: "int" },
      } as topLevelElement["simpleType"];
      
      const schemaObj = createTestSchema({
        element: [element],
      });

      const diagram = builder.buildFromSchema(schemaObj);

      const schemaNode = diagram.rootElements[0];
      expect(schemaNode.childElements).toHaveLength(1);
    });

    it("should handle schema without targetNamespace", () => {
      const element = new topLevelElement();
      element.name = "Test";
      
      const schemaObj = createTestSchema({
        element: [element],
      });

      const diagram = builder.buildFromSchema(schemaObj);

      const schemaNode = diagram.rootElements[0];
      expect(schemaNode.name).toContain("Schema:");
    });
  });
});
