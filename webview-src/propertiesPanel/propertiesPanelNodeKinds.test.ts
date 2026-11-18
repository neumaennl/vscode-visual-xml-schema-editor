/**
 * Unit tests of `propertiesPanelNodeKinds`.
 */

import { SCHEMA_ROOT_ID, SchemaNodeType } from "../../shared/idStrategy";
import { DiagramItem } from "../diagram";
import { DiagramItemType } from "../diagram/DiagramTypes";
import { canEditCardinality, getNodeType, getNodeTypeLabel, isTopLevelElement } from "./propertiesPanelNodeKinds";

/** An ID that `parseSchemaId()` rejects, so that the functions fall back to the item type. */
const UNPARSABLE_ID = "not-a-schema-id";

/**
 * Creates a diagram item without a diagram.
 *
 * @param id - The ID of the item
 * @param itemType - The kind of the item
 * @returns The item
 */
function item(id: string, itemType = DiagramItemType.element): DiagramItem {
  return new DiagramItem(id, "name", itemType);
}

describe("getNodeType", () => {
  test.each([
    [SCHEMA_ROOT_ID, SchemaNodeType.Schema],
    ["/element:a", SchemaNodeType.Element],
    ["/complexType:T", SchemaNodeType.ComplexType],
    ["/simpleType:S", SchemaNodeType.SimpleType],
    ["/group:G", SchemaNodeType.Group],
    ["/complexType:T/group:sequence[0]/groupRef:G[0]", SchemaNodeType.GroupRef],
  ])("should read the node type of %s from the ID", (id, expected) => {
    expect(getNodeType(item(id))).toBe(expected);
  });

  test.each([
    [DiagramItemType.element, SchemaNodeType.Element],
    [DiagramItemType.type, SchemaNodeType.SimpleType],
    [DiagramItemType.group, SchemaNodeType.Group],
  ])("should fall back to the item type %s for an ID that cannot be parsed", (itemType, expected) => {
    expect(getNodeType(item(UNPARSABLE_ID, itemType))).toBe(expected);
  });
});

describe("getNodeTypeLabel", () => {
  test.each([
    [SCHEMA_ROOT_ID, "Schema"],
    ["/element:a", "Element"],
    ["/complexType:T", "Complex Type"],
    ["/simpleType:S", "Simple Type"],
    ["/group:G", "Group"],
    ["/complexType:T/group:sequence[0]/groupRef:G[0]", "Group Reference"],
  ])("should label %s as %s", (id, expected) => {
    expect(getNodeTypeLabel(item(id))).toBe(expected);
  });

  test("should use the item type for a node type without a label", () => {
    expect(getNodeTypeLabel(item("/attribute:a", DiagramItemType.element))).toBe(DiagramItemType.element);
  });
});

describe("isTopLevelElement", () => {
  test.each([
    ["/element:a", true],
    ["/complexType:T/group:sequence[0]/element:a[0]", false],
    ["/complexType:T", false],
    [UNPARSABLE_ID, false],
  ])("should return for %s: %s", (id, expected) => {
    expect(isTopLevelElement(item(id))).toBe(expected);
  });
});

describe("canEditCardinality", () => {
  const { element, group, type } = DiagramItemType;

  test.each([
    [SCHEMA_ROOT_ID, element, false],
    ["/element:a", element, false],
    ["/complexType:T/group:sequence[0]/element:a[0]", element, true],
    ["/complexType:T/group:sequence[0]/groupRef:G[0]", group, true],
    ["/complexType:T/group:sequence[0]", group, true],
    ["/element:a/anonymousComplexType[0]/group:choice[0]", group, true],
    ["/complexType:T/group:sequence[0]/group:all[0]", group, true],
    ["/group:G/group:sequence[0]", group, false],
    ["/group:G", group, false],
    ["/complexType:T", type, false],
    ["/simpleType:S", type, false],
  ])("should return for %s (item type %s): %s", (id, itemType, expected) => {
    expect(canEditCardinality(item(id, itemType))).toBe(expected);
  });

  test("should allow an element whose ID cannot be parsed", () => {
    expect(canEditCardinality(item(UNPARSABLE_ID, element))).toBe(true);
  });
});
