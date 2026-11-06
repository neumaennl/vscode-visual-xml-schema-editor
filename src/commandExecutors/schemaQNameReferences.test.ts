/**
 * Unit tests for forEachQNameReference(), the walk over every QName of a schema.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../../shared/types.js";
import { readTestSchema, schemaWith } from "../__tests__/schemaTestHelpers.js";
import { forEachQNameReference, QNameReference } from "./schemaQNameReferences.js";

/** The schema with a QName in every place where XML Schema allows one. */
const QNAME_IN_EVERY_PLACE = "qname-in-every-place.xsd";

/** The paths of all schemas in the test resources and the example files. */
const ALL_SCHEMA_FILES = [
  join(import.meta.dirname, "../__tests__/test-resources"),
  join(import.meta.dirname, "../../exampleFiles"),
].flatMap((folder) => readdirSync(folder).filter((name) => name.endsWith(".xsd")).map((name) => join(folder, name)));

/**
 * Returns whether a value looks like a QName: not empty, without whitespace and with at most one colon.
 *
 * @param value - The value
 * @returns `true` if the value looks like a QName
 */
function looksLikeQName(value: string): boolean {
  return value.length > 0 && !/\s/.test(value) && value.split(":").length <= 2;
}

describe("forEachQNameReference", () => {
  test("should visit every QName of the schema with its kind, and nothing in annotations", () => {
    const visited: string[] = [];

    forEachQNameReference(readTestSchema(QNAME_IN_EVERY_PLACE), (reference) => {
      visited.push(`${reference.kind} ${reference.value}`);
    });

    expect(visited.sort()).toEqual([
      "attribute tns:attributeRef",
      "attributeGroup tns:attributeGroupRef",
      "attributeGroup tns:attributeGroupRefInAttributeGroup",
      "element tns:elementRef",
      "element tns:head",
      "group tns:groupRef",
      "group tns:groupRefInGroup",
      "identityConstraint tns:rootKey",
      "type tns:AllElementType",
      "type tns:AttributeGroupAttributeType",
      "type tns:AttributeType",
      "type tns:ElementType",
      "type tns:ExtensionBase",
      "type tns:InlineBase",
      "type tns:ItemType",
      "type tns:MemberA",
      "type tns:MemberB",
      "type tns:NestedElementType",
      "type tns:SimpleContentBase",
      "xpath tns:code",
      "xpath tns:item",
      "xpath tns:other",
    ]);
  });

  test("should replace a QName in place", () => {
    const schemaObj = readTestSchema(QNAME_IN_EVERY_PLACE);

    forEachQNameReference(schemaObj, (reference) => {
      if (reference.value === "tns:groupRefInGroup") reference.replace("tns:Renamed");
    });

    const inGroup = schemaObj.group?.[0]?.sequence?.element?.[0];
    expect(inGroup?.complexType?.sequence?.group?.[0]?.ref).toBe("tns:Renamed");
  });

  test("should replace one member of a memberTypes list and keep the others", () => {
    const schemaObj = readTestSchema(QNAME_IN_EVERY_PLACE);
    const members: QNameReference[] = [];

    forEachQNameReference(schemaObj, (reference) => {
      if (reference.value.startsWith("tns:Member")) members.push(reference);
    });
    members[1].replace("tns:Other");

    const union = schemaObj.simpleType?.find((st) => st.name === "Union")?.union;
    expect(union?.memberTypes).toBe("tns:MemberA tns:Other");
  });

  test("should replace one name of an XPath expression and keep the rest", () => {
    const schemaObj = readTestSchema(QNAME_IN_EVERY_PLACE);

    forEachQNameReference(schemaObj, (reference) => {
      if (reference.value === "tns:other") reference.replace("neu:other");
    });

    const keyref = schemaObj.element?.[0]?.keyref?.[0];
    expect(keyref?.selector.xpath).toBe(".//tns:item | child::neu:other/*");
  });

  test.each([
    { xpath: ".//tns:item | child::tns:*", names: ["tns:item", "tns:*"] },
    { xpath: "@tns:code", names: ["tns:code"] },
    { xpath: "ns1:order/ns2:line", names: ["ns1:order", "ns2:line"] },
    { xpath: "a.b-c:d_e", names: ["a.b-c:d_e"] },
    { xpath: "ü:straße", names: ["ü:straße"] },
    { xpath: "child::item/attribute::id", names: [] },
    { xpath: "./item | *", names: [] },
  ])("should visit the prefixed names $names in the XPath $xpath", ({ xpath, names }) => {
    const schemaObj = schemaWith(
      `<xs:element name="root"><xs:key name="k"><xs:selector xpath="${xpath}"/><xs:field xpath="."/></xs:key></xs:element>`
    );
    const visited: string[] = [];

    forEachQNameReference(schemaObj, (reference) => {
      if (reference.kind === "xpath") visited.push(reference.value);
    });

    expect(visited).toEqual(names);
  });

  // Guards the assumptions about the objects that xmlbind-ts creates (see isNode()): if the walk
  // reported something that is not a reference, its value would rarely look like a QName
  test.each(ALL_SCHEMA_FILES)("should only visit values that look like QNames in %s", (file) => {
    const schemaObj = unmarshal(schema, readFileSync(file, "utf8"));
    const notQNames: string[] = [];

    forEachQNameReference(schemaObj, (reference) => {
      if (reference.kind !== "xpath" && !looksLikeQName(reference.value)) notQNames.push(reference.value);
    });

    expect(notQNames).toEqual([]);
  });
});
