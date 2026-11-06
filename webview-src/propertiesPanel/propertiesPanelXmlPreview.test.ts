/**
 * Unit tests for the XML tab of the properties panel and the XSD fragment it shows.
 *
 * The fragment shows the attributes, annotations and facets of the node and one level of its
 * children, and may differ from the exact schema XML (see docs/ux-concept.md). The tests build the
 * diagram from real schemas, so the nodes look like the ones the user selects.
 */

import { PropertiesPanel } from "./propertiesPanel";
import { buildXmlPreview } from "./propertiesPanelXmlPreview";
import { DiagramBuilder } from "../diagram/DiagramBuilder";
import type { DiagramItem } from "../diagram/DiagramItem";
import { findButton } from "../__tests__/propertiesPanelTestHelpers";
import { unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../../shared/types";
import { schemaWith } from "../../src/__tests__/schemaTestHelpers";

/** Elements, types and a group with the properties that the fragment shows. */
const PREVIEW_NODES = `<xs:element name="code" type="xs:string" nillable="true" default="A"/>
<xs:element name="head" type="xs:string" abstract="true" fixed="B"/>
<xs:element name="note"><xs:complexType mixed="true">
  <xs:sequence><xs:element name="b" type="xs:string" minOccurs="0" maxOccurs="unbounded"/></xs:sequence>
  <xs:attribute name="lang" type="xs:language" use="required"/>
  <xs:attribute name="kind" type="xs:string" default="plain"/>
  <xs:attribute name="version" type="xs:string" fixed="1"/>
</xs:complexType></xs:element>
<xs:element name="size"><xs:simpleType><xs:restriction base="xs:int">
  <xs:minInclusive value="1"/><xs:maxInclusive value="9"/>
</xs:restriction></xs:simpleType></xs:element>
<xs:complexType name="Base" abstract="true"><xs:sequence><xs:element name="id" type="xs:ID"/></xs:sequence></xs:complexType>
<xs:complexType name="Derived" mixed="true"><xs:complexContent><xs:extension base="Base">
  <xs:sequence><xs:element name="extra" type="xs:string"/></xs:sequence>
</xs:extension></xs:complexContent></xs:complexType>
<xs:complexType name="Price"><xs:simpleContent><xs:extension base="xs:decimal">
  <xs:attribute name="currency" type="xs:string"/>
</xs:extension></xs:simpleContent></xs:complexType>
<xs:simpleType name="Codes"><xs:list itemType="xs:token"/></xs:simpleType>
<xs:simpleType name="Mixed"><xs:union memberTypes="xs:int xs:token"/></xs:simpleType>
<xs:simpleType name="Word">
  <xs:annotation><xs:documentation xml:lang="en">A word</xs:documentation><xs:documentation/></xs:annotation>
  <xs:restriction base="xs:string"><xs:enumeration value="a"/><xs:pattern value="[a-z]+"/></xs:restriction>
</xs:simpleType>
<xs:group name="Contact"><xs:choice><xs:element name="phone" type="xs:string"/></xs:choice></xs:group>
<xs:complexType name="WithRef"><xs:sequence><xs:group ref="Contact" minOccurs="0"/></xs:sequence></xs:complexType>
<xs:element name="pair"><xs:complexType><xs:attribute name="key" type="xs:string"/></xs:complexType></xs:element>`;

/**
 * Builds the diagram of a schema and returns the item with the given ID.
 *
 * @param schemaObj - The schema
 * @param id - The ID of the item
 * @returns The item
 */
function diagramItem(schemaObj: schema, id: string): DiagramItem {
  const items: DiagramItem[] = [];
  const collect = (item: DiagramItem): void => {
    items.push(item);
    item.childElements.forEach(collect);
  };
  new DiagramBuilder().buildFromSchema(schemaObj).rootElements.forEach(collect);
  const item = items.find((candidate) => candidate.id === id);
  if (!item) {
    return expect.fail(`No diagram item ${id}`);
  }
  return item;
}

describe("PropertiesPanel: the XML tab", () => {
  beforeEach(() => {
    // The diagram builder logs every schema it builds
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  test("shows the XSD fragment of the selected node", () => {
    const container = document.createElement("div");
    const item = diagramItem(schemaWith(PREVIEW_NODES), "/element:code");

    new PropertiesPanel(container).display(item);
    findButton(container, "XML")?.click();

    expect(container.querySelector("pre")?.textContent).toBe(buildXmlPreview(item));
  });

  test.each([
    {
      id: "/element:code",
      fragment: ['<xs:element name="code" type="xs:string" nillable="true" default="A"/>'],
    },
    {
      id: "/element:head",
      fragment: ['<xs:element name="head" type="xs:string" abstract="true" fixed="B"/>'],
    },
    {
      id: "/element:note",
      fragment: [
        '<xs:element name="note">',
        '  <xs:complexType mixed="true">',
        "    <xs:sequence>",
        "      <!-- ... truncated ... -->",
        "    </xs:sequence>",
        '    <xs:attribute name="lang" type="xs:language" use="required"/>',
        '    <xs:attribute name="kind" type="xs:string" default="plain"/>',
        '    <xs:attribute name="version" type="xs:string" fixed="1"/>',
        "  </xs:complexType>",
        "</xs:element>",
      ],
    },
    {
      id: "/element:note/anonymousComplexType[0]/group:sequence[0]",
      fragment: [
        "<xs:sequence>",
        '  <xs:element name="b" type="xs:string" minOccurs="0" maxOccurs="unbounded"/>',
        "</xs:sequence>",
      ],
    },
    {
      id: "/element:size",
      fragment: [
        '<xs:element name="size">',
        "  <xs:simpleType>",
        '    <xs:restriction base="xs:int">',
        '      <xs:minInclusive value="1"/>',
        '      <xs:maxInclusive value="9"/>',
        "    </xs:restriction>",
        "  </xs:simpleType>",
        "</xs:element>",
      ],
    },
    {
      id: "/element:pair",
      fragment: [
        '<xs:element name="pair">',
        "  <xs:complexType>",
        '    <xs:attribute name="key" type="xs:string"/>',
        "  </xs:complexType>",
        "</xs:element>",
      ],
    },
    {
      id: "/complexType:Base",
      fragment: [
        '<xs:complexType name="Base" abstract="true">',
        "  <xs:sequence>",
        "    <!-- ... truncated ... -->",
        "  </xs:sequence>",
        "</xs:complexType>",
      ],
    },
    {
      id: "/complexType:Derived",
      fragment: [
        '<xs:complexType name="Derived" mixed="true">',
        "  <xs:complexContent>",
        '    <xs:extension base="Base">',
        "      <xs:sequence>",
        "        <!-- ... truncated ... -->",
        "      </xs:sequence>",
        "    </xs:extension>",
        "  </xs:complexContent>",
        "</xs:complexType>",
      ],
    },
    {
      id: "/complexType:Price",
      fragment: [
        '<xs:complexType name="Price">',
        "  <xs:simpleContent>",
        '    <xs:extension base="xs:decimal">',
        '      <xs:attribute name="currency" type="xs:string"/>',
        "    </xs:extension>",
        "  </xs:simpleContent>",
        "</xs:complexType>",
      ],
    },
    {
      id: "/simpleType:Codes",
      fragment: ['<xs:simpleType name="Codes">', '  <xs:list itemType="xs:token"/>', "</xs:simpleType>"],
    },
    {
      id: "/simpleType:Mixed",
      fragment: ['<xs:simpleType name="Mixed">', '  <xs:union memberTypes="xs:int xs:token"/>', "</xs:simpleType>"],
    },
    {
      // The fragment lists the facets in a fixed order, which may differ from the schema
      id: "/simpleType:Word",
      fragment: [
        '<xs:simpleType name="Word">',
        "  <xs:annotation>",
        '    <xs:documentation xml:lang="en">A word</xs:documentation>',
        "    <xs:documentation/>",
        "  </xs:annotation>",
        '  <xs:restriction base="xs:string">',
        '    <xs:enumeration value="a"/>',
        '    <xs:pattern value="[a-z]+"/>',
        "  </xs:restriction>",
        "</xs:simpleType>",
      ],
    },
    {
      id: "/group:Contact",
      fragment: ['<xs:group name="Contact">', "  <xs:choice>", "    <!-- ... truncated ... -->", "  </xs:choice>", "</xs:group>"],
    },
    {
      id: "/complexType:WithRef/group:sequence[0]/groupRef:Contact[0]",
      fragment: ['<xs:group ref="Contact" minOccurs="0"/>'],
    },
  ])("shows $id with its attributes, annotations, facets and one level of children", ({ id, fragment }) => {
    expect(buildXmlPreview(diagramItem(schemaWith(PREVIEW_NODES), id))).toBe(fragment.join("\n"));
  });

  test("shows the namespaces of the schema and declares the xs prefix that the fragment uses", () => {
    const schemaObj = unmarshal(
      schema,
      `<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns="urn:default" targetNamespace="urn:target">
  <xsd:element name="a" type="xsd:string"/>
</xsd:schema>`
    );

    expect(buildXmlPreview(diagramItem(schemaObj, "/schema"))).toBe(
      [
        '<xs:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns="urn:default" xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="urn:target">',
        '  <xs:element name="a" type="xsd:string"/>',
        "</xs:schema>",
      ].join("\n")
    );
  });

  test("shows at most 50 children and marks the rest as truncated", () => {
    const elements = Array.from({ length: 51 }, (_, index) => `<xs:element name="e${index}" type="xs:string"/>`);
    const sequenceId = "/complexType:Many/group:sequence[0]";

    const schemaObj = schemaWith(`<xs:complexType name="Many"><xs:sequence>${elements.join("")}</xs:sequence></xs:complexType>`);

    const fragment = buildXmlPreview(diagramItem(schemaObj, sequenceId));

    expect(fragment).toContain('<xs:element name="e49" type="xs:string"/>');
    expect(fragment).not.toContain('name="e50"');
    expect(fragment).toContain("<!-- ... truncated ... -->");
  });
});
