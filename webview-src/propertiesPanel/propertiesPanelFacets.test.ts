/**
 * Unit tests for the Facets tab of the properties panel, which edits the facets of a restriction.
 */

import type { Mock } from "vitest";
import { renderFacetsTab } from "./propertiesPanelFacets";
import { addPropertyToContainer } from "./propertiesPanelDom";
import type { SchemaCommand } from "../../shared/types";
import type { DiagramItem } from "../diagram";
import { editInput, getChipValuesByLabel, getInputByLabel } from "../__tests__/propertiesPanelTestHelpers";
import { diagramItem, muteDiagramBuilderLog } from "../__tests__/diagramTestHelpers";
import { schemaWith } from "../../shared/__tests__/schemaTestHelpers";

/**
 * Restrictions with every facet that the tab edits, one with an inline base type, one with only a
 * pattern, one without facets, an element with an inline restriction and one with a named type.
 */
const RESTRICTIONS = `<xs:simpleType name="Code"><xs:restriction base="xs:string">
  <xs:enumeration value="A"/><xs:enumeration value="B"/><xs:pattern value="[A-Z]"/>
  <xs:minLength value="1"/><xs:maxLength value="5"/><xs:whiteSpace value="collapse"/>
</xs:restriction></xs:simpleType>
<xs:simpleType name="Fixed"><xs:restriction base="xs:string"><xs:length value="3"/></xs:restriction></xs:simpleType>
<xs:simpleType name="Range"><xs:restriction base="xs:decimal">
  <xs:minInclusive value="1"/><xs:maxExclusive value="10"/><xs:totalDigits value="4"/><xs:fractionDigits value="2"/>
</xs:restriction></xs:simpleType>
<xs:simpleType name="OpenRange"><xs:restriction base="xs:int"><xs:minExclusive value="0"/><xs:maxInclusive value="9"/></xs:restriction></xs:simpleType>
<xs:simpleType name="Short"><xs:restriction>
  <xs:simpleType><xs:restriction base="xs:string"/></xs:simpleType><xs:maxLength value="8"/>
</xs:restriction></xs:simpleType>
<xs:simpleType name="Letters"><xs:restriction base="xs:string"><xs:pattern value="[A-Z]+"/></xs:restriction></xs:simpleType>
<xs:simpleType name="Bare"><xs:restriction base="xs:string"/></xs:simpleType>
<xs:element name="size"><xs:simpleType><xs:restriction base="xs:int"><xs:minInclusive value="1"/></xs:restriction></xs:simpleType></xs:element>
<xs:element name="plain" type="xs:string"/>`;

/** The Facets tab of a node, the node, and the mock that receives its commands. */
interface FacetsTab {
  tab: HTMLElement;
  node: DiagramItem;
  dispatch: Mock<(command: SchemaCommand) => void>;
}

/**
 * Renders the Facets tab of the diagram item with the given ID in the diagram of {@link RESTRICTIONS}.
 *
 * @param id - The ID of the item
 * @returns The tab, the item and the mock
 */
function renderFacets(id: string): FacetsTab {
  const node = diagramItem(schemaWith(RESTRICTIONS), id);
  const dispatch = vi.fn<(command: SchemaCommand) => void>();
  return { tab: renderFacetsTab(node, dispatch, addPropertyToContainer), node, dispatch };
}

/**
 * Returns the remove button of a facet and fails the test if there is none.
 *
 * @param tab - The Facets tab
 * @param label - The label of the facet
 * @returns The button
 */
function removeButtonOf(tab: HTMLElement, label: string): HTMLButtonElement {
  const button = tab.querySelector(`button[aria-label='Remove ${label} facet']`);
  expect(button).toBeInstanceOf(HTMLButtonElement);
  return button as HTMLButtonElement;
}

