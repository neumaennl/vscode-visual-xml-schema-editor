/**
 * Unit tests of `propertiesPanelTargets`.
 */

import { SCHEMA_ROOT_ID } from "../../shared/idStrategy";
import { Diagram, DiagramItem } from "../diagram";
import { DiagramItemType } from "../diagram/DiagramTypes";
import type { DiagramSchemaObject } from "../diagram/schemaAccessors";
import { resolveComplexTypeId, resolveDocumentationTargetId, resolveSimpleTypeId } from "./propertiesPanelTargets";
import { webviewSchemaWith } from "../../shared/__tests__/schemaTestHelpers";
import { diagramItem, muteDiagramBuilderLog } from "../__tests__/diagramTestHelpers";

/** A schema with each kind of component whose type or documentation the properties panel edits. */
const SCHEMA = webviewSchemaWith(`<xs:simpleType name="S"><xs:restriction base="xs:string"/></xs:simpleType>
<xs:complexType name="T"><xs:sequence><xs:group ref="G"/></xs:sequence></xs:complexType>
<xs:group name="G"><xs:sequence/></xs:group>
<xs:element name="plain"/>
<xs:element name="simple"><xs:simpleType><xs:restriction base="xs:string"/></xs:simpleType></xs:element>
<xs:element name="complex"><xs:complexType/></xs:element>
<xs:attribute name="a" type="xs:string"/>`);

/** The anonymous types and the attribute of {@link SCHEMA}, for which the diagram has no items. */
const HIDDEN_SCHEMA_OBJECTS: Record<string, DiagramSchemaObject | undefined> = {
  "/element:simple/anonymousSimpleType[0]": SCHEMA.element?.[1]?.simpleType,
  "/element:complex/anonymousComplexType[0]": SCHEMA.element?.[2]?.complexType,
  "/attribute:a": SCHEMA.attribute?.[0],
};

/**
 * Returns the item with the given ID in the diagram of {@link SCHEMA}, or creates it for a schema object
 * that the diagram does not show.
 *
 * @param id - The ID of the item
 * @returns The item
 */
function item(id: string): DiagramItem {
  if (!(id in HIDDEN_SCHEMA_OBJECTS)) {
    return diagramItem(SCHEMA, id);
  }
  const schemaObject = HIDDEN_SCHEMA_OBJECTS[id];
  if (!schemaObject) {
    return expect.fail(`No schema object for ${id}`);
  }
  return new DiagramItem(id, "name", DiagramItemType.type, schemaObject, new Diagram(SCHEMA));
}

describe("propertiesPanelTargets", () => {
  muteDiagramBuilderLog();

  describe("resolveSimpleTypeId", () => {
    test.each([
      ["a named simple type", "/simpleType:S", "/simpleType:S"],
      ["an anonymous simple type", "/element:simple/anonymousSimpleType[0]", "/element:simple/anonymousSimpleType[0]"],
      ["an element with an anonymous simple type", "/element:simple", "/element:simple/anonymousSimpleType[0]"],
      ["an element without one", "/element:plain", null],
      ["a complex type", "/complexType:T", null],
    ])("should resolve %s", (_case, id, expected) => {
      expect(resolveSimpleTypeId(item(id))).toBe(expected);
    });
  });

  describe("resolveComplexTypeId", () => {
    test.each([
      ["a named complex type", "/complexType:T", "/complexType:T"],
      [
        "an anonymous complex type",
        "/element:complex/anonymousComplexType[0]",
        "/element:complex/anonymousComplexType[0]",
      ],
      ["an element with an anonymous complex type", "/element:complex", "/element:complex/anonymousComplexType[0]"],
      ["an element without one", "/element:simple", null],
      ["a simple type", "/simpleType:S", null],
    ])("should resolve %s", (_case, id, expected) => {
      expect(resolveComplexTypeId(item(id))).toBe(expected);
    });
  });

  describe("resolveDocumentationTargetId", () => {
    test.each([
      ["the schema", SCHEMA_ROOT_ID, SCHEMA_ROOT_ID],
      ["an element with an anonymous complex type", "/element:complex", "/element:complex/anonymousComplexType[0]"],
      ["an element with an anonymous simple type", "/element:simple", "/element:simple/anonymousSimpleType[0]"],
      ["an element without an anonymous type", "/element:plain", "/element:plain"],
      ["a simple type", "/simpleType:S", "/simpleType:S"],
      ["a complex type", "/complexType:T", "/complexType:T"],
      ["a group", "/group:G", "/group:G"],
      ["a group reference", "/complexType:T/sequence[0]/groupRef:G[0]", "/complexType:T/sequence[0]/groupRef:G[0]"],
      ["an attribute", "/attribute:a", null],
    ])("should target %s", (_case, id, expected) => {
      expect(resolveDocumentationTargetId(item(id))).toBe(expected);
    });
  });
});
