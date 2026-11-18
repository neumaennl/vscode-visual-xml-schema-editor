/**
 * Unit tests for the commands that the editors of simple types in the properties panel send.
 */

import { webviewSchemaFromXml } from "../../shared/__tests__/schemaTestHelpers";
import {
  createSimpleTypeKindCommand,
  createSimpleTypeListCommand,
  createSimpleTypeUnionCommand,
  extractBaseType,
} from "./propertiesPanelSimpleTypeCommands";
import type { DiagramItem } from "../diagram";
import { diagramItem, muteDiagramBuilderLog } from "../__tests__/diagramTestHelpers";

/**
 * Restriction, list and union types, a union of an inline type, which has no type to derive a list
 * from, and elements with an inline simple type and a named type. The schema has a target
 * namespace, so references to its own types get the prefix `tns`.
 */
const SIMPLE_TYPES_XML = `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:tns="urn:test" targetNamespace="urn:test">
  <xs:simpleType name="Word"><xs:restriction base="xs:string">
    <xs:enumeration value="a"/><xs:maxLength value="5"/>
  </xs:restriction></xs:simpleType>
  <xs:simpleType name="Codes"><xs:list itemType="xs:token"/></xs:simpleType>
  <xs:simpleType name="Mixed"><xs:union memberTypes="xs:int xs:token"/></xs:simpleType>
  <xs:simpleType name="Inline"><xs:union><xs:simpleType><xs:restriction base="xs:int"/></xs:simpleType></xs:union></xs:simpleType>
  <xs:element name="size"><xs:simpleType><xs:restriction base="xs:int"/></xs:simpleType></xs:element>
  <xs:element name="code" type="xs:string"/>
</xs:schema>`;

/**
 * Returns the diagram item with the given ID from the diagram of {@link SIMPLE_TYPES_XML}.
 *
 * @param id - The ID of the item
 * @returns The item
 */
function simpleTypeNode(id: string): DiagramItem {
  return diagramItem(webviewSchemaFromXml(SIMPLE_TYPES_XML), id);
}

describe("propertiesPanelSimpleTypeCommands", () => {
  muteDiagramBuilderLog();

  describe("extractBaseType", () => {
    test.each([
      { typeText: "simpleType (restricts xs:string)", expected: "xs:string" },
      { typeText: "<anonymous complexType> with complexContent (extends tns:Base)", expected: "tns:Base" },
      { typeText: "xs:int ", expected: "xs:int" },
      { typeText: "simpleType (list of xs:token)", expected: undefined },
      { typeText: "tns:Word", expected: undefined },
    ])("should extract $expected from '$typeText'", ({ typeText, expected }) => {
      expect(extractBaseType(typeText)).toBe(expected);
    });
  });

  describe("createSimpleTypeListCommand", () => {
    test("should change the item type of a list and add the prefix to a type of the schema", () => {
      expect(createSimpleTypeListCommand(simpleTypeNode("/simpleType:Codes"), " Word ")).toEqual({
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:Codes", listItemType: "tns:Word" },
      });
    });

    test("should change the inline simple type of an element", () => {
      expect(createSimpleTypeListCommand(simpleTypeNode("/element:size"), "xs:int")).toEqual({
        type: "modifySimpleType",
        payload: { typeId: "/element:size/anonymousSimpleType[0]", listItemType: "xs:int" },
      });
    });

    test.each([
      { id: "/simpleType:Codes", itemType: "  " },
      { id: "/element:code", itemType: "xs:int" },
    ])("should create no command for $id with the item type '$itemType'", ({ id, itemType }) => {
      expect(createSimpleTypeListCommand(simpleTypeNode(id), itemType)).toBeNull();
    });
  });

  describe("createSimpleTypeUnionCommand", () => {
    test("should change the member types of a union, leave out empty ones and add the prefix to types of the schema", () => {
      expect(createSimpleTypeUnionCommand(simpleTypeNode("/simpleType:Mixed"), ["xs:int", " ", "Word"])).toEqual({
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:Mixed", unionMemberTypes: ["xs:int", "tns:Word"] },
      });
    });

    test.each([
      { id: "/simpleType:Mixed", memberTypes: ["", " "] },
      { id: "/element:code", memberTypes: ["xs:int"] },
    ])("should create no command for $id with the member types $memberTypes", ({ id, memberTypes }) => {
      expect(createSimpleTypeUnionCommand(simpleTypeNode(id), memberTypes)).toBeNull();
    });
  });

  describe("createSimpleTypeKindCommand", () => {
    test.each([
      { id: "/simpleType:Word", kind: "list", payload: { listItemType: "xs:string" } },
      { id: "/simpleType:Word", kind: "union", payload: { unionMemberTypes: ["xs:string"] } },
      { id: "/simpleType:Codes", kind: "union", payload: { unionMemberTypes: ["xs:token"] } },
      { id: "/simpleType:Codes", kind: "restriction", payload: { baseType: "xs:token" } },
      { id: "/simpleType:Mixed", kind: "list", payload: { listItemType: "xs:int" } },
    ] as const)("should change $id to a $kind derived from its current type", ({ id, kind, payload }) => {
      expect(createSimpleTypeKindCommand(simpleTypeNode(id), kind)).toEqual({
        type: "modifySimpleType",
        payload: { typeId: id, ...payload },
      });
    });

    test("should change the inline simple type of an element", () => {
      expect(createSimpleTypeKindCommand(simpleTypeNode("/element:size"), "list")).toEqual({
        type: "modifySimpleType",
        payload: { typeId: "/element:size/anonymousSimpleType[0]", listItemType: "xs:int" },
      });
    });

    test.each([
      { id: "/simpleType:Inline", kind: "list" },
      { id: "/simpleType:Inline", kind: "union" },
      { id: "/simpleType:Inline", kind: "restriction" },
      { id: "/element:code", kind: "list" },
    ] as const)("should create no $kind command for $id, which has no type to derive it from", ({ id, kind }) => {
      expect(createSimpleTypeKindCommand(simpleTypeNode(id), kind)).toBeNull();
    });
  });
});
