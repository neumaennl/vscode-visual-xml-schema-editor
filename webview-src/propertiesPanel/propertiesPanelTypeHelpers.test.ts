/**
 * Unit tests for the helpers of the type fields of the properties panel.
 */

import { getReadOnlyTypeValue, getTypeEditHint } from "./propertiesPanelTypeHelpers";
import type { DiagramItem } from "../diagram";
import { diagramItem, muteDiagramBuilderLog } from "../__tests__/diagramTestHelpers";
import { webviewSchemaWith } from "../../shared/__tests__/schemaTestHelpers";

/** Elements with a named type, inline simple types (a restriction, a list and unions) and inline complex types, and named simple types. */
const TYPED_NODES = `<xs:element name="code" type="xs:string"/>
<xs:element name="size"><xs:simpleType><xs:restriction base="xs:int"/></xs:simpleType></xs:element>
<xs:element name="note"><xs:complexType><xs:sequence><xs:element name="b" type="xs:string"/></xs:sequence></xs:complexType></xs:element>
<xs:element name="extended"><xs:complexType><xs:complexContent><xs:extension base="Base"/></xs:complexContent></xs:complexType></xs:element>
<xs:element name="restricted"><xs:complexType><xs:complexContent><xs:restriction base="Base"/></xs:complexContent></xs:complexType></xs:element>
<xs:complexType name="Base"/>
<xs:simpleType name="Word"><xs:restriction base="xs:string"/></xs:simpleType>
<xs:simpleType name="Codes"><xs:list itemType="xs:token"/></xs:simpleType>
<xs:element name="tags"><xs:simpleType><xs:list itemType="xs:token"/></xs:simpleType></xs:element>
<xs:element name="amount"><xs:simpleType><xs:union memberTypes="xs:int xs:decimal"/></xs:simpleType></xs:element>
<xs:element name="mixed"><xs:simpleType><xs:union><xs:simpleType><xs:restriction base="xs:int"/></xs:simpleType></xs:union></xs:simpleType></xs:element>`;

/**
 * Returns the diagram item with the given ID from the diagram of {@link TYPED_NODES}.
 *
 * @param id - The ID of the item
 * @returns The item
 */
function typedNode(id: string): DiagramItem {
  return diagramItem(webviewSchemaWith(TYPED_NODES), id);
}

describe("propertiesPanelTypeHelpers", () => {
  muteDiagramBuilderLog();

  describe("getReadOnlyTypeValue", () => {
    test.each([
      { id: "/element:extended", expected: "Inline complexType (extends Base)" },
      { id: "/element:restricted", expected: "Inline complexType (restricts Base)" },
      { id: "/element:note", expected: "Inline complexType" },
      { id: "/element:size", expected: "Inline simpleType (restricts xs:int)" },
      { id: "/element:tags", expected: "Inline simpleType (list of xs:token)" },
      { id: "/element:amount", expected: "Inline simpleType (union of xs:int, xs:decimal)" },
      { id: "/element:mixed", expected: "Inline simpleType" },
      { id: "/element:code", expected: "xs:string" },
    ])("should show $id as '$expected'", ({ id, expected }) => {
      expect(getReadOnlyTypeValue(typedNode(id))).toBe(expected);
    });
  });

  describe("getTypeEditHint", () => {
    test.each([
      {
        id: "/element:note",
        expected: "Setting a replacement type removes the current inline complexType from this element.",
      },
      {
        id: "/element:size",
        expected: "Setting a replacement type removes the current inline simpleType from this element.",
      },
      // A list has no base type
      {
        id: "/simpleType:Codes",
        expected: "This simpleType does not expose a single base type that can be edited here.",
      },
      { id: "/simpleType:Word", expected: null },
      { id: "/element:code", expected: null },
    ])("should give $id the hint '$expected'", ({ id, expected }) => {
      expect(getTypeEditHint(typedNode(id))).toBe(expected);
    });
  });
});
