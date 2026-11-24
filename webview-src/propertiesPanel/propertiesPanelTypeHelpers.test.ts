/**
 * Unit tests for the helpers of the type fields of the properties panel.
 */

import {
  getReadOnlyTypeValue,
  getTypeEditHint,
  hasInlineAnonymousElementType,
  isInlineComplexTypeElement,
  isInlineSimpleTypeElement,
} from "./propertiesPanelTypeHelpers";
import { SchemaNodeType } from "../../shared/idStrategy";
import type { DiagramItem } from "../diagram";
import { diagramItem, muteDiagramBuilderLog } from "../__tests__/diagramTestHelpers";
import { webviewSchemaWith } from "../../shared/__tests__/schemaTestHelpers";

/** Elements with a named type, inline simple types (a restriction, a list and unions) and inline complex types, and a named simple type. */
const TYPED_NODES = `<xs:element name="code" type="xs:string"/>
<xs:element name="size"><xs:simpleType><xs:restriction base="xs:int"/></xs:simpleType></xs:element>
<xs:element name="note"><xs:complexType><xs:sequence><xs:element name="b" type="xs:string"/></xs:sequence></xs:complexType></xs:element>
<xs:element name="extended"><xs:complexType><xs:complexContent><xs:extension base="Base"/></xs:complexContent></xs:complexType></xs:element>
<xs:element name="restricted"><xs:complexType><xs:complexContent><xs:restriction base="Base"/></xs:complexContent></xs:complexType></xs:element>
<xs:complexType name="Base"/>
<xs:simpleType name="Word"><xs:restriction base="xs:string"/></xs:simpleType>
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

  describe("isInlineSimpleTypeElement, isInlineComplexTypeElement and hasInlineAnonymousElementType", () => {
    test.each([
      { id: "/element:code", nodeType: SchemaNodeType.Element, simple: false, complex: false },
      { id: "/element:size", nodeType: SchemaNodeType.Element, simple: true, complex: false },
      { id: "/element:note", nodeType: SchemaNodeType.Element, simple: false, complex: true },
      { id: "/simpleType:Word", nodeType: SchemaNodeType.SimpleType, simple: false, complex: false },
    ])(
      "should tell whether $id has an inline simple ($simple) or complex type ($complex)",
      ({ id, nodeType, simple, complex }) => {
        const node = typedNode(id);

        expect(isInlineSimpleTypeElement(node, nodeType)).toBe(simple);
        expect(isInlineComplexTypeElement(node, nodeType)).toBe(complex);
        expect(hasInlineAnonymousElementType(node, nodeType)).toBe(simple || complex);
      }
    );
  });

  describe("getReadOnlyTypeValue", () => {
    test.each([
      { id: "/element:extended", baseType: "Base", expected: "Inline complexType (extends Base)" },
      { id: "/element:restricted", baseType: "Base", expected: "Inline complexType (restricts Base)" },
      { id: "/element:extended", baseType: undefined, expected: "Inline complexType" },
      { id: "/element:note", baseType: "Base", expected: "Inline complexType" },
      { id: "/element:size", baseType: "xs:int", expected: "Inline simpleType (restricts xs:int)" },
      { id: "/element:size", baseType: undefined, expected: "Inline simpleType" },
      { id: "/element:tags", baseType: undefined, expected: "Inline simpleType (list of xs:token)" },
      { id: "/element:amount", baseType: undefined, expected: "Inline simpleType (union of xs:int, xs:decimal)" },
      { id: "/element:mixed", baseType: undefined, expected: "Inline simpleType" },
      { id: "/element:code", baseType: undefined, expected: "xs:string" },
    ])("should show $id with the base type $baseType as '$expected'", ({ id, baseType, expected }) => {
      expect(getReadOnlyTypeValue(typedNode(id), baseType)).toBe(expected);
    });
  });

  describe("getTypeEditHint", () => {
    test.each([
      {
        id: "/element:note",
        nodeType: SchemaNodeType.Element,
        baseType: undefined,
        expected: "Setting a replacement type removes the current inline complexType from this element.",
      },
      {
        id: "/element:size",
        nodeType: SchemaNodeType.Element,
        baseType: "xs:int",
        expected: "Setting a replacement type removes the current inline simpleType from this element.",
      },
      {
        id: "/simpleType:Word",
        nodeType: SchemaNodeType.SimpleType,
        baseType: undefined,
        expected: "This simpleType does not expose a single base type that can be edited here.",
      },
      {
        id: "/element:size",
        nodeType: SchemaNodeType.AnonymousSimpleType,
        baseType: undefined,
        expected: "This simpleType does not expose a single base type that can be edited here.",
      },
      { id: "/simpleType:Word", nodeType: SchemaNodeType.SimpleType, baseType: "xs:string", expected: null },
      { id: "/element:code", nodeType: SchemaNodeType.Element, baseType: undefined, expected: null },
    ])(
      "should give $id as $nodeType with the base type $baseType the hint '$expected'",
      ({ id, nodeType, baseType, expected }) => {
        expect(getTypeEditHint(typedNode(id), nodeType, baseType)).toBe(expected);
      }
    );
  });
});
