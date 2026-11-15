/**
 * Unit tests for DiagramBuilder class.
 */

import { DiagramBuilder } from "../diagram/DiagramBuilder";
import type { DiagramItem } from "../diagram/DiagramItem";
import { schema } from "../../shared/types";
import { schemaWith } from "../../shared/__tests__/schemaTestHelpers";

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

  /**
   * Builds the diagram of a schema with the given content and returns the nodes below the schema root.
   *
   * @param content - The content of the schema
   * @returns The top-level nodes
   */
  function topLevelNodes(content: string): DiagramItem[] {
    return builder.buildFromSchema(schemaWith(content)).rootElements[0].childElements;
  }

  describe("buildFromSchema", () => {
    test("should create diagram with schema root node", () => {
      const schemaObj = createTestSchema({
        targetNamespace: "http://example.com/ns",
      });

      const diagram = builder.buildFromSchema(schemaObj);

      expect(diagram.rootElements).toHaveLength(1);
      expect(diagram.rootElements[0].name).toContain("Schema:");
      expect(diagram.rootElements[0].name).toContain("http://example.com/ns");
    });

    test("should expose schema-root documentation as structured annotation entries", () => {
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

    test("should process schema elements", () => {
      const nodes = topLevelNodes(`<xs:element name="Person" type="PersonType"/><xs:element name="Address" type="AddressType"/>`);

      expect(nodes.map((node) => node.name)).toEqual(["Person", "Address"]);
    });

    test("should store the targetNamespace prefix on the diagram when available", () => {
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

    test.each([
      ["a complex type", `<xs:complexType name="PersonType"/>`, "complexType"],
      ["a simple type", `<xs:simpleType name="EmailType"><xs:restriction base="xs:string"/></xs:simpleType>`, "simpleType (restricts xs:string)"],
    ])("should process %s", (_case, content, type) => {
      const nodes = topLevelNodes(content);

      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe(type);
    });

    test.each([
      ["no children are found", ""],
      ["the schema has only top-level attributes, which are not rendered as separate nodes", `<xs:attribute name="id" type="xs:string"/>`],
    ])("should add placeholder when %s", (_case, content) => {
      const nodes = topLevelNodes(content);

      expect(nodes.map((node) => node.name)).toEqual(["No elements found"]);
    });

    test("should process multiple simple types", () => {
      const nodes = topLevelNodes(
        `<xs:simpleType name="Type1"><xs:restriction base="xs:string"/></xs:simpleType>` +
          `<xs:simpleType name="Type2"><xs:restriction base="xs:int"/></xs:simpleType>`
      );

      expect(nodes).toHaveLength(2);
    });

    test("should render named groups as top-level diagram nodes", () => {
      const nodes = topLevelNodes(`<xs:group name="PersonGroup"><xs:sequence><xs:element name="name" type="xs:string"/></xs:sequence></xs:group>`);

      expect(nodes).toHaveLength(1);
      expect(nodes[0].id).toBe("/group:PersonGroup");
      expect(nodes[0].childElements[0].id).toBe("/group:PersonGroup/group:sequence[0]");
    });

    test("should render group references inside named groups", () => {
      const nodes = topLevelNodes(`<xs:group name="ContainerGroup"><xs:sequence><xs:group ref="SharedGroup"/></xs:sequence></xs:group>`);

      const sequence = nodes[0].childElements[0];
      expect(sequence.childElements[0].id).toBe("/group:ContainerGroup/group:sequence[0]/groupRef:SharedGroup[0]");
    });

    test.each([
      ["an inline complex type", `<xs:element name="Person"><xs:complexType><xs:sequence><xs:element name="name" type="xs:string"/></xs:sequence></xs:complexType></xs:element>`, true],
      ["an inline simple type", `<xs:element name="Person"><xs:simpleType><xs:restriction base="xs:int"/></xs:simpleType></xs:element>`, false],
      ["a named type", `<xs:element name="Person" type="xs:string"/>`, false],
    ])("should process elements with %s and set hasAnonymousComplexType for inline complex types", (_case, content, hasAnonymousComplexType) => {
      const nodes = topLevelNodes(content);

      expect(nodes).toHaveLength(1);
      expect(nodes[0].name).toBe("Person");
      expect(nodes[0].hasAnonymousComplexType).toBe(hasAnonymousComplexType);
    });

    test("should handle schema without targetNamespace", () => {
      const diagram = builder.buildFromSchema(schemaWith(`<xs:element name="Test"/>`));

      expect(diagram.rootElements[0].name).toContain("Schema:");
    });

    test("should expose top-level attributes on schema root properties", () => {
      const diagram = builder.buildFromSchema(
        schemaWith(`<xs:attribute name="lang" type="xs:string"/><xs:attribute name="version" type="xs:string"/>`)
      );

      expect(diagram.rootElements[0].attributes.map((attribute) => attribute.name)).toEqual(["lang", "version"]);
    });
  });
});
