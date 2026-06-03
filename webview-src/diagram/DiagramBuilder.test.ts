/**
 * Unit tests for DiagramBuilder class.
 */

import { DiagramBuilder } from "../diagram/DiagramBuilder";
import {
  schema,
  topLevelElement,
  topLevelComplexType,
  topLevelSimpleType,
  topLevelAttribute,
  namedGroup,
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

    it("should expose schema-root documentation as structured annotation entries", () => {
      const schemaObj = createTestSchema({
        annotation: [
          {
            documentation: [{ value: "Schema doc 1" }, { value: "Schema doc 2" }],
          },
        ],
      });

      const diagram = builder.buildFromSchema(schemaObj);

      expect(diagram.rootElements[0].documentationAnnotations).toEqual([
        {
          id: "/schema/annotation[0]",
          documentationEntries: [
            { id: "/schema/annotation[0]/documentation[0]", content: "Schema doc 1", lang: undefined },
            { id: "/schema/annotation[0]/documentation[1]", content: "Schema doc 2", lang: undefined },
          ],
        },
      ]);
      expect(diagram.rootElements[0].documentation).toBe("Schema doc 1\nSchema doc 2");
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

    it("stores the targetNamespace prefix on the diagram when available", () => {
      const schemaObj = createTestSchema({
        targetNamespace: "http://example.com/ns",
        _namespacePrefixes: {
          xs: "http://www.w3.org/2001/XMLSchema",
          tns: "http://example.com/ns",
        },
      });

      const diagram = builder.buildFromSchema(schemaObj);

      expect(diagram.currentSchemaPrefix).toBe("tns");
      expect(diagram.schemaTargetNamespace).toBe("http://example.com/ns");
      expect(diagram.schemaNamespacePrefixes).toEqual({
        xs: "http://www.w3.org/2001/XMLSchema",
        tns: "http://example.com/ns",
      });
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

    it("should render named groups as top-level diagram nodes", () => {
      const group = new namedGroup();
      group.name = "PersonGroup";
      group.sequence = { element: [{ name: "name", type_: "xs:string" }] };

      const schemaObj = createTestSchema({
        group: [group],
      });

      const diagram = builder.buildFromSchema(schemaObj);

      const schemaNode = diagram.rootElements[0];
      expect(schemaNode.childElements).toHaveLength(1);
      expect(schemaNode.childElements[0].id).toBe("/group:PersonGroup");
      expect(schemaNode.childElements[0].childElements[0].id).toBe("/group:PersonGroup/group:sequence[0]");
    });

    it("should render group references inside named groups", () => {
      const group = new namedGroup();
      group.name = "ContainerGroup";
      group.sequence = { group: [{ ref: "SharedGroup" }] };

      const schemaObj = createTestSchema({
        group: [group],
      });

      const diagram = builder.buildFromSchema(schemaObj);

      const sequence = diagram.rootElements[0].childElements[0].childElements[0];
      expect(sequence.childElements[0].id).toBe(
        "/group:ContainerGroup/group:sequence[0]/groupRef:SharedGroup[0]"
      );
    });

    it("should process elements with inline complex types", () => {
      const element = new topLevelElement();
      element.name = "Person";
      // Using type assertion for nested complex structures from generated schema
      element.complexType = {
        sequence: {
          element: [{ name: "name", type_: "string" }],
        },
      };
      
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
      };
      
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

    it("should expose top-level attributes on schema root properties", () => {
      const attr1 = new topLevelAttribute();
      attr1.name = "lang";
      attr1.type_ = "xs:string";

      const attr2 = new topLevelAttribute();
      attr2.name = "version";
      attr2.type_ = "xs:string";

      const schemaObj = createTestSchema({
        attribute: [attr1, attr2],
      });

      const diagram = builder.buildFromSchema(schemaObj);

      const schemaNode = diagram.rootElements[0];
      expect(schemaNode.attributes).toHaveLength(2);
      expect(schemaNode.attributes[0].name).toBe("lang");
      expect(schemaNode.attributes[1].name).toBe("version");
    });

    it("should not render top-level attributes as separate diagram nodes", () => {
      const attr = new topLevelAttribute();
      attr.name = "id";
      attr.type_ = "xs:string";

      const schemaObj = createTestSchema({ attribute: [attr] });

      const diagram = builder.buildFromSchema(schemaObj);

      const schemaNode = diagram.rootElements[0];
      expect(schemaNode.childElements).toHaveLength(1);
      expect(schemaNode.childElements[0].name).toBe("No elements found");
    });

    it("should set hasAnonymousComplexType on elements with inline complex types", () => {
      const element = new topLevelElement();
      element.name = "Person";
      element.complexType = {
        sequence: {
          element: [{ name: "name", type_: "string" }],
        },
      };

      const schemaObj = createTestSchema({ element: [element] });
      const diagram = builder.buildFromSchema(schemaObj);

      const personNode = diagram.rootElements[0].childElements[0];
      expect(personNode.name).toBe("Person");
      expect(personNode.hasAnonymousComplexType).toBe(true);
    });

    it("should not set hasAnonymousComplexType on elements without inline complex type", () => {
      const element = new topLevelElement();
      element.name = "Person";
      element.type_ = "xs:string";

      const schemaObj = createTestSchema({ element: [element] });
      const diagram = builder.buildFromSchema(schemaObj);

      const personNode = diagram.rootElements[0].childElements[0];
      expect(personNode.hasAnonymousComplexType).toBe(false);
    });
  });
});
