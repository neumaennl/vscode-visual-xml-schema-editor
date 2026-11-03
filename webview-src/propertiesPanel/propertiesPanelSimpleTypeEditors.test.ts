/**
 * Unit tests for the editors of list and union simple types of the properties panel.
 */

import { PropertiesPanel } from "./propertiesPanel";
import { DiagramItem } from "../diagram/DiagramItem";
import { Diagram } from "../diagram/Diagram";
import { DiagramItemType } from "../diagram/DiagramTypes";
import { getInputByLabel, getSelectByLabel, getSelectsByLabel, hasLabel } from "../__tests__/propertiesPanelTestHelpers";

describe("PropertiesPanel: the editors of list and union simple types", () => {
  let container: HTMLDivElement;
  let panel: PropertiesPanel;
  let diagram: Diagram;

  beforeEach(() => {
    container = document.createElement("div");
    panel = new PropertiesPanel(container);
    diagram = new Diagram();
  });

  test("edits simpleType list item types", () => {
    expect.hasAssertions();
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
    const item = new DiagramItem("/simpleType:TokenListType", "TokenListType", DiagramItemType.type, diagram);
    item.type = "simpleType (list of xs:token)";
    item.simpleTypeDerivationKind = "list";
    item.simpleTypeListItemType = "xs:token";

    panel.display(item);

    const input = getInputByLabel(container, "Item Type");
    input.value = "xs:string";
    input.dispatchEvent(new Event("blur"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifySimpleType",
      payload: {
        typeId: "/simpleType:TokenListType",
        listItemType: "xs:string",
      },
    });
  });

  test("lets users switch a simpleType between restriction and list kinds", () => {
    expect.hasAssertions();
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
    const item = new DiagramItem("/simpleType:TokenType", "TokenType", DiagramItemType.type, diagram);
    item.type = "simpleType (restricts xs:string)";
    item.simpleTypeDerivationKind = "restriction";

    panel.display(item);

    const kindSelect = getSelectByLabel(container, "Kind");
    kindSelect.value = "list";
    kindSelect.dispatchEvent(new Event("change"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifySimpleType",
      payload: {
        typeId: "/simpleType:TokenType",
        listItemType: "xs:string",
      },
    });
  });

  test("uses structured simpleType fields instead of parsing display text for list editing", () => {
    expect.hasAssertions();
    const item = new DiagramItem("/simpleType:TokenListType", "TokenListType", DiagramItemType.type, diagram);
    item.type = "simpleType";
    item.simpleTypeListItemType = "xs:token";

    panel.display(item);

    expect(hasLabel(container, "Item Type")).toBe(true);
    expect(hasLabel(container, "Base Type")).toBe(false);
  });

  test("edits simpleType union member types", () => {
    expect.hasAssertions();
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
    const item = new DiagramItem("/simpleType:TextOrNumberType", "TextOrNumberType", DiagramItemType.type, diagram);
    item.type = "simpleType (union of xs:string, xs:integer)";
    item.simpleTypeDerivationKind = "union";
    item.simpleTypeUnionMemberTypes = ["xs:string", "xs:integer"];

    panel.display(item);

    const selects = getSelectsByLabel(container, "Member Types");
    selects[1].value = "xs:decimal";
    selects[1].dispatchEvent(new Event("change"));

    const removeButtons = Array.from(
      container.querySelectorAll("button[title='Remove member type']")
    );
    expect(removeButtons.length).toBe(2);
    expect(removeButtons[0].classList.contains("property-docs-action-icon-only")).toBe(true);
    const addButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Add member type"
    );
    expect(addButton).toBeTruthy();

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifySimpleType",
      payload: {
        typeId: "/simpleType:TextOrNumberType",
        unionMemberTypes: ["xs:string", "xs:decimal"],
      },
    });
  });
});
