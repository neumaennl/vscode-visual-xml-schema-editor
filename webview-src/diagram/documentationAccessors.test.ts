/**
 * Unit tests of `documentationAccessors`.
 */

import type { DiagramItem } from "./DiagramItem";
import { getDocumentation, getDocumentationAnnotations } from "./documentationAccessors";
import { diagramItem, muteDiagramBuilderLog } from "../__tests__/diagramTestHelpers";
import { webviewSchemaFromXml } from "../../shared/__tests__/schemaTestHelpers";

/**
 * A schema with two annotations, and components with documentation of their own, of their inline types,
 * of both, and without any.
 */
const DOCUMENTED = `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:annotation>
    <xs:documentation>First annotation</xs:documentation>
    <xs:documentation xml:lang="de">Zweiter Eintrag</xs:documentation>
  </xs:annotation>
  <xs:annotation><xs:documentation>Third entry</xs:documentation></xs:annotation>
  <xs:element name="own"><xs:annotation><xs:documentation>Own</xs:documentation></xs:annotation></xs:element>
  <xs:element name="complex"><xs:complexType>
    <xs:annotation><xs:documentation>Of the complex type</xs:documentation></xs:annotation>
  </xs:complexType></xs:element>
  <xs:element name="simple"><xs:simpleType>
    <xs:annotation><xs:documentation>Of the simple type</xs:documentation></xs:annotation>
    <xs:restriction base="xs:string"/>
  </xs:simpleType></xs:element>
  <xs:element name="both">
    <xs:annotation><xs:documentation>Of the element</xs:documentation></xs:annotation>
    <xs:complexType><xs:annotation><xs:documentation>Of the type</xs:documentation></xs:annotation></xs:complexType>
  </xs:element>
  <xs:element name="empty"><xs:annotation/></xs:element>
  <xs:element name="plain"/>
</xs:schema>`;

/**
 * Returns the item with the given ID in the diagram of {@link DOCUMENTED}.
 *
 * @param id - The ID of the item
 * @returns The item
 */
function item(id: string): DiagramItem {
  return diagramItem(webviewSchemaFromXml(DOCUMENTED), id);
}

describe("documentationAccessors", () => {
  muteDiagramBuilderLog();

  test("should read the annotations of the schema with numbered IDs and the language of an entry", () => {
    expect(getDocumentationAnnotations(item("/schema"))).toEqual([
      {
        id: "/schema/annotation[0]",
        documentationEntries: [
          { id: "/schema/annotation[0]/documentation[0]", content: "First annotation", lang: undefined },
          { id: "/schema/annotation[0]/documentation[1]", content: "Zweiter Eintrag", lang: "de" },
        ],
      },
      {
        id: "/schema/annotation[1]",
        documentationEntries: [
          { id: "/schema/annotation[1]/documentation[0]", content: "Third entry", lang: undefined },
        ],
      },
    ]);
  });

  test.each([
    [
      "the entries of all annotations",
      "/schema",
      "/schema/annotation[0]",
      "First annotation\nZweiter Eintrag\nThird entry",
    ],
    ["the documentation of an element", "/element:own", "/element:own", "Own"],
    // An element without documentation of its own shows that of its inline type, which the commands address
    [
      "that of an inline complex type",
      "/element:complex",
      "/element:complex/anonymousComplexType[0]",
      "Of the complex type",
    ],
    [
      "that of an inline simple type",
      "/element:simple",
      "/element:simple/anonymousSimpleType[0]",
      "Of the simple type",
    ],
    ["its own instead of its type's", "/element:both", "/element:both", "Of the element"],
    ["an annotation without documentation", "/element:empty", "/element:empty", ""],
  ])("should read %s", (_case, id, annotationId, text) => {
    const node = item(id);

    expect(getDocumentationAnnotations(node)[0]?.id).toBe(annotationId);
    expect(getDocumentation(node)).toBe(text);
  });

  test("should read nothing for an element without annotation", () => {
    expect(getDocumentationAnnotations(item("/element:plain"))).toEqual([]);
    expect(getDocumentation(item("/element:plain"))).toBe("");
  });
});
