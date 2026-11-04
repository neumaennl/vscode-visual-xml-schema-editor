/**
 * Unit tests for the PropertiesPanel class: the header, the General tab and the general behavior of the panel.
 */

import { PropertiesPanel } from "./propertiesPanel";
import { DiagramItem } from "../diagram/DiagramItem";
import { Diagram } from "../diagram/Diagram";
import { DiagramItemType } from "../diagram/DiagramTypes";
import { SCHEMA_ROOT_ID } from "../../shared/idStrategy";
import { findButton, getInputByLabel, hasLabel } from "../__tests__/propertiesPanelTestHelpers";

describe("PropertiesPanel", () => {
  let container: HTMLDivElement;
  let panel: PropertiesPanel;
  let diagram: Diagram;

  beforeEach(() => {
    container = document.createElement("div");
    panel = new PropertiesPanel(container);
    diagram = new Diagram();
  });

  test("renders tabs and general values for selected node", () => {
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

  test("renders a node-type header above the tab bar", () => {
    const item = new DiagramItem("/element:person", "person", DiagramItemType.element, diagram);

    panel.display(item);

    const header = container.firstElementChild as HTMLElement;
    expect(header.classList.contains("properties-panel-header")).toBe(true);
    expect(header.textContent).toContain("Element");
    expect(header.nextElementSibling?.classList.contains("property-tabs")).toBe(true);
  });

  test("dispatches removeElement when the header delete button is clicked", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
    const item = new DiagramItem("/element:person", "person", DiagramItemType.element, diagram);

    panel.display(item);
    const deleteButton = container.querySelector("button[title='Delete node']") as HTMLButtonElement;
    expect(deleteButton.classList.contains("property-docs-action-icon-only")).toBe(true);
    deleteButton.click();

    expect(dispatch).toHaveBeenCalledWith({
      type: "removeElement",
      payload: { elementId: "/element:person" },
    });
  });

  test("dispatches removeGroup when deleting a compositor group", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
    const item = new DiagramItem(
      "/complexType:PersonType/group:sequence[0]",
      "sequence",
      DiagramItemType.group,
      diagram
    );

    panel.display(item);
    const deleteButton = container.querySelector("button[title='Delete node']") as HTMLButtonElement;
    deleteButton.click();

    expect(dispatch).toHaveBeenCalledWith({
      type: "removeGroup",
      payload: { groupId: "/complexType:PersonType/group:sequence[0]" },
    });
  });

  test("does not render a header delete button for schema nodes", () => {
    const schemaRoot = new DiagramItem(SCHEMA_ROOT_ID, "schema", DiagramItemType.group, diagram);

    panel.display(schemaRoot);

    expect(container.querySelector("button[title='Delete node']")).toBeNull();
  });

  test("renders attributes safely without innerHTML interpolation", () => {
    const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);
    item.attributes = [
      { name: "<unsafe>", type: "string", use: "required" },
    ];

    panel.display(item);

    expect(container.textContent).toContain("ATTRIBUTES");
    expect(container.textContent).toContain("<unsafe>");
    expect(container.innerHTML).not.toContain("<strong><unsafe></strong>");
  });

  test.each([
    ["schema", SCHEMA_ROOT_ID, DiagramItemType.group],
    ["element", "/element:person", DiagramItemType.element],
    ["complex type", "/complexType:PersonType", DiagramItemType.type],
  ])("renders an Attributes section for a %s with attributes", (_, id, itemType) => {
    const item = new DiagramItem(id, "TestItem", itemType, diagram);
    item.attributes = [{ name: "status", type: "xs:string" }];

    panel.display(item);

    expect(container.textContent).toContain("ATTRIBUTES");
    expect(container.textContent).toContain("status");
  });

  test("does not render the child count", () => {
    const item = new DiagramItem("/element:person", "person", DiagramItemType.element, diagram);
    item.childElements = [new DiagramItem("/element:person/element:name", "name", DiagramItemType.element, diagram)];

    panel.display(item);

    expect(hasLabel(container, "Children")).toBe(false);
  });

  test("dispatches modifyElement when name is changed", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
    const item = new DiagramItem("/element:person", "person", DiagramItemType.element, diagram);

    panel.display(item);
    const input = getInputByLabel(container, "Name");
    input.value = "customer";
    input.dispatchEvent(new Event("blur"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifyElement",
      payload: { elementId: "/element:person", elementName: "customer" },
    });
  });

  test("does not dispatch a rename command when the name is unchanged", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
    const item = new DiagramItem("/element:person", "person", DiagramItemType.element, diagram);

    panel.display(item);
    const input = getInputByLabel(container, "Name");
    input.value = " person ";
    input.dispatchEvent(new Event("blur"));

    expect(dispatch).not.toHaveBeenCalled();
  });

  test("does not dispatch duplicate rename commands for the same node/name replay", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);

    const initialItem = new DiagramItem("/element:person", "person", DiagramItemType.element, diagram);
    panel.display(initialItem);

    const firstInput = getInputByLabel(container, "Name");
    firstInput.value = "customer";
    firstInput.dispatchEvent(new Event("blur"));

    // Simulate stale re-display that still references the old node id/name.
    const staleItem = new DiagramItem("/element:person", "person", DiagramItemType.element, diagram);
    panel.display(staleItem);
    const replayInput = getInputByLabel(container, "Name");
    replayInput.value = "customer";
    replayInput.dispatchEvent(new Event("blur"));

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({
      type: "modifyElement",
      payload: { elementId: "/element:person", elementName: "customer" },
    });
  });

  test("shows non-editable name for compositor groups", () => {
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

  test("dispatches modifyElement when minOccurs is changed", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
    const item = new DiagramItem("/element:root/element:item[0]", "item", DiagramItemType.element, diagram);
    item.minOccurrence = 1;
    item.maxOccurrence = 3;

    panel.display(item);
    const input = getInputByLabel(container, "minOccurs");
    input.value = "0";
    input.dispatchEvent(new Event("blur"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifyElement",
      payload: { elementId: "/element:root/element:item[0]", minOccurs: 0, maxOccurs: 3 },
    });
  });

  test("does not show occurrence fields for top-level elements", () => {
    const item = new DiagramItem("/element:item", "item", DiagramItemType.element, diagram);
    item.minOccurrence = 0;
    item.maxOccurrence = 7;

    panel.display(item);

    expect(hasLabel(container, "minOccurs")).toBe(false);
    expect(hasLabel(container, "maxOccurs")).toBe(false);
    expect(hasLabel(container, "Cardinality")).toBe(false);
  });

  test("does not show cardinality fields for schema nodes", () => {
    const item = new DiagramItem(SCHEMA_ROOT_ID, "schema", DiagramItemType.group, diagram);

    panel.display(item);

    expect(hasLabel(container, "minOccurs")).toBe(false);
    expect(hasLabel(container, "maxOccurs")).toBe(false);
    expect(hasLabel(container, "Cardinality")).toBe(false);
  });

  test("does not show cardinality fields for the actual schema root item", () => {
    const item = new DiagramItem(SCHEMA_ROOT_ID, "schema", DiagramItemType.element, diagram);

    panel.display(item);

    expect(hasLabel(container, "minOccurs")).toBe(false);
    expect(hasLabel(container, "maxOccurs")).toBe(false);
    expect(hasLabel(container, "Cardinality")).toBe(false);
  });

  test("does not show cardinality fields for complexType nodes", () => {
    const item = new DiagramItem("/complexType:PersonType", "PersonType", DiagramItemType.type, diagram);

    panel.display(item);

    expect(hasLabel(container, "minOccurs")).toBe(false);
    expect(hasLabel(container, "maxOccurs")).toBe(false);
    expect(hasLabel(container, "Cardinality")).toBe(false);
  });

  test("does not show cardinality fields for the compositor of a group definition", () => {
    const item = new DiagramItem("/group:PersonGroup/group:sequence[0]", "sequence", DiagramItemType.group, diagram);

    panel.display(item);

    expect(hasLabel(container, "minOccurs")).toBe(false);
    expect(hasLabel(container, "maxOccurs")).toBe(false);
  });

  test("does not show cardinality fields for simpleType nodes", () => {
    const item = new DiagramItem("/simpleType:CodeType", "CodeType", DiagramItemType.type, diagram);

    panel.display(item);

    expect(hasLabel(container, "minOccurs")).toBe(false);
    expect(hasLabel(container, "maxOccurs")).toBe(false);
    expect(hasLabel(container, "Cardinality")).toBe(false);
  });

  test("dispatches modifyGroup when group cardinality is changed", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
    const item = new DiagramItem(
      "/complexType:PersonType/group:sequence[0]",
      "sequence",
      DiagramItemType.group,
      diagram
    );
    item.minOccurrence = 1;
    item.maxOccurrence = 3;

    panel.display(item);
    const input = getInputByLabel(container, "minOccurs");
    input.value = "0";
    input.dispatchEvent(new Event("blur"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifyGroup",
      payload: { groupId: "/complexType:PersonType/group:sequence[0]", minOccurs: 0, maxOccurs: 3 },
    });
  });

  test("dispatches modifyComplexType when complexType constraints are changed", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
    const item = new DiagramItem("/complexType:PersonType", "PersonType", DiagramItemType.type, diagram);
    item.isAbstract = false;
    item.isMixed = false;

    panel.display(item);

    const abstractRow = Array.from(container.querySelectorAll(".property-toggle-row")).find(
      (row) => row.querySelector(".property-toggle-label")?.textContent === "Abstract"
    );
    const abstractInput = abstractRow?.querySelector("input") as HTMLInputElement;
    abstractInput.checked = true;
    abstractInput.dispatchEvent(new Event("change"));

    const mixedRow = Array.from(container.querySelectorAll(".property-toggle-row")).find(
      (row) => row.querySelector(".property-toggle-label")?.textContent === "Mixed content"
    );
    const mixedInput = mixedRow?.querySelector("input") as HTMLInputElement;
    mixedInput.checked = true;
    mixedInput.dispatchEvent(new Event("change"));

    expect(dispatch).toHaveBeenNthCalledWith(1, {
      type: "modifyComplexType",
      payload: { typeId: "/complexType:PersonType", abstract: true },
    });
    expect(dispatch).toHaveBeenNthCalledWith(2, {
      type: "modifyComplexType",
      payload: { typeId: "/complexType:PersonType", mixed: true },
    });
  });

  test("keeps edited draft values visible when switching tabs", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
    const item = new DiagramItem("/element:root/element:item[0]", "item", DiagramItemType.element, diagram);
    item.minOccurrence = 1;
    item.maxOccurrence = 3;

    panel.display(item);
    const input = getInputByLabel(container, "maxOccurs");
    input.value = "7";
    input.dispatchEvent(new Event("blur"));

    const xmlTab = findButton(container, "XML");
    xmlTab?.click();

    const xmlPreview = container.querySelector("pre");
    const xmlHint = container.querySelector(".property-xml-hint");
    expect(xmlHint?.textContent).toContain("Preview only");
    expect(xmlHint?.textContent).toContain("text editor tab");
    expect(xmlPreview?.textContent).toContain('<xs:element');
    expect(xmlPreview?.textContent).toContain('maxOccurs="7"');
    expect(xmlPreview?.textContent).not.toContain('"id":');

    const generalTab = findButton(container, "General");
    generalTab?.click();

    expect(getInputByLabel(container, "maxOccurs").value).toBe("7");
  });

  test("clear removes all rendered content", () => {
    const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);
    panel.display(item);

    panel.clear();

    expect(container.innerHTML).toBe("");
  });
});
