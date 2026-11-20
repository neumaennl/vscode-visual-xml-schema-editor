/**
 * Unit tests of `propertiesPanelTypeReferences`.
 */

import {
  collectTypeSuggestions,
  createTypeCommitHandler,
  normalizeTypeReference,
} from "./propertiesPanelTypeReferences";
import { itemWithPrefix } from "../__tests__/propertiesPanelTestHelpers";
import { DiagramItem } from "../diagram";
import { DiagramItemType } from "../diagram/DiagramTypes";

/**
 * Creates an item in a diagram with the prefix `tns` whose roots are a simple type `Code`, a complex type
 * `Person` with a nested element and the element `root`.
 *
 * @returns An item of that diagram
 * @throws An {@link Error} if `itemWithPrefix()` creates no diagram
 */
function itemInSchemaWithTypes(): DiagramItem {
  const item = itemWithPrefix("/element:root");
  const diagram = item.diagram;
  if (!diagram) throw new Error("itemWithPrefix() creates no diagram");
  const person = new DiagramItem("/complexType:Person", " Person ", DiagramItemType.type, diagram);
  person.childElements.push(
    new DiagramItem("/complexType:Person/group:sequence[0]", "sequence", DiagramItemType.group, diagram)
  );
  diagram.rootElements.push(
    new DiagramItem("/simpleType:Code", "Code", DiagramItemType.type, diagram),
    person,
    new DiagramItem("/simpleType:Unnamed", "", DiagramItemType.type, diagram),
    item
  );
  return item;
}

describe("collectTypeSuggestions", () => {
  test("should suggest the 44 built-in data types without a node", () => {
    const suggestions = collectTypeSuggestions(null);
    expect(suggestions).toHaveLength(44);
    expect(suggestions).toEqual(expect.arrayContaining(["xs:string", "xs:ID", "xs:unsignedInt", "xs:gYear"]));
    expect(suggestions).not.toContain("xs:anyType");
  });

  test("should add the trimmed names of the types of the schema with and without the prefix of its target namespace", () => {
    expect(collectTypeSuggestions(itemInSchemaWithTypes()).slice(44)).toEqual([
      "Code",
      "tns:Code",
      "Person",
      "tns:Person",
    ]);
  });

  test("should collect the type names of the diagram once and cache them", () => {
    const item = itemInSchemaWithTypes();
    collectTypeSuggestions(item);
    item.diagram?.rootElements.push(new DiagramItem("/simpleType:Later", "Later", DiagramItemType.type));
    expect(collectTypeSuggestions(item)).not.toContain("Later");
    expect([...(item.diagram?.localSchemaTypeNames ?? [])]).toEqual(["Code", "Person"]);
  });

  test("should suggest only the built-in data types for an item without a diagram", () => {
    expect(collectTypeSuggestions(new DiagramItem("/element:a", "a", DiagramItemType.element))).toHaveLength(44);
  });
});

describe("normalizeTypeReference", () => {
  test.each([
    ["a type of the schema", " Code ", "tns:Code"],
    ["a prefixed type", "other:Code", "other:Code"],
    ["a built-in type", "string", "string"],
    ["an unknown type", "Unknown", "Unknown"],
    ["an empty type", "   ", ""],
  ])("should normalize %s", (_case, entered, expected) => {
    expect(normalizeTypeReference(itemInSchemaWithTypes(), entered)).toBe(expected);
  });

  test("should not add a prefix when the schema has none", () => {
    const item = itemInSchemaWithTypes();
    if (item.diagram) item.diagram.currentSchemaPrefix = " ";
    expect(normalizeTypeReference(item, "Code")).toBe("Code");
  });
});

describe("createTypeCommitHandler", () => {
  test("should apply a changed type with the normalized and the entered value", () => {
    const apply = vi.fn();
    createTypeCommitHandler(itemWithPrefix("/element:a"), "xs:string", apply)(" xs:int ", vi.fn());
    expect(apply).toHaveBeenCalledWith("xs:int", " xs:int ");
  });

  test("should ignore a type that only differs before normalization", () => {
    const apply = vi.fn();
    createTypeCommitHandler(itemWithPrefix("/element:a"), "xs:int", apply)("  xs:int ", vi.fn());
    expect(apply).not.toHaveBeenCalled();
  });

  test("should reject an empty type with a message unless it is allowed", () => {
    const apply = vi.fn();
    const reject = vi.fn();
    createTypeCommitHandler(itemWithPrefix("/element:a"), "xs:string", apply)("  ", reject);
    expect(apply).not.toHaveBeenCalled();
    expect(reject).toHaveBeenCalledExactlyOnceWith("Enter a type, such as xs:string");

    createTypeCommitHandler(itemWithPrefix("/element:a"), "xs:string", apply, true)("  ", reject);
    expect(apply).toHaveBeenCalledWith("", "  ");
    expect(reject).toHaveBeenCalledTimes(1);
  });
});
