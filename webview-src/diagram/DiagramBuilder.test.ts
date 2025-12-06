/**
 * Unit tests for DiagramBuilder class.
 */

import { DiagramBuilder } from "../diagram/DiagramBuilder";

describe("DiagramBuilder", () => {
  let builder: DiagramBuilder;

  beforeEach(() => {
    builder = new DiagramBuilder();
  });

  describe("buildFromSchema", () => {
    it("should create diagram with schema root node", () => {
      const schemaObj = {
        targetNamespace: "http://example.com/ns",
      };

      const diagram = builder.buildFromSchema(schemaObj);

      expect(diagram.rootElements).toHaveLength(1);
      expect(diagram.rootElements[0].name).toContain("Schema:");
      expect(diagram.rootElements[0].name).toContain("http://example.com/ns");
    });

    it("should process schema elements", () => {
      const schemaObj = {
        element: [
          { name: "Person", type_: "PersonType" },
          { name: "Address", type_: "AddressType" },
        ],
      };

      const diagram = builder.buildFromSchema(schemaObj);

      const schemaNode = diagram.rootElements[0];
      expect(schemaNode.childElements).toHaveLength(2);
      expect(schemaNode.childElements[0].name).toBe("Person");
      expect(schemaNode.childElements[1].name).toBe("Address");
    });

    it("should process complex types", () => {
      const schemaObj = {
        complexType: { name: "PersonType" },
      };

      const diagram = builder.buildFromSchema(schemaObj);

      const schemaNode = diagram.rootElements[0];
      expect(schemaNode.childElements).toHaveLength(1);
      expect(schemaNode.childElements[0].type).toBe("complexType");
    });

    it("should add placeholder when no children found", () => {
      const schemaObj = {};

      const diagram = builder.buildFromSchema(schemaObj);

      const schemaNode = diagram.rootElements[0];
      expect(schemaNode.childElements).toHaveLength(1);
      expect(schemaNode.childElements[0].name).toBe("No elements found");
    });

    it("should process simple types", () => {
      const schemaObj = {
        simpleType: { name: "EmailType", restriction: { base: "string" } },
      };

      const diagram = builder.buildFromSchema(schemaObj);

      const schemaNode = diagram.rootElements[0];
      expect(schemaNode.childElements).toHaveLength(1);
      expect(schemaNode.childElements[0].type).toContain("simpleType");
    });

    it("should process multiple simple types", () => {
      const schemaObj = {
        simpleType: [
          { name: "Type1", restriction: { base: "string" } },
          { name: "Type2", restriction: { base: "int" } },
        ],
      };

      const diagram = builder.buildFromSchema(schemaObj);

      const schemaNode = diagram.rootElements[0];
      expect(schemaNode.childElements).toHaveLength(2);
    });

    it("should process elements with inline complex types", () => {
      const schemaObj = {
        element: {
          name: "Person",
          complexType: {
            sequence: {
              element: { name: "name", type_: "string" },
            },
          },
        },
      };

      const diagram = builder.buildFromSchema(schemaObj);

      const schemaNode = diagram.rootElements[0];
      expect(schemaNode.childElements).toHaveLength(1);
    });

    it("should process elements with inline simple types", () => {
      const schemaObj = {
        element: {
          name: "Age",
          simpleType: {
            restriction: { base: "int" },
          },
        },
      };

      const diagram = builder.buildFromSchema(schemaObj);

      const schemaNode = diagram.rootElements[0];
      expect(schemaNode.childElements).toHaveLength(1);
    });

    it("should handle schema without targetNamespace", () => {
      const schemaObj = {
        element: { name: "Test" },
      };

      const diagram = builder.buildFromSchema(schemaObj);

      const schemaNode = diagram.rootElements[0];
      expect(schemaNode.name).toContain("Schema:");
    });
  });
});
