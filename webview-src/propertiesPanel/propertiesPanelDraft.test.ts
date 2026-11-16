/**
 * Unit tests for the draft copy of a node that the properties panel edits.
 */

import { createDraftNode, hasEditableFacetValues, type RestrictionSnapshot } from "./propertiesPanelDraft";
import { DiagramItem } from "../diagram";
import { diagramItem, muteDiagramBuilderLog } from "../__tests__/diagramTestHelpers";
import { schemaWith } from "../../shared/__tests__/schemaTestHelpers";

/** An element with documentation, an attribute and a child, restrictions with and without lists of facets, and a union. */
const DRAFT_NODES = `<xs:element name="note">
  <xs:annotation><xs:documentation xml:lang="en">A note</xs:documentation></xs:annotation>
  <xs:complexType><xs:sequence><xs:element name="b" type="xs:string"/></xs:sequence>
  <xs:attribute name="lang" type="xs:language"/></xs:complexType>
</xs:element>
<xs:simpleType name="Word"><xs:restriction base="xs:string">
  <xs:enumeration value="a"/><xs:pattern value="[a-z]+"/><xs:maxLength value="5"/>
</xs:restriction></xs:simpleType>
<xs:simpleType name="Short"><xs:restriction base="xs:string"><xs:maxLength value="3"/></xs:restriction></xs:simpleType>
<xs:simpleType name="Mixed"><xs:union memberTypes="xs:int xs:token"/></xs:simpleType>`;

describe("hasEditableFacetValues", () => {
  test.each<{ restrictions: RestrictionSnapshot; expected: boolean }>([
    { restrictions: {}, expected: false },
    { restrictions: { enumeration: [], pattern: [] }, expected: false },
    { restrictions: { minLength: undefined }, expected: false },
    { restrictions: { maxLength: 5 }, expected: true },
    { restrictions: { pattern: ["[a-z]+"] }, expected: true },
  ])("should return $expected for $restrictions", ({ restrictions, expected }) => {
    expect(hasEditableFacetValues(restrictions)).toBe(expected);
  });
});

describe("createDraftNode", () => {
  muteDiagramBuilderLog();

  test("should copy all values of the node into a new diagram item of the same diagram", () => {
    const node = diagramItem(schemaWith(DRAFT_NODES), "/element:note");

    const draft = createDraftNode(node);

    expect(draft).toBeInstanceOf(DiagramItem);
    expect(draft).not.toBe(node);
    expect(draft).toEqual(node);
    expect(draft.diagram).toBe(node.diagram);
  });

  test("should copy the children, attributes, documentation and boxes, so that changing them leaves the node unchanged", () => {
    const node = diagramItem(schemaWith(DRAFT_NODES), "/element:note");
    const original = structuredClone({
      attributes: node.attributes,
      annotations: node.documentationAnnotations,
      location: node.location,
      boundingBox: node.boundingBox,
    });
    const childCount = node.childElements.length;

    const draft = createDraftNode(node);
    draft.childElements.pop();
    draft.attributes[0]!.name = "changed";
    draft.documentationAnnotations[0]!.documentationEntries[0]!.content = "changed";
    draft.location.x += 10;
    draft.boundingBox.width += 10;

    expect(node.childElements).toHaveLength(childCount);
    expect(node.attributes).toEqual(original.attributes);
    expect(node.documentationAnnotations).toEqual(original.annotations);
    expect(node.location).toEqual(original.location);
    expect(node.boundingBox).toEqual(original.boundingBox);
  });

  test("should copy the facets, so that changing them leaves the node unchanged", () => {
    const node = diagramItem(schemaWith(DRAFT_NODES), "/simpleType:Word");

    const draft = createDraftNode(node);
    draft.restrictions?.enumeration?.push("b");
    draft.restrictions?.pattern?.push("[0-9]+");
    if (draft.restrictions) {
      draft.restrictions.maxLength = 9;
    }

    expect(node.restrictions).toEqual({ enumeration: ["a"], pattern: ["[a-z]+"], maxLength: 5 });
  });

  test("should copy facets without enumeration values and patterns", () => {
    const node = diagramItem(schemaWith(DRAFT_NODES), "/simpleType:Short");

    const draft = createDraftNode(node);

    expect(draft.restrictions).toEqual({ maxLength: 3 });
    expect(draft.restrictions).not.toBe(node.restrictions);
  });

  test("should copy the member types of a union", () => {
    const node = diagramItem(schemaWith(DRAFT_NODES), "/simpleType:Mixed");

    createDraftNode(node).simpleTypeUnionMemberTypes?.push("xs:date");

    expect(node.simpleTypeUnionMemberTypes).toEqual(["xs:int", "xs:token"]);
  });
});
