/**
 * Unit tests of `schemaNames`.
 */

import { formChoice } from "../../shared/types.js";
import {
  findComponentInTargetNamespace,
  forEachReferencedComponent,
  localDeclarationName,
  localNameOf,
  expandedNameOf,
  schemaNamesOf,
  topLevelName,
} from "./schemaNames.js";
import { schemaInTargetNamespace } from "../__tests__/constraintTestHelpers.js";
import { schemaWith } from "../../shared/__tests__/schemaTestHelpers.js";

/** The names of a schema with the target namespace `urn:t`, the prefixes `xs` and `t`, and a group `G`. */
const NAMES = schemaNamesOf(schemaInTargetNamespace(`<xs:group name="G"><xs:sequence/></xs:group>`));

describe("expandedNameOf", () => {
  test.each([
    ["a declared prefix", "xs:string", "{http://www.w3.org/2001/XMLSchema}string"],
    ["the prefix of the target namespace", "t:A", "{urn:t}A"],
    ["no prefix, without a default namespace, which is no namespace", "A", "{}A"],
    ["a prefix that is not declared", "x:A", "x:A"],
  ])("should resolve a QName with %s", (_case, qName, expected) => {
    expect(expandedNameOf(qName, NAMES)).toBe(expected);
  });

  test("should resolve a QName without a prefix in the default namespace", () => {
    const names = schemaNamesOf(schemaWith("", { "": "urn:d" }));

    expect(expandedNameOf("A", names)).toBe("{urn:d}A");
  });
});

describe("localDeclarationName", () => {
  test.each([
    ["qualified by its form", formChoice.qualified, undefined, "{urn:t}a"],
    ["qualified by the default of the schema", undefined, formChoice.qualified, "{urn:t}a"],
    ["unqualified by its form, against the default", formChoice.unqualified, formChoice.qualified, "{}a"],
    ["without a form or a default", undefined, undefined, "{}a"],
  ])("should name a declaration %s", (_case, form, formDefault, expected) => {
    expect(localDeclarationName("a", form, formDefault, NAMES)).toBe(expected);
  });
});

describe("topLevelName and localNameOf", () => {
  test("should put a top-level name into the target namespace and take the local name out again", () => {
    expect(topLevelName("A", NAMES)).toBe("{urn:t}A");
    expect(localNameOf("{urn:t}A")).toBe("A");
    expect(localNameOf("x:A")).toBe("x:A");
  });
});

describe("findComponentInTargetNamespace", () => {
  test.each([
    // Without a default namespace, a QName without a prefix is in no namespace, not in the target namespace
    ["no prefix", "G", false],
    ["the prefix of the target namespace", "t:G", true],
    ["another prefix", "xs:G", false],
    ["a name that no group has", "t:H", false],
  ])("should find a group by a QName with %s", (_case, qName, found) => {
    expect(findComponentInTargetNamespace(qName, NAMES.schemaObj.group, NAMES) !== undefined).toBe(found);
  });
});

describe("forEachReferencedComponent", () => {
  test("should visit each component once and skip references to no component", () => {
    const visited: string[] = [];

    forEachReferencedComponent(
      [{ ref: "t:G" }, { ref: "t:G" }, { ref: "t:H" }, {}],
      NAMES.schemaObj.group,
      NAMES,
      new Set(),
      (group) => visited.push(group.name)
    );

    expect(visited).toEqual(["G"]);
  });
});
