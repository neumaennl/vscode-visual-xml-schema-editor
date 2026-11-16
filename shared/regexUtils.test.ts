/**
 * Unit tests for the helpers for regular expressions.
 */

import { requireGroup } from "./regexUtils.js";

describe("requireGroup", () => {
  test("should return the text of a group", () => {
    const match = /^(\w+)\[(\d+)\]$/.exec("element[3]")!;

    expect(requireGroup(match, 1)).toBe("element");
    expect(requireGroup(match, 2)).toBe("3");
  });

  test("should return an empty group as an empty string", () => {
    expect(requireGroup(/^a(b*)c$/.exec("ac")!, 1)).toBe("");
  });

  test("should throw for a group that did not take part in the match", () => {
    expect(() => requireGroup(/^a(b)?c$/.exec("ac")!, 1)).toThrow("Group 1 did not take part in the match of ac");
  });

  test("should throw for a group that the pattern does not have", () => {
    expect(() => requireGroup(/^a$/.exec("a")!, 1)).toThrow("Group 1");
  });
});
