/**
 * Unit tests of `TypeDropCommands`. The default values of the single facets are tested with the drops in
 * `DropCommandFactory.test.ts`.
 */

import { DiagramItem } from "../diagram/DiagramItem";
import { DiagramItemType } from "../diagram/DiagramTypes";
import { DraggableSchemaConstruct } from "./DraggableSchemaConstruct";
import {
  createFacetNodeDropCommand,
  getExtensionBaseType,
  getRestrictionBaseType,
  isComplexTypeNode,
  isSimpleTypeNode,
} from "./TypeDropCommands";

/**
 * Creates a diagram item.
 *
 * @param id - The ID of the item
 * @param itemType - The kind of item
 * @param overrides - The fields to set on the item
 * @returns The item
 */
function makeItem(id: string, itemType: DiagramItemType, overrides: Partial<DiagramItem> = {}): DiagramItem {
  const item = new DiagramItem(id, "name", itemType);
  Object.assign(item, overrides);
  return item;
}

const { element, group, type } = DiagramItemType;

/** A named simple type that restricts `xs:string`. */
const RESTRICTED_SIMPLE_TYPE = makeItem("/simpleType:Code", type, {
  type: "simpleType (restricts xs:string)",
  simpleTypeDerivationKind: "restriction",
});

/** An element whose anonymous simple type restricts `xs:int`. */
const ELEMENT_WITH_RESTRICTION = makeItem("/element:count", element, {
  type: "<anonymous simpleType> (restricts xs:int)",
  simpleTypeDerivationKind: "restriction",
  isSimpleContent: true,
});

describe("isSimpleTypeNode and isComplexTypeNode", () => {
  test.each([
    ["a named simple type", makeItem("/simpleType:S", type, { type: "simpleType" }), true, false],
    ["a named complex type", makeItem("/complexType:T", type, { type: "complexType with sequence" }), false, true],
    ["an element", makeItem("/element:a", element, { type: "simpleType" }), false, false],
    ["a group", makeItem("/group:G", group, { type: "complexType" }), false, false],
  ])("should classify %s", (_case, item, simple, complex) => {
    expect(isSimpleTypeNode(item)).toBe(simple);
    expect(isComplexTypeNode(item)).toBe(complex);
  });
});

describe("getRestrictionBaseType", () => {
  test.each([
    ["the base of a derivation", RESTRICTED_SIMPLE_TYPE, "xs:string"],
    ["the type that the text names", makeItem("/element:a", element, { type: "tns:Code" }), "tns:Code"],
    ["xs:anyType for a complex type", makeItem("/complexType:T", type, { type: "complexType" }), "xs:anyType"],
    [
      "xs:anyType for an element with an anonymous complex type",
      makeItem("/element:a", element, { type: "<anonymous complexType>", hasAnonymousComplexType: true }),
      "xs:anyType",
    ],
    ["xs:string otherwise", makeItem("/simpleType:S", type, { type: "simpleType with list" }), "xs:string"],
  ])("should return %s", (_case, item, expected) => {
    expect(getRestrictionBaseType(item)).toBe(expected);
  });
});

describe("getExtensionBaseType", () => {
  test.each([
    ["the base of a derivation", "<anonymous complexType> (extends tns:Base)", "tns:Base"],
    ["the type that the text names", "tns:Base", "tns:Base"],
    ["xs:anyType for a label", "complexType", "xs:anyType"],
    ["xs:anyType for an empty text", " ", "xs:anyType"],
  ])("should return %s", (_case, typeText, expected) => {
    expect(getExtensionBaseType(makeItem("/element:a", element, { type: typeText }))).toBe(expected);
  });
});

describe("createFacetNodeDropCommand", () => {
  test("should modify a named simple type by its own ID", () => {
    expect(createFacetNodeDropCommand(RESTRICTED_SIMPLE_TYPE, DraggableSchemaConstruct.MaxLength)).toMatchObject({
      type: "modifySimpleType",
      payload: { typeId: "/simpleType:Code", baseType: "xs:string", restrictions: { maxLength: 1 } },
    });
  });

  test("should modify the anonymous simple type of an element", () => {
    expect(createFacetNodeDropCommand(ELEMENT_WITH_RESTRICTION, DraggableSchemaConstruct.MinInclusive)).toMatchObject({
      type: "modifySimpleType",
      payload: {
        typeId: "/element:count/anonymousSimpleType[0]",
        baseType: "xs:int",
        restrictions: { minInclusive: "0" },
      },
    });
  });

  test.each([
    ["a list", makeItem("/simpleType:L", type, { type: "simpleType (list)", simpleTypeDerivationKind: "list" })],
    ["a union", makeItem("/simpleType:U", type, { type: "simpleType (union)", simpleTypeDerivationKind: "union" })],
    ["a complex type", makeItem("/complexType:T", type, { type: "complexType (restricts xs:anyType)" })],
    ["an element without simple content", makeItem("/element:a", element, { type: "xs:string (restricts)" })],
  ])("should return null for %s", (_case, item) => {
    expect(createFacetNodeDropCommand(item, DraggableSchemaConstruct.Enumeration)).toBeNull();
  });
});
