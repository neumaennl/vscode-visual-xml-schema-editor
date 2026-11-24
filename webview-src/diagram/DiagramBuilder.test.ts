/**
 * Unit tests for `DiagramBuilder` class.
 */

import { DiagramBuilder } from "../diagram/DiagramBuilder";
import type { DiagramItem } from "../diagram/DiagramItem";
import { getTypeText, hasInlineComplexType } from "../diagram/typeAccessors";
import { schema } from "../../shared/types";
import { SchemaNodeType } from "../../shared/idStrategy";
import { webviewSchemaWith } from "../../shared/__tests__/schemaTestHelpers";

/**
 * Creates a valid schema object for testing.
 * Properly typed to match the schema class structure.
 *
 * @param overrides - The fields to set on the schema
 * @returns The schema
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
    return builder.buildFromSchema(webviewSchemaWith(content)).rootElements[0]!.childElements;
  }

  describe("buildFromSchema", () => {
    test("should create diagram with schema root node", () => {
      const schemaObj = createTestSchema({
        targetNamespace: "http://example.com/ns",
      });

      const diagram = builder.buildFromSchema(schemaObj);

      expect(diagram.rootElements).toHaveLength(1);
      expect(diagram.rootElements[0]!.label).toContain("Schema:");
      expect(diagram.rootElements[0]!.label).toContain("http://example.com/ns");
    });

    test("should process schema elements", () => {
      const nodes = topLevelNodes(
        `<xs:element name="Person" type="PersonType"/><xs:element name="Address" type="AddressType"/>`
      );

      expect(nodes.map((node) => node.label)).toEqual(["Person", "Address"]);
    });

    test.each([
      ["a complex type", `<xs:complexType name="PersonType"/>`, "complexType"],
      [
        "a simple type",
        `<xs:simpleType name="EmailType"><xs:restriction base="xs:string"/></xs:simpleType>`,
        "simpleType (restricts xs:string)",
      ],
    ])("should process %s", (_case, content, type) => {
      const nodes = topLevelNodes(content);

      expect(nodes).toHaveLength(1);
      expect(getTypeText(nodes[0]!)).toBe(type);
    });

    test.each([
      ["no children are found", ""],
      [
        "the schema has only top-level attributes, which are not rendered as separate nodes",
        `<xs:attribute name="id" type="xs:string"/>`,
      ],
    ])("should show only the schema node when %s", (_case, content) => {
      expect(topLevelNodes(content)).toEqual([]);
    });

    test("should process multiple simple types", () => {
      const nodes = topLevelNodes(
        `<xs:simpleType name="Type1"><xs:restriction base="xs:string"/></xs:simpleType>` +
          `<xs:simpleType name="Type2"><xs:restriction base="xs:int"/></xs:simpleType>`
      );

      expect(nodes).toHaveLength(2);
    });

    test("should render named groups as top-level diagram nodes", () => {
      const nodes = topLevelNodes(
        `<xs:group name="PersonGroup"><xs:sequence><xs:element name="name" type="xs:string"/></xs:sequence></xs:group>`
      );

      expect(nodes).toHaveLength(1);
      expect(nodes[0]!.id).toBe("/group:PersonGroup");
      expect(nodes[0]!.childElements[0]!.id).toBe("/group:PersonGroup/group:sequence[0]");
    });

    test("should render group references inside named groups", () => {
      const nodes = topLevelNodes(
        `<xs:group name="ContainerGroup"><xs:sequence><xs:group ref="SharedGroup"/></xs:sequence></xs:group>`
      );

      const sequence = nodes[0]!.childElements[0]!;
      expect(sequence.childElements[0]!.id).toBe("/group:ContainerGroup/group:sequence[0]/groupRef:SharedGroup[0]");
    });

    test.each([
      [
        "an inline complex type",
        `<xs:element name="Person"><xs:complexType><xs:sequence><xs:element name="name" type="xs:string"/></xs:sequence></xs:complexType></xs:element>`,
        true,
      ],
      [
        "an inline simple type",
        `<xs:element name="Person"><xs:simpleType><xs:restriction base="xs:int"/></xs:simpleType></xs:element>`,
        false,
      ],
      ["a named type", `<xs:element name="Person" type="xs:string"/>`, false],
    ])(
      "should process elements with %s, one item for the element and its inline type",
      (_case, content, inlineComplexType) => {
        const nodes = topLevelNodes(content);

        expect(nodes).toHaveLength(1);
        expect(nodes[0]!.label).toBe("Person");
        expect(hasInlineComplexType(nodes[0]!)).toBe(inlineComplexType);
      }
    );

    test.each(["extension", "restriction"])(
      "should show the compositor and elements of the %s of complex content, with the IDs that the extension host uses",
      (derivation) => {
        const nodes = topLevelNodes(
          `<xs:complexType name="T"><xs:complexContent><xs:${derivation} base="B">
  <xs:sequence><xs:element name="x" type="xs:string"/></xs:sequence>
</xs:${derivation}></xs:complexContent></xs:complexType>`
        );

        const sequence = nodes[0]!.childElements[0]!;
        expect(sequence.id).toBe("/complexType:T/group:sequence[0]");
        expect(sequence.childElements.map((child) => child.id)).toEqual([
          "/complexType:T/group:sequence[0]/element:x[0]",
        ]);
      }
    );

    test("should handle schema without targetNamespace", () => {
      const diagram = builder.buildFromSchema(webviewSchemaWith(`<xs:element name="Test"/>`));

      expect(diagram.rootElements[0]!.label).toContain("Schema:");
    });
  });

  describe("schema objects and labels", () => {
    /** A schema with the target namespace `urn:t` and references to its own and to imported components. */
    const REFERENCES = `<xs:element name="person" type="xs:string"/>
<xs:complexType name="T"><xs:sequence>
  <xs:element ref="tns:person"/><xs:element ref="ext:item"/><xs:element name="x"/>
  <xs:group ref="tns:G"/><xs:group ref="ext:H"/>
</xs:sequence></xs:complexType>
<xs:group name="G"><xs:sequence/></xs:group>`;

    /**
     * Builds the diagram of {@link REFERENCES}.
     *
     * @returns The diagram
     */
    function buildReferences(): ReturnType<DiagramBuilder["buildFromSchema"]> {
      const schemaObj = webviewSchemaWith(REFERENCES, { tns: "urn:t", ext: "urn:ext" });
      schemaObj.targetNamespace = "urn:t";
      return new DiagramBuilder().buildFromSchema(schemaObj);
    }

    test("should let the diagram and each item reference the schema object it shows", () => {
      const diagram = buildReferences();
      const schemaObj = diagram.schema;

      expect(diagram.rootElements[0]!.schemaObject).toBe(schemaObj);
      expect(diagram.findItem("/element:person")?.schemaObject).toBe(schemaObj.element![0]);
      expect(diagram.findItem("/group:G")?.schemaObject).toBe(schemaObj.group![0]);
      expect(diagram.findItem("/complexType:T/group:sequence[0]")?.schemaObject).toBe(
        schemaObj.complexType![0]!.sequence
      );
      expect(diagram.findItem("/complexType:T/group:sequence[0]/element:x[2]")?.schemaObject).toBe(
        schemaObj.complexType![0]!.sequence!.element![2]
      );
    });

    test("should record the kind of schema construct that each item shows, as it was found in its parent", () => {
      const diagram = buildReferences();
      const nodeTypes = [
        "/schema",
        "/element:person",
        "/complexType:T",
        "/complexType:T/group:sequence[0]",
        "/group:G",
      ].map((id) => diagram.findItem(id)?.nodeType);
      const children = diagram
        .findItem("/complexType:T/group:sequence[0]")!
        .childElements.map((child) => child.nodeType);

      expect(nodeTypes).toEqual([
        SchemaNodeType.Schema,
        SchemaNodeType.Element,
        SchemaNodeType.ComplexType,
        SchemaNodeType.Group,
        SchemaNodeType.Group,
      ]);
      expect(children).toEqual([
        SchemaNodeType.Element,
        SchemaNodeType.Element,
        SchemaNodeType.Element,
        SchemaNodeType.GroupRef,
        SchemaNodeType.GroupRef,
      ]);
    });

    test("should label a reference with the name of the referenced component, with a prefix of another schema", () => {
      const sequence = buildReferences().findItem("/complexType:T/group:sequence[0]")!;

      expect(sequence.childElements.map((child) => [child.id.split("/").at(-1), child.label])).toEqual([
        ["element:unnamed[0]", "person"],
        ["element:unnamed[1]", "ext:item"],
        ["element:x[2]", "x"],
        ["groupRef:tns:G[0]", "G"],
        ["groupRef:ext:H[1]", "ext:H"],
      ]);
    });
  });
});