describe("renderFacetsTab", () => {
  muteDiagramBuilderLog();

  describe("showing the facets", () => {
    test("should show the enumeration values and patterns as chips", () => {
      const { tab } = renderFacets("/simpleType:Code");

      expect(getChipValuesByLabel(tab, "Enumeration")).toEqual(["A", "B"]);
      expect(getChipValuesByLabel(tab, "Pattern")).toEqual(["[A-Z]"]);
    });

    test.each([
      { id: "/simpleType:Code", fields: { "Min Length": "1", "Max Length": "5", "White Space": "collapse" } },
      { id: "/simpleType:Fixed", fields: { Length: "3" } },
      { id: "/simpleType:Range", fields: { "Min Inclusive": "1", "Max Exclusive": "10", "Total Digits": "4", "Fraction Digits": "2" } },
      { id: "/simpleType:OpenRange", fields: { "Max Inclusive": "9", "Min Exclusive": "0" } },
    ])("should show a field for each other facet of $id, and only for those, in a fixed order",({ id, fields }) => {
      const { tab } = renderFacets(id);

      const inputs = Array.from(tab.querySelectorAll<HTMLInputElement>(".property-facet input"));
      expect(inputs.map((input) => input.value)).toEqual(Object.values(fields));
      for (const [label, value] of Object.entries(fields)) {
        expect(getInputByLabel(tab, label).value).toBe(value);
      }
    });

    test("should reject a node without a simple type, for which the panel offers no Facets tab", () => {
      expect(() => renderFacets("/element:plain")).toThrow("The Facets tab is only shown for simple types, not for /element:plain");
    });

    test("should point to the palette for a restriction without facets", () => {
      const { tab } = renderFacets("/simpleType:Bare");

      expect(tab.textContent).toContain("This type has no facets yet.");
      expect(tab.querySelector("input")).toBeNull();
    });
  });

  describe("editing the facets", () => {
    test.each([
      { id: "/simpleType:Code", label: "Max Length", value: "3", facets: { maxLength: 3 } },
      { id: "/simpleType:Range", label: "Min Inclusive", value: " 2 ", facets: { minInclusive: "2" } },
      { id: "/simpleType:Code", label: "Max Length", value: " ", facets: { maxLength: undefined } },
      { id: "/simpleType:Range", label: "Min Inclusive", value: "", facets: { minInclusive: undefined } },
      { id: "/simpleType:Code", label: "White Space", value: "preserve", facets: { whiteSpace: "preserve" } },
      { id: "/simpleType:Code", label: "White Space", value: "", facets: { whiteSpace: undefined } },
    ])("should set $label of $id to '$value' and keep the other facets", ({ id, label, value, facets }) => {
      const { tab, node, dispatch } = renderFacets(id);
      const expected = { ...node.restrictions, ...facets };

      editInput(tab, label, value);

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "modifySimpleType",
        payload: { typeId: id, restrictions: expected },
      });
      expect(node.restrictions).toEqual(expected);
    });

    test("should ignore a value of the white space facet that XML Schema does not allow", () => {
      const { tab, node, dispatch } = renderFacets("/simpleType:Code");

      editInput(tab, "White Space", "trim");

      expect(dispatch).not.toHaveBeenCalled();
      expect(node.restrictions?.whiteSpace).toBe("collapse");
    });

    test("should keep the inline base type, which the command does not name", () => {
      const { tab, dispatch } = renderFacets("/simpleType:Short");

      editInput(tab, "Max Length", "4");

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:Short", restrictions: { maxLength: 4 } },
      });
    });

    test("should change the inline simple type of an element", () => {
      const { tab, dispatch } = renderFacets("/element:size");

      editInput(tab, "Min Inclusive", "2");

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "modifySimpleType",
        payload: { typeId: "/element:size/anonymousSimpleType[0]", restrictions: { minInclusive: "2" } },
      });
    });

    test("should send a changed list of enumeration values with the other facets", () => {
      const { tab, node, dispatch } = renderFacets("/simpleType:Code");

      (tab.querySelector<HTMLButtonElement>("button[aria-label='Remove A']")!).click();

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:Code", restrictions: { ...node.restrictions, enumeration: ["B"] } },
      });
    });
  });

  describe("removing facets", () => {
    test.each([
      { label: "Enumeration", facets: { enumeration: undefined } },
      { label: "Pattern", facets: { pattern: undefined } },
      { label: "Min Length", facets: { minLength: undefined } },
      { label: "White Space", facets: { whiteSpace: undefined } },
    ])("should remove the $label facet and keep the others", ({ label, facets }) => {
      const { tab, node, dispatch } = renderFacets("/simpleType:Code");
      const expected = { ...node.restrictions, ...facets };

      removeButtonOf(tab, label).click();

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:Code", restrictions: expected },
      });
    });

    test.each([
      { id: "/simpleType:Fixed", label: "Length" },
      { id: "/simpleType:Letters", label: "Pattern" },
    ])("should not let the only facet of $id be removed", ({ id, label }) => {
      expect(removeButtonOf(renderFacets(id).tab, label).disabled).toBe(true);
    });
  });
});
