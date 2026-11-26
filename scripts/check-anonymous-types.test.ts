import { findRepeatedTypes, type SourceText } from "./check-anonymous-types.ts";

/**
 * Finds the repeated anonymous types in one file.
 *
 * @param text - The text of the file
 * @returns The repeated types, as their normalized text
 */
function repeatedIn(text: string): string[] {
  return findRepeatedTypes([{ path: "a.ts", text }]).map((repeated) => repeated.type);
}

describe("findRepeatedTypes", () => {
  test("should report an object type that occurs twice, with its places", () => {
    const files: SourceText[] = [
      { path: "a.ts", text: "let a: { name?: string };" },
      { path: "b.ts", text: "\nfunction f(b: {\n  name?: string;\n}): void {}" },
    ];

    expect(findRepeatedTypes(files)).toEqual([{ type: "{ name?: string }", places: ["a.ts:1", "b.ts:2"] }]);
  });

  test.each([
    ["unions in another order", "let a: A | B; let b: B | A;", "A | B"],
    ["function types", "let a: (item: A) => void; let b: (item: A) => void;", "(item: A) => void"],
    ["tuples", "let a: [A, B]; let b: [A, B];", "[A, B]"],
  ])("should report %s", (_case, text, type) => {
    expect(repeatedIn(text)).toEqual([type]);
  });

  test.each([
    ["the definition of a named type", "type N = A | B; let a: A | B;"],
    ["X | undefined and X | null", "let a: A | undefined; let b: A | undefined; let c: A | null; let d: A | null;"],
    ["unions of primitive types", "let a: number | string; let b: number | string;"],
    ["functions without parameters that return a keyword type", "let a: () => void; let b: () => void;"],
    [
      "function types whose parameters have other names",
      "let a: (next: string) => void; let b: (message: string) => void;",
    ],
    ["an empty object type", "let a: {}; let b: {};"],
  ])("should not report %s", (_case, text) => {
    expect(repeatedIn(text)).toEqual([]);
  });
});
