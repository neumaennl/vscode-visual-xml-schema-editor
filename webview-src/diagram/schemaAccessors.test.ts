/**
 * Unit tests of `schemaAccessors`.
 */

import {
  getImportedNamespaces,
  getLocalTypeNames,
  getNamespacePrefixes,
  getTargetNamespace,
  hasIncludes,
  getDefaultValue,
  getFixedValue,
  getMaxOccurs,
  getMinOccurs,
  getName,
  getReference,
  isAbstract,
  isNillable,
  isReference,
  isRepeated,
} from "./schemaAccessors";
import { isMixed } from "./typeAccessors";
import { DiagramItem } from "./DiagramItem";
import { DiagramItemType } from "./DiagramTypes";
import { diagramItem, muteDiagramBuilderLog, emptyDiagram } from "../__tests__/diagramTestHelpers";
import { webviewSchemaFromXml, webviewSchemaWith } from "../../shared/__tests__/schemaTestHelpers";
import { DiagramBuilder } from "./DiagramBuilder";
import type { Diagram } from "./Diagram";
import { XSD_NAMESPACE as XS } from "../../shared/builtInTypes";

/**
 * Particles with occurrences. The element in the `all` of the group is a `narrowMaxMin`, which stores
 * its occurrences as strings.
 */
const OCCURRENCES = `<xs:complexType name="T"><xs:sequence maxOccurs="unbounded">
  <xs:element name="plain"/>
  <xs:element name="optional" minOccurs="0" maxOccurs="5"/>
  <xs:element name="removed" minOccurs="0" maxOccurs="0"/>
  <xs:group ref="G" maxOccurs="unbounded"/>
</xs:sequence></xs:complexType>
<xs:group name="G"><xs:all><xs:element name="a" minOccurs="0" maxOccurs="1"/></xs:all></xs:group>`;

/** The ID of the sequence in {@link OCCURRENCES}. */
const SEQUENCE_ID = "/complexType:T/group:sequence[0]";

/**
 * Creates an item with a schema object.
 *
 * @param schemaObject - The schema object
 * @returns The item
 */
function itemWith(schemaObject: DiagramItem["schemaObject"]): DiagramItem {
  return new DiagramItem("/element:a", "a", DiagramItemType.element, schemaObject, emptyDiagram());
}

describe("getName", () => {
  test("should read the name of the schema object", () => {
    expect(getName(itemWith({ name: "a" }))).toBe("a");
  });

  test("should return nothing for a schema object without a name", () => {
    expect(getName(itemWith({ ref: "G" }))).toBeUndefined();
  });
});

describe("getReference and isReference", () => {
  test("should return the ref of a reference and nothing for a declaration", () => {
    expect([getReference(itemWith({ ref: "tns:G" })), isReference(itemWith({ ref: "tns:G" }))]).toEqual([
      "tns:G",
      true,
    ]);
    expect([getReference(itemWith({ name: "a" })), isReference(itemWith({ name: "a" }))]).toEqual([undefined, false]);
  });
});

describe("occurrences", () => {
  muteDiagramBuilderLog();

  test.each([
    ["a named type, which has none", "/complexType:T", 1, 1, false],
    ["a compositor", SEQUENCE_ID, 1, "unbounded", true],
    ["an element without occurrences", `${SEQUENCE_ID}/element:plain[0]`, 1, 1, false],
    ["an optional element that repeats", `${SEQUENCE_ID}/element:optional[1]`, 0, 5, true],
    ["an element with maxOccurs 0", `${SEQUENCE_ID}/element:removed[2]`, 0, 0, false],
    ["a group reference", `${SEQUENCE_ID}/groupRef:G[0]`, 1, "unbounded", true],
    ["an element in an all, with occurrences as strings", "/group:G/group:all[0]/element:a[0]", 0, 1, false],
  ])("should read the occurrences of %s", (_case, id, minOccurs, maxOccurs, repeated) => {
    const item = diagramItem(webviewSchemaWith(OCCURRENCES), id);

    expect([getMinOccurs(item), getMaxOccurs(item), isRepeated(item)]).toEqual([minOccurs, maxOccurs, repeated]);
  });
});

describe("constraints and values of elements and complex types", () => {
  muteDiagramBuilderLog();

  /** Elements and complex types with and without the constraints and values. */
  const CONSTRAINTS = `<xs:element name="full" nillable="true" abstract="true" default="A" fixed="B">
  <xs:complexType mixed="true"/>
</xs:element>
<xs:element name="plain" type="xs:string"/>
<xs:complexType name="Full" abstract="true" mixed="true"/>
<xs:complexType name="Plain"/>`;

  /**
   * Returns what the accessors read from an item of {@link CONSTRAINTS}.
   *
   * @param item - The item
   * @returns Nillable, abstract, mixed, the default and the fixed value
   */
  function readAll(item: DiagramItem): unknown[] {
    return [isNillable(item), isAbstract(item), isMixed(item), getDefaultValue(item), getFixedValue(item)];
  }

  test.each([
    ["an element, with the mixed content of its anonymous complex type", "/element:full", [true, true, true, "A", "B"]],
    ["an element without them", "/element:plain", [false, false, false, undefined, undefined]],
    ["a complex type", "/complexType:Full", [false, true, true, undefined, undefined]],
    ["a complex type without them", "/complexType:Plain", [false, false, false, undefined, undefined]],
  ])("should read them from %s", (_case, id, expected) => {
    expect(readAll(diagramItem(webviewSchemaWith(CONSTRAINTS), id))).toEqual(expected);
  });
});

describe("facts about the schema of a diagram", () => {
  muteDiagramBuilderLog();

  /**
   * Builds the diagram of a schema.
   *
   * @param xml - The schema
   * @returns The diagram
   */
  function diagramOf(xml: string): Diagram {
    return new DiagramBuilder().buildFromSchema(webviewSchemaFromXml(xml));
  }

  test("should read the namespaces, imports, includes and type names of the schema", () => {
    const diagram =
      diagramOf(`<xs:schema xmlns:xs="${XS}" xmlns:tns="urn:t" xmlns:ext="urn:ext" targetNamespace="urn:t">
  <xs:import namespace="urn:ext" schemaLocation="ext.xsd"/>
  <xs:import schemaLocation="none.xsd"/>
  <xs:include schemaLocation="part.xsd"/>
  <xs:simpleType name="Code"><xs:restriction base="xs:string"/></xs:simpleType>
  <xs:complexType name="Person"/>
  <xs:element name="root"/>
</xs:schema>`);

    expect(getTargetNamespace(diagram)).toBe("urn:t");
    expect(getNamespacePrefixes(diagram)).toEqual({ xs: XS, tns: "urn:t", ext: "urn:ext" });
    expect(getImportedNamespaces(diagram)).toEqual(["urn:ext"]);
    expect(hasIncludes(diagram)).toBe(true);
    expect(getLocalTypeNames(diagram)).toEqual(["Code", "Person"]);
  });

  test("should read nothing from a schema without them", () => {
    const diagram = diagramOf(`<xs:schema xmlns:xs="${XS}"/>`);

    expect([
      getTargetNamespace(diagram),
      getImportedNamespaces(diagram),
      hasIncludes(diagram),
      getLocalTypeNames(diagram),
    ]).toEqual(["", [], false, []]);
  });
});
