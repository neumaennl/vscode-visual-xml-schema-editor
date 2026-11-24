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
import type { NamespacePrefixes } from "../../shared/types";
import {
  diagramItem,
  muteDiagramBuilderLog,
  emptyDiagram,
  NOT_READ_SCHEMA_OBJECT,
} from "../__tests__/diagramTestHelpers";
import { webviewSchemaWith } from "../../shared/__tests__/schemaTestHelpers";
import { DiagramItemType } from "../diagram/DiagramTypes";

/** A schema with the target namespace `urn:test`, a simple type `Code`, a complex type `Person` and an element `root`. */
const TYPES = `<xs:simpleType name="Code"><xs:restriction base="xs:string"/></xs:simpleType>
<xs:complexType name="Person"><xs:sequence/></xs:complexType>
<xs:element name="root"/>`;

/**
 * Returns the element `root` in the diagram of {@link TYPES}.
 *
 * @param prefixes - The namespace declarations of the schema; by default `tns` for its target namespace
 * @returns The item
 */
function itemInSchemaWithTypes(prefixes: NamespacePrefixes = { tns: "urn:test" }): DiagramItem {
  const schemaObj = webviewSchemaWith(TYPES, prefixes);
  schemaObj.targetNamespace = "urn:test";
  return diagramItem(schemaObj, "/element:root");
}

describe("collectTypeSuggestions", () => {
  muteDiagramBuilderLog();

  test("should suggest the 44 built-in data types in a schema without types", () => {
    const suggestions = collectTypeSuggestions(
      new DiagramItem("/element:a", "a", DiagramItemType.element, NOT_READ_SCHEMA_OBJECT, emptyDiagram())
    );
    expect(suggestions).toHaveLength(44);
    expect(suggestions).toEqual(expect.arrayContaining(["xs:string", "xs:ID", "xs:unsignedInt", "xs:gYear"]));
    expect(suggestions).not.toContain("xs:anyType");
  });

  test("should add the names of the types of the schema with and without the prefix of its target namespace", () => {
    expect(collectTypeSuggestions(itemInSchemaWithTypes()).slice(44)).toEqual([
      "Code",
      "tns:Code",
      "Person",
      "tns:Person",
    ]);
  });
});

describe("normalizeTypeReference", () => {
  muteDiagramBuilderLog();

  test.each([
    ["a type of the schema", " Code ", "tns:Code"],
    ["a prefixed type", "other:Code", "other:Code"],
    ["a built-in type", "string", "string"],
    ["an unknown type", "Unknown", "Unknown"],
    ["an empty type", "   ", ""],
  ])("should normalize %s", (_case, entered, expected) => {
    expect(normalizeTypeReference(itemInSchemaWithTypes(), entered)).toBe(expected);
  });

  test("should not add a prefix when the schema declares none for its target namespace", () => {
    expect(normalizeTypeReference(itemInSchemaWithTypes({}), "Code")).toBe("Code");
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
