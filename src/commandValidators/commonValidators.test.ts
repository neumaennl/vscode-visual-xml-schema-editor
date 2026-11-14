/**
 * Unit tests for the checks that validators of several areas share.
 */

import {
  ChildKind,
  NamedChild,
  locateChild,
  locateType,
  parseRequiredId,
  validateDefinitionExists,
  validateDefinitionRemoval,
  validateInlineTypeParent,
  validateNewChild,
  validateNewTypeName,
  validateReference,
} from "./commonValidators.js";
import { expectInvalid } from "../__tests__/validationTestHelpers.js";
import { schemaWith } from "../../shared/__tests__/schemaTestHelpers.js";

/** Elements of the schema and of sequences, as the element validators define them. */
const ELEMENTS: ChildKind = {
  label: "Element",
  validParents: ["schema", "sequence"],
  getChildren: (parent) => (parent as { element?: NamedChild[] }).element ?? [],
};

/** A schema with a top-level element `a`, a complexType `T` with local elements and a simpleType `S`. */
const SCHEMA = schemaWith(`<xs:element name="a" type="xs:string"/>
<xs:element name="withType"><xs:complexType/></xs:element>
<xs:complexType name="T"><xs:sequence>
  <xs:element name="first" type="xs:string"/>
  <xs:element ref="a"/>
</xs:sequence></xs:complexType>
<xs:simpleType name="S"><xs:restriction base="xs:string"/></xs:simpleType>`);

const SEQUENCE_ID = "/complexType:T/group:sequence[0]";

describe("validateReference", () => {
  test("accepts a reference to an existing component", () => {
    expect(validateReference("a", SCHEMA.element, "Element", "missing")).toEqual({ valid: true });
  });

  test("rejects a ref that is no valid XML name", () => {
    const result = validateReference("1a", SCHEMA.element, "Element", "missing");
    expectInvalid(result);
    expect(result.error).toBe("Element ref must be a valid XML name");
  });

  test("rejects a reference to a missing component with the given error", () => {
    const result = validateReference("b", SCHEMA.element, "Element", "missing");
    expectInvalid(result);
    expect(result.error).toBe("missing");
  });
});

describe("validateDefinitionExists", () => {
  test("accepts an existing name and rejects a missing one or missing components", () => {
    expect(validateDefinitionExists(SCHEMA.simpleType, "S", "missing").valid).toBe(true);
    expect(validateDefinitionExists(SCHEMA.simpleType, "X", "missing")).toEqual({ valid: false, error: "missing" });
    expect(validateDefinitionExists(undefined, "S", "missing").valid).toBe(false);
  });
});

describe("parseRequiredId", () => {
  test("rejects an empty ID", () => {
    expect(parseRequiredId("  ", "Group")).toEqual({ valid: false, error: "Group ID cannot be empty" });
  });

  test("parses a non-empty ID", () => {
    const result = parseRequiredId("/group:G", "Group");
    expect(result.valid && result.parsed.name).toBe("G");
  });
});

describe("validateDefinitionRemoval", () => {
  const isReferenced = (name: string): boolean => name === "used";

  test("passes a failure of the lookup on", () => {
    expect(validateDefinitionRemoval({ valid: false, error: "not found" }, "Group", isReferenced)).toEqual({
      valid: false,
      error: "not found",
    });
  });

  test("rejects a definition that is still referenced", () => {
    const result = validateDefinitionRemoval({ valid: true, target: "definition", name: "used" }, "Group", isReferenced);
    expectInvalid(result);
    expect(result.error).toBe("Group is still referenced and cannot be removed: used");
  });

  test.each([
    ["an unreferenced definition", { valid: true, target: "definition", name: "unused" } as const],
    ["a reference, whatever its name", { valid: true, target: "reference", name: "used" } as const],
  ])("accepts %s", (_case, located) => {
    expect(validateDefinitionRemoval(located, "Group", isReferenced)).toEqual({ valid: true });
  });
});

describe("validateNewChild", () => {
  test("accepts a new element in a sequence", () => {
    expect(validateNewChild(SCHEMA, SEQUENCE_ID, ELEMENTS, "second", undefined)).toEqual({ valid: true });
  });

  test.each([
    ["a missing parent", "/complexType:X", "b", undefined, "Parent node not found: /complexType:X"],
    ["a parent of the wrong type", "/complexType:T", "b", undefined, "Cannot add element to parent of type: topLevelComplexType"],
    ["a reference in the schema root", "/schema", undefined, "a", "Top-level elements cannot be references"],
    ["a duplicate name", SEQUENCE_ID, "first", undefined, "Cannot add element: duplicate element name 'first' in sequence"],
    ["a name used by a reference", SEQUENCE_ID, "a", undefined, "Cannot add element: duplicate element name 'a' in sequence"],
    ["a duplicate reference", SEQUENCE_ID, undefined, "a", "Cannot add element: duplicate element reference 'a' in sequence"],
  ])("rejects %s", (_case, parentId, name, ref, error) => {
    expect(validateNewChild(SCHEMA, parentId, ELEMENTS, name, ref)).toEqual({ valid: false, error });
  });
});

