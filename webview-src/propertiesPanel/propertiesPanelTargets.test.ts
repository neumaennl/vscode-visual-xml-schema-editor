/**
 * Unit tests of `propertiesPanelTargets`.
 */

import { SCHEMA_ROOT_ID } from "../../shared/idStrategy";
import { DiagramItem } from "../diagram";
import { DiagramItemType } from "../diagram/DiagramTypes";
import { resolveComplexTypeId, resolveDocumentationTargetId, resolveSimpleTypeId } from "./propertiesPanelTargets";

/**
 * Creates a diagram item without a diagram.
 *
 * @param id - The ID of the item
 * @param overrides - The fields to set on the item
 * @returns The item
 */
function item(id: string, overrides: Partial<DiagramItem> = {}): DiagramItem {
  const created = new DiagramItem(id, "name", DiagramItemType.element);
  Object.assign(created, overrides);
  return created;
}

/** An element without an anonymous type. */
const PLAIN_ELEMENT = item("/element:a");
/** An element with an anonymous simple type. */
const ELEMENT_WITH_SIMPLE_TYPE = item("/element:a", { isSimpleContent: true });
/** An element with an anonymous complex type. */
const ELEMENT_WITH_COMPLEX_TYPE = item("/element:a", { hasAnonymousComplexType: true });

describe("resolveSimpleTypeId", () => {
  test.each([
    ["a named simple type", item("/simpleType:S"), "/simpleType:S"],
    ["an anonymous simple type", item("/element:a/anonymousSimpleType[0]"), "/element:a/anonymousSimpleType[0]"],
    ["an element with an anonymous simple type", ELEMENT_WITH_SIMPLE_TYPE, "/element:a/anonymousSimpleType[0]"],
    ["an element without one", PLAIN_ELEMENT, null],
    ["a complex type", item("/complexType:T"), null],
  ])("should resolve %s", (_case, node, expected) => {
    expect(resolveSimpleTypeId(node)).toBe(expected);
  });
});

describe("resolveComplexTypeId", () => {
  test.each([
    ["a named complex type", item("/complexType:T"), "/complexType:T"],
    ["an anonymous complex type", item("/element:a/anonymousComplexType[0]"), "/element:a/anonymousComplexType[0]"],
    ["an element with an anonymous complex type", ELEMENT_WITH_COMPLEX_TYPE, "/element:a/anonymousComplexType[0]"],
    ["an element without one", ELEMENT_WITH_SIMPLE_TYPE, null],
    ["a simple type", item("/simpleType:S"), null],
  ])("should resolve %s", (_case, node, expected) => {
    expect(resolveComplexTypeId(node)).toBe(expected);
  });
});

describe("resolveDocumentationTargetId", () => {
  test.each([
    ["the schema", item(SCHEMA_ROOT_ID), SCHEMA_ROOT_ID],
    ["an element with an anonymous complex type", ELEMENT_WITH_COMPLEX_TYPE, "/element:a/anonymousComplexType[0]"],
    ["an element with an anonymous simple type", ELEMENT_WITH_SIMPLE_TYPE, "/element:a/anonymousSimpleType[0]"],
    ["an element without an anonymous type", PLAIN_ELEMENT, "/element:a"],
    ["a simple type", item("/simpleType:S"), "/simpleType:S"],
    ["a complex type", item("/complexType:T"), "/complexType:T"],
    ["a group", item("/group:G"), "/group:G"],
    [
      "a group reference",
      item("/complexType:T/group:sequence[0]/groupRef:G[0]"),
      "/complexType:T/group:sequence[0]/groupRef:G[0]",
    ],
    ["an attribute", item("/attribute:a"), null],
  ])("should target %s", (_case, node, expected) => {
    expect(resolveDocumentationTargetId(node)).toBe(expected);
  });
});
