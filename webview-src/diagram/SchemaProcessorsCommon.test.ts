/**
 * Unit tests for processChildCollection.
 */

import { processChildCollection } from "./SchemaProcessorsCommon";
import { DiagramItem } from "./DiagramItem";
import { DiagramItemType } from "./DiagramTypes";

/**
 * Creates a diagram item with the given name, or null for an empty name.
 *
 * @param name - The name
 * @returns The item, or null
 */
function itemFor(name: string): DiagramItem | null {
  return name ? new DiagramItem(`/element:${name}`, name, DiagramItemType.element) : null;
}

describe("processChildCollection", () => {
  test("should add the items that the factory creates and skips null", () => {
    const parent = new DiagramItem("/schema", "schema", DiagramItemType.element);
    processChildCollection(parent, ["a", "", "b"], itemFor);
    expect(parent.childElements.map((child) => child.name)).toEqual(["a", "b"]);
  });

  test("should do nothing for a missing collection", () => {
    const parent = new DiagramItem("/schema", "schema", DiagramItemType.element);
    processChildCollection(parent, undefined, itemFor);
    expect(parent.childElements).toEqual([]);
  });

  test("should process the content of each created item before it is added", () => {
    const parent = new DiagramItem("/schema", "schema", DiagramItemType.element);
    const processContent = vi.fn((node: DiagramItem, name: string) => {
      expect(parent.childElements).not.toContain(node);
      node.type = `type of ${name}`;
    });
    processChildCollection(parent, ["a", ""], itemFor, processContent);
    expect(processContent).toHaveBeenCalledTimes(1);
    expect(parent.childElements[0].type).toBe("type of a");
  });
});