describe("locateChild", () => {
  test.each([
    ["by name", `${SEQUENCE_ID}/element:first`, "first"],
    ["by position", `${SEQUENCE_ID}/element:x[1]`, undefined],
    ["in the schema root, without a parent ID", "/element:a", "a"],
  ])("finds an element %s", (_case, id, name) => {
    const result = locateChild(SCHEMA, id, ELEMENTS, "remove element from");
    expect(result.valid && result.child.name).toBe(name);
  });

  test.each([
    ["an empty ID", " ", "Element ID cannot be empty"],
    ["a missing parent", "/complexType:X/group:sequence[0]/element:a", "Parent node not found for element: /complexType:X/group:sequence[0]/element:a"],
    ["a parent of the wrong type", "/complexType:T/element:a", "Cannot remove element from parent of type: topLevelComplexType"],
    ["a missing name", `${SEQUENCE_ID}/element:none`, "Element not found with name: none"],
    ["a position out of range", `${SEQUENCE_ID}/element:first[5]`, "Element not found at position: 5"],
  ])("rejects %s", (_case, id, error) => {
    expect(locateChild(SCHEMA, id, ELEMENTS, "remove element from")).toEqual({ valid: false, error });
  });
});

describe("validateInlineTypeParent", () => {
  const PARENTS = ["topLevelElement", "localElement"];

  test("accepts an element without an inline type", () => {
    expect(validateInlineTypeParent("/element:a", SCHEMA, "complexType", PARENTS)).toEqual({ valid: true });
  });

  test.each([
    ["a missing parent", "/element:x", "Parent not found: /element:x"],
    ["a parent of the wrong type", "/complexType:T", "Parent of type 'topLevelComplexType' cannot contain a complexType"],
    ["a reference", `${SEQUENCE_ID}/element:a[1]`, `'${SEQUENCE_ID}/element:a[1]' has a ref attribute and cannot carry an inline complexType`],
    ["an element with an inline complexType", "/element:withType", "'/element:withType' already has an anonymous complexType"],
  ])("rejects %s", (_case, parentId, error) => {
    expect(validateInlineTypeParent(parentId, SCHEMA, "complexType", PARENTS)).toEqual({ valid: false, error });
  });
});

describe("locateType", () => {
  test("finds a top-level type", () => {
    const result = locateType("/simpleType:S", SCHEMA, "simpleType", SCHEMA.simpleType);
    expect(result.valid && { name: result.type.name, anonymous: result.anonymous }).toEqual({ name: "S", anonymous: false });
  });

  test("finds an anonymous type in its parent", () => {
    const result = locateType("/element:withType/anonymousComplexType[0]", SCHEMA, "complexType", SCHEMA.complexType);
    expect(result.valid && result.anonymous).toBe(true);
  });

  test.each([
    ["an empty ID", "", "Type ID cannot be empty"],
    ["a missing top-level type", "/simpleType:X", "Simple type 'X' not found in schema"],
    ["a parent without an anonymous type", "/element:a/anonymousSimpleType[0]", "No anonymous simpleType found in parent: /element:a"],
  ])("rejects %s", (_case, typeId, error) => {
    expect(locateType(typeId, SCHEMA, "simpleType", SCHEMA.simpleType)).toEqual({ valid: false, error });
  });

  test("names complex types in the error", () => {
    expect(locateType("/complexType:X", SCHEMA, "complexType", SCHEMA.complexType)).toEqual({
      valid: false,
      error: "Complex type 'X' not found in schema",
    });
  });
});

describe("validateNewTypeName", () => {
  test.each([
    ["no new name", undefined, false, { valid: true }],
    ["a valid name of a top-level type", "U", false, { valid: true }],
    ["an invalid name", "1U", false, { valid: false, error: "Type name must be a valid XML name" }],
    [
      "a name for an anonymous type",
      "U",
      true,
      { valid: false, error: "Cannot provide 'typeName' when modifying an anonymous simpleType" },
    ],
  ])("checks %s", (_case, typeName, anonymous, expected) => {
    expect(validateNewTypeName(typeName, { anonymous }, "simpleType")).toEqual(expected);
  });
});
