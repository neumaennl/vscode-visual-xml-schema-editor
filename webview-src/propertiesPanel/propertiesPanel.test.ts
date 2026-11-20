/**
 * Unit tests for the `PropertiesPanel` class: the header, the General tab and the general behavior of the panel.
 */

import { DiagramItem } from "../diagram/DiagramItem";
import { DiagramItemType } from "../diagram/DiagramTypes";
import { SCHEMA_ROOT_ID } from "../../shared/idStrategy";
import {
  findButton,
  getInputByLabel,
  hasLabel,
  createPanel,
  editInput,
  displayItem,
} from "../__tests__/propertiesPanelTestHelpers";

describe("PropertiesPanel", () => {
  let { container, panel, diagram } = createPanel();

  beforeEach(() => {
    ({ container, panel, diagram } = createPanel());
  });

  test("should render tabs and general values for selected node", () => {
    const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);
    item.type = "xs:string";

    panel.display(item);

    expect(container.textContent).toContain("General");
    expect(container.textContent).toContain("Docs");
    expect(container.textContent).toContain("XML");
    expect(container.textContent).toContain("IDENTITY");
    expect(getInputByLabel(container, "Name").value).toBe("TestItem");
    expect(getInputByLabel(container, "Type").value).toBe("xs:string");
  });

  test("should render a node-type header above the tab bar", () => {
    const item = new DiagramItem("/element:person", "person", DiagramItemType.element, diagram);

    panel.display(item);

    const header = container.firstElementChild as HTMLElement;
    expect(header.classList.contains("properties-panel-header")).toBe(true);
    expect(header.textContent).toContain("Element");
    expect(header.nextElementSibling?.classList.contains("property-tabs")).toBe(true);
  });

  test("should dispatch removeElement when the header delete button is clicked", () => {
    const { dispatch } = displayItem(
      container,
      new DiagramItem("/element:person", "person", DiagramItemType.element, diagram)
    );

    const deleteButton = container.querySelector<HTMLButtonElement>("button[title='Delete node']")!;
    expect(deleteButton.classList.contains("property-docs-action-icon-only")).toBe(true);
    deleteButton.click();

    expect(dispatch).toHaveBeenCalledWith({
      type: "removeElement",
      payload: { elementId: "/element:person" },
    });
  });

  test("should dispatch removeGroup when deleting a compositor group", () => {
    const { dispatch } = displayItem(
      container,
      new DiagramItem("/complexType:PersonType/group:sequence[0]", "sequence", DiagramItemType.group, diagram)
    );

    const deleteButton = container.querySelector<HTMLButtonElement>("button[title='Delete node']")!;
    deleteButton.click();

    expect(dispatch).toHaveBeenCalledWith({
      type: "removeGroup",
      payload: { groupId: "/complexType:PersonType/group:sequence[0]" },
    });
  });

  test("should not render a header delete button for schema nodes", () => {
    const schemaRoot = new DiagramItem(SCHEMA_ROOT_ID, "schema", DiagramItemType.group, diagram);

    panel.display(schemaRoot);

    expect(container.querySelector("button[title='Delete node']")).toBeNull();
  });

  test("should render attributes safely without innerHTML interpolation", () => {
    const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);
    item.attributes = [{ name: "<unsafe>", type: "string", use: "required" }];

    panel.display(item);

    expect(container.textContent).toContain("ATTRIBUTES");
    expect(container.textContent).toContain("<unsafe>");
    expect(container.innerHTML).not.toContain("<strong><unsafe></strong>");
  });

  test.each([
    ["schema", SCHEMA_ROOT_ID, DiagramItemType.group],
    ["element", "/element:person", DiagramItemType.element],
    ["complex type", "/complexType:PersonType", DiagramItemType.type],
  ])("should render an Attributes section for a %s with attributes", (_, id, itemType) => {
    const item = new DiagramItem(id, "TestItem", itemType, diagram);
    item.attributes = [{ name: "status", type: "xs:string" }];

    panel.display(item);

    expect(container.textContent).toContain("ATTRIBUTES");
    expect(container.textContent).toContain("status");
  });

  test("should not render the child count", () => {
    const item = new DiagramItem("/element:person", "person", DiagramItemType.element, diagram);
    item.childElements = [new DiagramItem("/element:person/element:name", "name", DiagramItemType.element, diagram)];

    panel.display(item);

    expect(hasLabel(container, "Children")).toBe(false);
  });

  test.each([
    [
      "dispatch modifyElement when the name is changed",
      "customer",
      [[{ type: "modifyElement", payload: { elementId: "/element:person", elementName: "customer" } }]],
    ],
    ["not dispatch a rename command when the name is unchanged", " person ", []],
  ])("should %s", (_case, name, calls) => {
    const { dispatch } = displayItem(
      container,
      new DiagramItem("/element:person", "person", DiagramItemType.element, diagram)
    );

    editInput(container, "Name", name);

    expect(dispatch.mock.calls).toEqual(calls);
  });

  test("should not dispatch duplicate rename commands for the same node/name replay", () => {
    const { panel: shownPanel, dispatch } = displayItem(
      container,
      new DiagramItem("/element:person", "person", DiagramItemType.element, diagram)
    );
    editInput(container, "Name", "customer");

    // Simulate stale re-display that still references the old node id/name.
    shownPanel.display(new DiagramItem("/element:person", "person", DiagramItemType.element, diagram));
    editInput(container, "Name", "customer");

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({
      type: "modifyElement",
      payload: { elementId: "/element:person", elementName: "customer" },
    });
  });

  test("should show non-editable name for compositor groups", () => {
    const item = new DiagramItem(
      "/complexType:PersonType/group:sequence[0]",
      "sequence",
      DiagramItemType.group,
      diagram
    );

    panel.display(item);

    const nameRow = Array.from(container.querySelectorAll(".property")).find(
      (row) => row.querySelector("label")?.textContent === "Name:"
    );
    const nameInput = nameRow?.querySelector("input");
    expect(nameInput).toBeNull();
    expect(container.textContent).toContain("Name:");
    expect(container.textContent).toContain("sequence");
  });

  test.each([
    [
      "modifyElement",
      "a local element",
      "/element:root/element:item[0]",
      DiagramItemType.element,
      { elementId: "/element:root/element:item[0]" },
    ],
    [
      "modifyGroup",
      "a compositor",
      "/complexType:PersonType/group:sequence[0]",
      DiagramItemType.group,
      { groupId: "/complexType:PersonType/group:sequence[0]" },
    ],
  ])("should dispatch %s when minOccurs of %s is changed", (type, _case, id, itemType, target) => {
    const item = new DiagramItem(id, "item", itemType, diagram);
    item.minOccurrence = 1;
    item.maxOccurrence = 3;
    const { dispatch } = displayItem(container, item);

    editInput(container, "minOccurs", "0");

    expect(dispatch).toHaveBeenCalledWith({
      type,
      payload: { ...target, minOccurs: 0, maxOccurs: 3 },
    });
  });

  test("should reject an empty name with a message and show the current name again", () => {
    const { dispatch } = displayItem(
      container,
      new DiagramItem("/element:person", "person", DiagramItemType.element, diagram)
    );

    editInput(container, "Name", "  ");

    expect(dispatch).not.toHaveBeenCalled();
    expect(getInputByLabel(container, "Name").value).toBe("person");
    expect(getInputByLabel(container, "Name").parentElement?.querySelector(".property-message")?.textContent).toBe(
      "Enter a name"
    );
  });

  test.each(["unbounded", " unbounded "])("should accept maxOccurs %j without a message", (text) => {
    const item = new DiagramItem("/element:root/element:item[0]", "item", DiagramItemType.element, diagram);
    item.minOccurrence = 1;
    item.maxOccurrence = 3;
    const { dispatch } = displayItem(container, item);

    editInput(container, "maxOccurs", text);

    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      type: "modifyElement",
      payload: { elementId: "/element:root/element:item[0]", minOccurs: 1, maxOccurs: "unbounded" },
    });
    expect(getInputByLabel(container, "maxOccurs").value).toBe("unbounded");
    expect(container.querySelector(".property-message:not([hidden])")).toBeNull();
  });

  test.each([
    ["minOccurs", "abc", "1", "minOccurs must be a number"],
    ["minOccurs", " ", "1", "minOccurs must be a number"],
    ["maxOccurs", "many", "3", "maxOccurs must be a number or unbounded"],
  ])("should reject %s %j with a message and show the current value again", (label, text, current, message) => {
    const item = new DiagramItem("/element:root/element:item[0]", "item", DiagramItemType.element, diagram);
    item.minOccurrence = 1;
    item.maxOccurrence = 3;
    const { dispatch } = displayItem(container, item);

    editInput(container, label, text);

    expect(dispatch).not.toHaveBeenCalled();
    expect(getInputByLabel(container, label).value).toBe(current);
    expect(getInputByLabel(container, label).parentElement?.querySelector(".property-message")?.textContent).toBe(
      message
    );
  });

  test.each([
    ["top-level elements", "/element:item", DiagramItemType.element],
    ["schema nodes", SCHEMA_ROOT_ID, DiagramItemType.group],
    ["the actual schema root item", SCHEMA_ROOT_ID, DiagramItemType.element],
    ["complexType nodes", "/complexType:PersonType", DiagramItemType.type],
    ["the compositor of a group definition", "/group:PersonGroup/group:sequence[0]", DiagramItemType.group],
    ["simpleType nodes", "/simpleType:CodeType", DiagramItemType.type],
  ])("should not show cardinality fields for %s", (_case, id, itemType) => {
    const item = new DiagramItem(id, "item", itemType, diagram);
    item.minOccurrence = 0;
    item.maxOccurrence = 7;

    panel.display(item);

    expect(hasLabel(container, "minOccurs")).toBe(false);
    expect(hasLabel(container, "maxOccurs")).toBe(false);
    expect(hasLabel(container, "Cardinality")).toBe(false);
  });

  test("should keep edited draft values visible when switching tabs", () => {
    const item = new DiagramItem("/element:root/element:item[0]", "item", DiagramItemType.element, diagram);
    item.minOccurrence = 1;
    item.maxOccurrence = 3;
    displayItem(container, item);
    editInput(container, "maxOccurs", "7");

    const xmlTab = findButton(container, "XML");
    xmlTab?.click();

    const xmlPreview = container.querySelector("pre");
    const xmlHint = container.querySelector(".property-xml-hint");
    expect(xmlHint?.textContent).toContain("Preview only");
    expect(xmlHint?.textContent).toContain("text editor tab");
    expect(xmlPreview?.textContent).toContain("<xs:element");
    expect(xmlPreview?.textContent).toContain('maxOccurs="7"');
    expect(xmlPreview?.textContent).not.toContain('"id":');

    const generalTab = findButton(container, "General");
    generalTab?.click();

    expect(getInputByLabel(container, "maxOccurs").value).toBe("7");
  });

  test("should remove all rendered content on clear", () => {
    const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);
    panel.display(item);

    panel.clear();

    expect(container.innerHTML).toBe("");
  });
});
