/**
 * Unit tests for `commandUtils`: the parsing of annotation and documentation IDs, and the lookups of
 * children and attribute group references.
 */

import {
  findAttributeGroupRef,
  findIdentifiedChild,
  identifyChild,
  parseDocumentationId,
  parseSchemaAnnotationId,
  parseSchemaDocumentationId,
} from "./commandUtils.js";
import { attributeGroupRef } from "../shared/types.js";

/** Children with a name, a ref and a name that repeats. */
const CHILDREN = [{ name: "a" }, { ref: "b" }, { name: "a" }];

/**
 * Creates attribute group references with the given refs.
 *
 * @param refs - The refs
 * @returns The references
 */
function refsOf(...refs: string[]): attributeGroupRef[] {
  return refs.map((ref) => Object.assign(new attributeGroupRef(), { ref }));
}

describe("findIdentifiedChild", () => {
  test("should find the first child with the name, or the child at the position", () => {
    expect(findIdentifiedChild(CHILDREN, "a", undefined)).toBe(CHILDREN[0]);
    expect(findIdentifiedChild(CHILDREN, "a", 2)).toBe(CHILDREN[2]);
    expect(findIdentifiedChild(CHILDREN, undefined, 5)).toBeUndefined();
  });
});

describe("identifyChild", () => {
  test("should describe the child by its name, or else by its position", () => {
    expect(identifyChild("Element", "a", 2).what).toBe("Element a");
    expect(identifyChild("Element", undefined, 2).what).toBe("Element at position 2");
  });

  test.each([
    ["the position, which wins over the name", "x", 1, 1, true],
    ["another position", "a", 1, 0, false],
    ["the name", "a", undefined, 0, true],
    ["the ref", "b", undefined, 1, true],
    ["a different name", "c", undefined, 0, false],
    ["neither a name nor a position", undefined, undefined, 0, false],
  ])("should match by %s", (_case, name, position, index, expected) => {
    expect(identifyChild("Element", name, position).matches(CHILDREN[index]!, index)).toBe(expected);
  });

  test("should match every child with the name", () => {
    expect(CHILDREN.filter(identifyChild("Element", "a", undefined).matches)).toEqual([CHILDREN[0], CHILDREN[2]]);
  });
});

describe("findAttributeGroupRef", () => {
  const refs = refsOf("A", "B", "A");

  test.each([
    ["the first reference with the name", "A", undefined, 0],
    ["the reference at the position", undefined, 2, 2],
    ["the reference at the position if it has the name", "A", 2, 2],
  ])("should find %s", (_case, name, position, index) => {
    expect(findAttributeGroupRef(refs, name, position)).toBe(refs[index]);
  });

  test.each([
    ["a reference at the position with another name", "B", 2],
    ["a position out of range", undefined, 3],
    ["a missing name", "C", undefined],
    ["neither a name nor a position", undefined, undefined],
  ])("should find nothing for %s", (_case, name, position) => {
    expect(findAttributeGroupRef(refs, name, position)).toBeUndefined();
  });
});

// ─── parseDocumentationId ────────────────────────────────────────────────────

describe("parseDocumentationId", () => {
  test("should parse a simple element path with index 0", () => {
    const result = parseDocumentationId("/element:person/documentation[0]");
    expect(result.elementId).toBe("/element:person");
    expect(result.documentationIndex).toBe(0);
  });

  test("should parse a nested path with index 2", () => {
    const result = parseDocumentationId("/element:person/anonymousComplexType[0]/documentation[2]");
    expect(result.elementId).toBe("/element:person/anonymousComplexType[0]");
    expect(result.documentationIndex).toBe(2);
  });

  test("should throw for an ID without documentation suffix", () => {
    expect(() => parseDocumentationId("/element:person")).toThrow("Invalid documentationId format");
  });

  test("should throw for a bare non-path string", () => {
    expect(() => parseDocumentationId("doc1")).toThrow("Invalid documentationId format");
  });
});

// ─── parseSchemaAnnotationId / parseSchemaDocumentationId ───────────────────

describe("parseSchemaAnnotationId", () => {
  test("should parse '/schema/annotation[0]'", () => {
    expect(parseSchemaAnnotationId("/schema/annotation[0]")).toBe(0);
  });

  test("should parse '/schema/annotation[2]'", () => {
    expect(parseSchemaAnnotationId("/schema/annotation[2]")).toBe(2);
  });

  test("should return null for a non-canonical 'schema/annotation[0]' path", () => {
    expect(parseSchemaAnnotationId("schema/annotation[0]")).toBeNull();
  });

  test("should return null for a non-schema path", () => {
    expect(parseSchemaAnnotationId("/element:person")).toBeNull();
  });

  test("should return null for a plain 'schema'", () => {
    expect(parseSchemaAnnotationId("schema")).toBeNull();
  });
});

describe("parseSchemaDocumentationId", () => {
  test("should parse '/schema/annotation[0]/documentation[1]'", () => {
    const result = parseSchemaDocumentationId("/schema/annotation[0]/documentation[1]");
    expect(result).toEqual({ annotationIndex: 0, documentationIndex: 1 });
  });

  test("should parse '/schema/annotation[2]/documentation[3]'", () => {
    const result = parseSchemaDocumentationId("/schema/annotation[2]/documentation[3]");
    expect(result).toEqual({ annotationIndex: 2, documentationIndex: 3 });
  });

  test("should return null for a plain '/schema/documentation[0]'", () => {
    expect(parseSchemaDocumentationId("/schema/documentation[0]")).toBeNull();
  });

  test("should return null for a non-canonical 'schema/annotation[0]/documentation[1]' path", () => {
    expect(parseSchemaDocumentationId("schema/annotation[0]/documentation[1]")).toBeNull();
  });

  test("should return null for an element path", () => {
    expect(parseSchemaDocumentationId("/element:person/documentation[0]")).toBeNull();
  });
});
