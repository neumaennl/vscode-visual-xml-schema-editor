/**
 * Unit tests for the helpers for optional properties of schema nodes.
 */

import { appendTo, assignDefined, removeFrom } from "./nodeProperties.js";

/** A node with an optional array property, like the generated classes. */
interface Node {
  items?: string[];
  other?: number;
}

describe("appendTo", () => {
  test("should create the array for the first item", () => {
    const node: Node = {};
    appendTo(node, "items", "a");
    expect(node.items).toEqual(["a"]);
  });

  test("should append to an existing array", () => {
    const node: Node = { items: ["a"] };
    appendTo(node, "items", "b");
    expect(node.items).toEqual(["a", "b"]);
  });
});

describe("removeFrom", () => {
  test("should remove the matching items and keeps the others", () => {
    const node: Node = { items: ["a", "b", "a"] };
    removeFrom(node, "items", (item) => item === "a", "Item a");
    expect(node.items).toEqual(["b"]);
  });

  test("should pass the index", () => {
    const node: Node = { items: ["a", "b"] };
    removeFrom(node, "items", (_item, index) => index === 1, "Item 1");
    expect(node.items).toEqual(["a"]);
  });

  test("should remove the property with the last item", () => {
    const node: Node = { items: ["a"] };
    removeFrom(node, "items", () => true, "Item a");
    expect(node.items).toBeUndefined();
  });

  test.each([
    ["no matching item", { items: ["a"] }],
    ["no array", {}],
  ])("should fail if nothing is removed: %s", (_case, node: Node) => {
    expect(() => {
      removeFrom(node, "items", (item) => item === "x", "Item x");
    }).toThrow("Item x not found, although the validator accepted the command");
  });
});

describe("assignDefined", () => {
  test("should set the defined values and keeps the properties without a value", () => {
    const node: { a?: string; b?: number; c?: boolean } = { a: "old", b: 1 };
    const result = assignDefined(node, { a: "new", b: undefined, c: false });
    expect(result).toBe(node);
    expect(node).toEqual({ a: "new", b: 1, c: false });
  });
});
