/**
 * Unit tests for DiagramBuilder class.
 */

import { DiagramBuilder } from "../diagram/DiagramBuilder";
import { schema } from "../../shared/types";

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
        targetNamespace: "http://example.com/ns" as any,
      });

      const diagram = builder.buildFromSchema(schemaObj);

      expect(diagram.rootElements).toHaveLength(1);
      expect(diagram.rootElements[0].name).toContain("Schema:");
      expect(diagram.rootElements[0].name).toContain("http://example.com/ns");
    });

    it("should process schema elements", () => {
      const schemaObj = createTestSchema({
        element: [
          { name: "Person" as any, type_: "PersonType" as any },
          { name: "Address" as any, type_: "AddressType" as any },
        ] as any,
      });

      const diagram = builder.buildFromSchema(schemaObj);

      const schemaNode = diagram.rootElements[0];
      expect(schemaNode.childElements).toHaveLength(2);
      expect(schemaNode.childElements[0].name).toBe("Person");
      expect(schemaNode.childElements[1].name).toBe("Address");
    });

    it("should process complex types", () => {
      const schemaObj = createTestSchema({
        complexType: [{ name: "PersonType" as any }] as any,
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
      const schemaObj = createTestSchema({
        simpleType: [{ name: "EmailType" as any, restriction: { base: "string" } as any }] as any,
      });

      const diagram = builder.buildFromSchema(schemaObj);

      const schemaNode = diagram.rootElements[0];
      expect(schemaNode.childElements).toHaveLength(1);
      expect(schemaNode.childElements[0].type).toContain("simpleType");
    });

    it("should process multiple simple types", () => {
      const schemaObj = createTestSchema({
        simpleType: [
          { name: "Type1" as any, restriction: { base: "string" } as any },
          { name: "Type2" as any, restriction: { base: "int" } as any },
        ] as any,
      });

      const diagram = builder.buildFromSchema(schemaObj);

      const schemaNode = diagram.rootElements[0];
      expect(schemaNode.childElements).toHaveLength(2);
    });

    it("should process elements with inline complex types", () => {
      const schemaObj = createTestSchema({
        element: [{
          name: "Person" as any,
          complexType: {
            sequence: {
              element: { name: "name" as any, type_: "string" as any },
            },
          } as any,
        }] as any,
      });

      const diagram = builder.buildFromSchema(schemaObj);

      const schemaNode = diagram.rootElements[0];
      expect(schemaNode.childElements).toHaveLength(1);
    });

    it("should process elements with inline simple types", () => {
      const schemaObj = createTestSchema({
        element: [{
          name: "Age" as any,
          simpleType: {
            restriction: { base: "int" } as any,
          } as any,
        }] as any,
      });

      const diagram = builder.buildFromSchema(schemaObj);

      const schemaNode = diagram.rootElements[0];
      expect(schemaNode.childElements).toHaveLength(1);
    });

    it("should handle schema without targetNamespace", () => {
      const schemaObj = createTestSchema({
        element: [{ name: "Test" as any }] as any,
      });

      const diagram = builder.buildFromSchema(schemaObj);

      const schemaNode = diagram.rootElements[0];
      expect(schemaNode.name).toContain("Schema:");
    });
  });
});
