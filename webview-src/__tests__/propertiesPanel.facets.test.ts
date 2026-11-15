/**
 * Integration tests of the properties panel for the Facets tab: they display items in a whole `PropertiesPanel`.
 * The tab and its chips are tested in `propertiesPanelFacets.test.ts` and `propertiesPanelFacetLists.test.ts`;
 * these tests check for which nodes the panel offers the tab and that it passes its commands on.
 */

import { findButton, displayItem, editInput } from "./propertiesPanelTestHelpers";
import { diagramItem, muteDiagramBuilderLog } from "./diagramTestHelpers";
import { schemaWith } from "../../shared/__tests__/schemaTestHelpers";

/** Restrictions, a list, a union and elements with a named and an inline simple type. */
const SIMPLE_TYPES = `<xs:simpleType name="Code"><xs:restriction base="xs:string">
  <xs:pattern value="[A-Z]{3}"/><xs:pattern value="[0-9]{3}"/><xs:maxLength value="8"/>
</xs:restriction></xs:simpleType>
<xs:simpleType name="Codes"><xs:list itemType="xs:token"/></xs:simpleType>
<xs:simpleType name="Mixed"><xs:union memberTypes="xs:int xs:token"/></xs:simpleType>
<xs:element name="plain" type="xs:string"/>
<xs:element name="size"><xs:simpleType><xs:restriction base="xs:int"><xs:minInclusive value="1"/></xs:restriction></xs:simpleType></xs:element>`;

describe("PropertiesPanel: the Facets tab", () => {
  muteDiagramBuilderLog();

  test.each([
    { id: "/simpleType:Code", shown: true },
    { id: "/element:size", shown: true },
    { id: "/simpleType:Codes", shown: false },
    { id: "/simpleType:Mixed", shown: false },
    { id: "/element:plain", shown: false },
  ])("should offer the Facets tab for $id: $shown", ({ id, shown }) => {
    const container = document.createElement("div");
    displayItem(container, diagramItem(schemaWith(SIMPLE_TYPES), id));

    expect(findButton(container, "Facets") !== undefined).toBe(shown);
  });

  test("should send changes of the facets with all patterns", () => {
    const container = document.createElement("div");
    const { dispatch } = displayItem(container, diagramItem(schemaWith(SIMPLE_TYPES), "/simpleType:Code"), "Facets");

    editInput(container, "Max Length", "3");

    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      type: "modifySimpleType",
      payload: { typeId: "/simpleType:Code", restrictions: { pattern: ["[A-Z]{3}", "[0-9]{3}"], maxLength: 3 } },
    });
  });
});
