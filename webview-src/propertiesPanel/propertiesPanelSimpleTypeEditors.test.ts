/**
 * Unit tests for the editors of list and union simple types of the properties panel.
 * The tests select items of diagrams built from real schemas.
 */

import type { Mock } from "vitest";
import type { SchemaCommand } from "../../shared/types";
import { PropertiesPanel } from "./propertiesPanel";
import type { DiagramItem } from "../diagram/DiagramItem";
import { diagramItem } from "../__tests__/diagramTestHelpers";
import { getInputByLabel, getSelectByLabel, getSelectsByLabel, hasLabel } from "../__tests__/propertiesPanelTestHelpers";
import { schemaWith } from "../../shared/__tests__/schemaTestHelpers";

/** Named and anonymous list, union and restriction types. */
const SIMPLE_TYPES = schemaWith(`<xs:simpleType name="Tokens"><xs:list itemType="xs:token"/></xs:simpleType>
<xs:simpleType name="Number"><xs:union memberTypes="xs:int xs:decimal"/></xs:simpleType>
<xs:simpleType name="Code"><xs:restriction base="xs:string"/></xs:simpleType>
<xs:simpleType name="InlineMembers"><xs:union><xs:simpleType><xs:restriction base="xs:int"/></xs:simpleType></xs:union></xs:simpleType>
<xs:element name="tags"><xs:simpleType><xs:list itemType="xs:token"/></xs:simpleType></xs:element>
<xs:element name="amount"><xs:simpleType><xs:union memberTypes="xs:int xs:decimal"/></xs:simpleType></xs:element>`);

/**
 * Returns the remove buttons of the member types of a union.
 *
 * @param container - The container of the panel
 * @returns The buttons
 */
function removeMemberButtons(container: HTMLElement): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll<HTMLButtonElement>("button[title='Remove member type']"));
}

describe("PropertiesPanel: the editors of list and union simple types", () => {
  let container: HTMLDivElement;
  let dispatch: Mock<(command: SchemaCommand) => void>;

  /**
   * Shows the item with the given ID of {@link SIMPLE_TYPES} in a new panel.
   *
   * @param id - The ID of the item
   * @returns The item
   */
  function display(id: string): DiagramItem {
    const item = diagramItem(SIMPLE_TYPES, id);
    new PropertiesPanel(container, dispatch).display(item);
    return item;
  }

  beforeEach(() => {
    // The diagram builder logs every schema it builds
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    container = document.createElement("div");
    dispatch = vi.fn<(command: SchemaCommand) => void>();
  });

  test("edits the item type of a list", () => {
    display("/simpleType:Tokens");

    const input = getInputByLabel(container, "Item Type");
    input.value = "xs:string";
    input.dispatchEvent(new Event("blur"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifySimpleType",
      payload: { typeId: "/simpleType:Tokens", listItemType: "xs:string" },
    });
  });

  test("sends nothing when the item type of a list is left unchanged", () => {
    display("/simpleType:Tokens");

    getInputByLabel(container, "Item Type").dispatchEvent(new Event("blur"));

    expect(dispatch).not.toHaveBeenCalled();
  });

  test("shows the item type of a list and no base type", () => {
    display("/simpleType:Tokens");

    expect(getInputByLabel(container, "Item Type").value).toBe("xs:token");
    expect(hasLabel(container, "Base Type")).toBe(false);
  });

  test.each([
    { id: "/simpleType:Code", kind: "list", payload: { listItemType: "xs:string" } },
    { id: "/simpleType:Tokens", kind: "union", payload: { unionMemberTypes: ["xs:token"] } },
    { id: "/simpleType:Tokens", kind: "restriction", payload: { baseType: "xs:token" } },
  ])("switches $id to a $kind derived from its current body", ({ id, kind, payload }) => {
    display(id);

    const kindSelect = getSelectByLabel(container, "Kind");
    kindSelect.value = kind;
    kindSelect.dispatchEvent(new Event("change"));

    expect(dispatch).toHaveBeenCalledWith({ type: "modifySimpleType", payload: { typeId: id, ...payload } });
  });

  test("keeps the kind of a union of inline types, which has no type to derive a list from", () => {
    display("/simpleType:InlineMembers");

    const kindSelect = getSelectByLabel(container, "Kind");
    kindSelect.value = "list";
    kindSelect.dispatchEvent(new Event("change"));

    expect(dispatch).not.toHaveBeenCalled();
    expect(kindSelect.value).toBe("union");
  });

  test("edits a member type of a union", () => {
    display("/simpleType:Number");

    const selects = getSelectsByLabel(container, "Member Types");
    selects[1].value = "xs:double";
    selects[1].dispatchEvent(new Event("change"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifySimpleType",
      payload: { typeId: "/simpleType:Number", unionMemberTypes: ["xs:int", "xs:double"] },
    });
  });

  test("removes member types of a union, but sends no union without members", () => {
    display("/simpleType:Number");

    removeMemberButtons(container)[0].click();
    removeMemberButtons(container)[0].click();

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({
      type: "modifySimpleType",
      payload: { typeId: "/simpleType:Number", unionMemberTypes: ["xs:decimal"] },
    });
    expect(getSelectsByLabel(container, "Member Types").map((select) => select.value)).toEqual([""]);
  });

  test("adds an empty member type row without sending a command", () => {
    display("/simpleType:Number");

    Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "Add member type")
      ?.click();

    expect(getSelectsByLabel(container, "Member Types")).toHaveLength(3);
    expect(dispatch).not.toHaveBeenCalled();
  });

  test("edits the anonymous list type of an element", () => {
    display("/element:tags");

    const input = getInputByLabel(container, "Item Type");
    input.value = "xs:string";
    input.dispatchEvent(new Event("blur"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifySimpleType",
      payload: { typeId: "/element:tags/anonymousSimpleType[0]", listItemType: "xs:string" },
    });
  });

  test.each([
    { id: "/element:tags", current: "xs:token" },
    { id: "/element:amount", current: "xs:int" },
  ])("replaces the anonymous type of $id with a named type", ({ id, current }) => {
    display(id);

    const input = getInputByLabel(container, "Replacement Type");
    expect(input.value).toBe(current);
    input.value = "xs:string";
    input.dispatchEvent(new Event("blur"));

    expect(dispatch).toHaveBeenCalledWith({ type: "modifyElement", payload: { elementId: id, elementType: "xs:string" } });
  });
});
