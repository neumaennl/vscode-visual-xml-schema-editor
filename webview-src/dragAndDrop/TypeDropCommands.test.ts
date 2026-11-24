/**
 * Unit tests of `TypeDropCommands`. The default values of the single facets are tested with the drops in
 * `DropCommandFactory.test.ts`.
 */

import type { DiagramItem } from "../diagram/DiagramItem";
import { DraggableSchemaConstruct } from "./DraggableSchemaConstruct";
import { createFacetNodeDropCommand, getExtensionBaseType, getRestrictionBaseType } from "./TypeDropCommands";
import { diagramItem, muteDiagramBuilderLog } from "../__tests__/diagramTestHelpers";
import { webviewSchemaWith } from "../../shared/__tests__/schemaTestHelpers";

/** Types and elements with the kinds of types and derivations that the drop rules tell apart. */
const TYPES = `<xs:simpleType name="Code"><xs:restriction base="xs:string"/></xs:simpleType>
<xs:simpleType name="L"><xs:list itemType="xs:int"/></xs:simpleType>
<xs:simpleType name="U"><xs:union memberTypes="xs:int"/></xs:simpleType>
<xs:complexType name="T"/>
<xs:complexType name="R"><xs:complexContent><xs:restriction base="xs:anyType"/></xs:complexContent></xs:complexType>
<xs:complexType name="Price"><xs:simpleContent><xs:restriction base="B"/></xs:simpleContent></xs:complexType>
<xs:element name="count"><xs:simpleType><xs:restriction base="xs:int"/></xs:simpleType></xs:element>
<xs:element name="price"><xs:complexType><xs:simpleContent><xs:restriction base="B"/></xs:simpleContent></xs:complexType></xs:element>
<xs:element name="code" type="tns:Code"/>
<xs:element name="person"><xs:complexType/></xs:element>
<xs:element name="extended"><xs:complexType><xs:complexContent>
  <xs:extension base="tns:Base"/>
</xs:complexContent></xs:complexType></xs:element>
<xs:element name="plain"/>`;

/**
 * Returns the item with the given ID in the diagram of {@link TYPES}.
 *
 * @param id - The ID of the item
 * @returns The item
 */
function item(id: string): DiagramItem {
  return diagramItem(webviewSchemaWith(TYPES), id);
}

describe("TypeDropCommands", () => {
  muteDiagramBuilderLog();

  describe("getRestrictionBaseType", () => {
    test.each([
      ["the base of a derivation", "/simpleType:Code", "xs:string"],
      ["the type that an element names", "/element:code", "tns:Code"],
      ["xs:anyType for a complex type", "/complexType:T", "xs:anyType"],
      ["xs:anyType for an element with an anonymous complex type", "/element:person", "xs:anyType"],
      ["xs:string otherwise", "/simpleType:L", "xs:string"],
    ])("should return %s", (_case, id, expected) => {
      expect(getRestrictionBaseType(item(id))).toBe(expected);
    });
  });

  describe("getExtensionBaseType", () => {
    test.each([
      ["the base of a derivation", "/element:extended", "tns:Base"],
      ["the type that an element names", "/element:code", "tns:Code"],
      ["xs:anyType for a complex type without base", "/complexType:T", "xs:anyType"],
      ["xs:anyType for an element without type", "/element:plain", "xs:anyType"],
    ])("should return %s", (_case, id, expected) => {
      expect(getExtensionBaseType(item(id))).toBe(expected);
    });
  });

  describe("createFacetNodeDropCommand", () => {
    test("should modify a named simple type by its own ID", () => {
      expect(createFacetNodeDropCommand(item("/simpleType:Code"), DraggableSchemaConstruct.MaxLength)).toMatchObject({
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:Code", baseType: "xs:string", restrictions: { maxLength: 1 } },
      });
    });

    test("should modify the anonymous simple type of an element", () => {
      expect(createFacetNodeDropCommand(item("/element:count"), DraggableSchemaConstruct.MinInclusive)).toMatchObject({
        type: "modifySimpleType",
        payload: {
          typeId: "/element:count/anonymousSimpleType[0]",
          baseType: "xs:int",
          restrictions: { minInclusive: "0" },
        },
      });
    });

    test.each([
      ["a list", "/simpleType:L"],
      ["a union", "/simpleType:U"],
      ["a complex type", "/complexType:R"],
      ["a complex type with simple content", "/complexType:Price"],
      // It has no anonymous simple type that the command could address
      ["an element whose inline complex type has simple content", "/element:price"],
      ["an element without inline simple type", "/element:code"],
    ])("should return null for %s", (_case, id) => {
      expect(createFacetNodeDropCommand(item(id), DraggableSchemaConstruct.Enumeration)).toBeNull();
    });
  });
});
