/**
 * Unit tests of `propertiesPanelTypeReferences`.
 */

import {
  collectLocalSchemaTypeNames,
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

describe("collectLocalSchemaTypeNames", () => {
  test("should collect the trimmed names of the simple and complex types of the diagram", () => {
    expect([...collectLocalSchemaTypeNames(itemInSchemaWithTypes())]).toEqual(["Code", "Person"]);
  });

  test("should cache the names on the diagram", () => {
    const item = itemInSchemaWithTypes();
    const names = collectLocalSchemaTypeNames(item);
    item.diagram?.rootElements.push(new DiagramItem("/simpleType:Later", "Later", DiagramItemType.type));
    expect(collectLocalSchemaTypeNames(item)).toBe(names);
    expect(item.diagram?.localSchemaTypeNames).toBe(names);
  });

  test("should return no names for an item without a diagram", () => {
    expect(collectLocalSchemaTypeNames(new DiagramItem("/element:a", "a", DiagramItemType.element)).size).toBe(0);
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
    createTypeCommitHandler(itemWithPrefix("/element:a"), "xs:string", apply)(" xs:int ");
    expect(apply).toHaveBeenCalledWith("xs:int", " xs:int ");
  });

  test("should ignore a type that only differs before normalization", () => {
    const apply = vi.fn();
    createTypeCommitHandler(itemWithPrefix("/element:a"), "xs:int", apply)("  xs:int ");
    expect(apply).not.toHaveBeenCalled();
  });

  test("should ignore an empty type unless it is allowed", () => {
    const apply = vi.fn();
    createTypeCommitHandler(itemWithPrefix("/element:a"), "xs:string", apply)("  ");
    expect(apply).not.toHaveBeenCalled();
    createTypeCommitHandler(itemWithPrefix("/element:a"), "xs:string", apply, true)("  ");
    expect(apply).toHaveBeenCalledWith("", "  ");
  });
});
