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
import { diagramItem, muteDiagramBuilderLog, NOT_READ_SCHEMA_OBJECT } from "../__tests__/diagramTestHelpers";
import { webviewSchemaWith } from "../../shared/__tests__/schemaTestHelpers";

/**
 * Returns the item of the top-level element `person` in a schema that has only this element.
 *
 * @returns The item
 */
function personItem(): DiagramItem {
  return diagramItem(webviewSchemaWith(`<xs:element name="person"/>`), "/element:person");
}

/** A component of each kind whose properties the panel shows, with a sequence in the complex type and the group. */
const KINDS = `<xs:element name="item"/>
<xs:complexType name="PersonType"><xs:sequence/></xs:complexType>
<xs:group name="PersonGroup"><xs:sequence/></xs:group>
<xs:simpleType name="CodeType"><xs:restriction base="xs:string"/></xs:simpleType>`;

/** A complex type whose sequence and local element `item` have `minOccurs` 1 and `maxOccurs` 3. */
const OCCURRENCES = `<xs:complexType name="T"><xs:sequence minOccurs="1" maxOccurs="3">
  <xs:element name="item" minOccurs="1" maxOccurs="3"/>
</xs:sequence></xs:complexType>`;

/** The ID of the sequence in {@link OCCURRENCES}. */
const SEQUENCE_ID = "/complexType:T/sequence[0]";

/** The ID of the local element `item` in {@link OCCURRENCES}. */
const ITEM_ID = `${SEQUENCE_ID}/element:item[0]`;

/**
 * Returns the item of the local element `item` with `minOccurs` 1 and `maxOccurs` 3.
 *
 * @returns The item
 */
function itemWithOccurrences(): DiagramItem {
  return diagramItem(webviewSchemaWith(OCCURRENCES), ITEM_ID);
}

describe("PropertiesPanel", () => {
  muteDiagramBuilderLog();
  let { container, panel, diagram } = createPanel();

  beforeEach(() => {
    ({ container, panel, diagram } = createPanel());
  });

  test("should render tabs and general values for selected node", () => {
    const item = diagramItem(webviewSchemaWith(`<xs:element name="TestItem" type="xs:string"/>`), "/element:TestItem");

    panel.display(item);

    expect(container.textContent).toContain("General");
    expect(container.textContent).toContain("Docs");
    expect(container.textContent).toContain("XML");
    expect(container.textContent).toContain("IDENTITY");
    expect(getInputByLabel(container, "Name").value).toBe("TestItem");
    expect(getInputByLabel(container, "Type").value).toBe("xs:string");
  });

  test("should render a node-type header above the tab bar", () => {
    const item = personItem();

    panel.display(item);

    const header = container.firstElementChild as HTMLElement;
    expect(header.classList.contains("properties-panel-header")).toBe(true);
    expect(header.textContent).toContain("Element");
    expect(header.nextElementSibling?.classList.contains("property-tabs")).toBe(true);
  });

  test("should dispatch removeElement when the header delete button is clicked", () => {
    const { dispatch } = displayItem(container, personItem());

    const deleteButton = container.querySelector<HTMLButtonElement>("button[title='Delete node']")!;
    expect(deleteButton.classList.contains("property-docs-action-icon-only")).toBe(true);
    deleteButton.click();

    expect(dispatch).toHaveBeenCalledWith({
      type: "removeElement",
      payload: { elementId: "/element:person" },
    });
  });

  test("should dispatch removeCompositor when deleting a compositor", () => {
    const { dispatch } = displayItem(
      container,
      diagramItem(webviewSchemaWith(KINDS), "/complexType:PersonType/sequence[0]")
    );

    const deleteButton = container.querySelector<HTMLButtonElement>("button[title='Delete node']")!;
    deleteButton.click();

    expect(dispatch).toHaveBeenCalledWith({
      type: "removeCompositor",
      payload: { compositorId: "/complexType:PersonType/sequence[0]" },
    });
  });

  test("should not render a header delete button for schema nodes", () => {
    panel.display(diagramItem(webviewSchemaWith(KINDS), SCHEMA_ROOT_ID));

    expect(container.querySelector("button[title='Delete node']")).toBeNull();
  });

  test("should render attributes safely without innerHTML interpolation", () => {
    const content = `<xs:complexType name="T"><xs:attribute name="&lt;unsafe&gt;" type="xs:string" use="required"/></xs:complexType>`;

    panel.display(diagramItem(webviewSchemaWith(content), "/complexType:T"));

    expect(container.textContent).toContain("ATTRIBUTES");
    expect(container.textContent).toContain("<unsafe>");
    expect(container.innerHTML).not.toContain("<strong><unsafe></strong>");
  });

  test.each([
    ["schema", SCHEMA_ROOT_ID],
    ["element with an inline complex type", "/element:person"],
    ["complex type", "/complexType:PersonType"],
  ])("should render an Attributes section for a %s with attributes", (_, id) => {
    const content = `<xs:attribute name="status" type="xs:string"/>
<xs:element name="person"><xs:complexType><xs:attribute name="status" type="xs:string"/></xs:complexType></xs:element>
<xs:complexType name="PersonType"><xs:attribute name="status" type="xs:string"/></xs:complexType>`;

    panel.display(diagramItem(webviewSchemaWith(content), id));

    expect(container.textContent).toContain("ATTRIBUTES");
    expect(container.textContent).toContain("status");
  });

  test("should not render the child count", () => {
    const item = personItem();
    item.childElements = [
      new DiagramItem("/element:person/element:name", "name", DiagramItemType.element, NOT_READ_SCHEMA_OBJECT, diagram),
    ];

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
    const { dispatch } = displayItem(container, personItem());

    editInput(container, "Name", name);

    expect(dispatch.mock.calls).toEqual(calls);
  });

  test("should not dispatch duplicate rename commands for the same node/name replay", () => {
    const { panel: shownPanel, dispatch } = displayItem(container, personItem());
    editInput(container, "Name", "customer");

    // Simulate stale re-display that still references the old node id/name.
    shownPanel.display(personItem());
    editInput(container, "Name", "customer");

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({
      type: "modifyElement",
      payload: { elementId: "/element:person", elementName: "customer" },
    });
  });

  test("should show the kind of a compositor in a Compositor field instead of a name", () => {
    displayItem(container, diagramItem(webviewSchemaWith(OCCURRENCES), SEQUENCE_ID));

    expect(getInputByLabel(container, "Compositor").value).toBe("Sequence");
    expect(container.textContent).not.toContain("Name:");
  });

  test.each([
    [
      "a sequence of optional elements to an all",
      `<xs:complexType name="T"><xs:sequence><xs:element name="a" minOccurs="0"/></xs:sequence></xs:complexType>`,
      SEQUENCE_ID,
      "All",
      "all",
    ],
    [
      "a nested choice to a sequence",
      `<xs:complexType name="N"><xs:sequence><xs:choice/></xs:sequence></xs:complexType>`,
      "/complexType:N/sequence[0]/choice[0]",
      "Sequence",
      "sequence",
    ],
  ])("should dispatch modifyCompositor when changing %s", (_case, schema, id, entered, compositor) => {
    const { dispatch } = displayItem(container, diagramItem(webviewSchemaWith(schema), id));

    editInput(container, "Compositor", entered);

    expect(dispatch).toHaveBeenCalledWith({ type: "modifyCompositor", payload: { compositorId: id, compositor } });
  });

  // XML Schema 1.0 allows an all only at the top, with nothing but elements that occur at most once
  test.each([
    [
      "a nested compositor",
      `<xs:complexType name="T"><xs:sequence><xs:choice/></xs:sequence></xs:complexType>`,
      "/complexType:T/sequence[0]/choice[0]",
      "Choice",
    ],
    [
      "a sequence with a nested choice",
      `<xs:complexType name="T"><xs:sequence><xs:choice/></xs:sequence></xs:complexType>`,
      SEQUENCE_ID,
      "Sequence",
    ],
    ["a sequence with a repeated element", OCCURRENCES, SEQUENCE_ID, "Sequence"],
    [
      "a repeated sequence",
      `<xs:complexType name="T"><xs:sequence maxOccurs="2"><xs:element name="a"/></xs:sequence></xs:complexType>`,
      SEQUENCE_ID,
      "Sequence",
    ],
    [
      "a sequence with a wildcard",
      `<xs:complexType name="T"><xs:sequence><xs:any/></xs:sequence></xs:complexType>`,
      SEQUENCE_ID,
      "Sequence",
    ],
  ])("should not offer an all for %s", (_case, schema, id, current) => {
    const { dispatch } = displayItem(container, diagramItem(webviewSchemaWith(schema), id));

    editInput(container, "Compositor", "All");

    expect(dispatch).not.toHaveBeenCalled();
    expect(getInputByLabel(container, "Compositor").value).toBe(current);
    expect(
      getInputByLabel(container, "Compositor").parentElement?.querySelector(".property-message")?.textContent
    ).toBe("'All' is not a value of Compositor. Choose one of: Sequence, Choice");
  });

  test("should offer an all for an all", () => {
    const id = "/complexType:T/all[0]";
    displayItem(
      container,
      diagramItem(
        webviewSchemaWith(
          `<xs:complexType name="T"><xs:all><xs:element name="a" maxOccurs="2"/></xs:all></xs:complexType>`
        ),
        id
      )
    );

    expect(getInputByLabel(container, "Compositor").value).toBe("All");
  });

  test.each([
    ["modifyElement", "a local element", ITEM_ID, { elementId: ITEM_ID }],
    ["modifyCompositor", "a compositor", SEQUENCE_ID, { compositorId: SEQUENCE_ID }],
  ])("should dispatch %s when minOccurs of %s is changed", (type, _case, id, target) => {
    const { dispatch } = displayItem(container, diagramItem(webviewSchemaWith(OCCURRENCES), id));

    editInput(container, "minOccurs", "0");

    expect(dispatch).toHaveBeenCalledWith({
      type,
      payload: { ...target, minOccurs: 0, maxOccurs: 3 },
    });
  });

  test.each([
    ["an empty name", "  ", "Enter a name"],
    ["a name that is no valid XML name", "1person", "Name must be a valid XML name"],
  ])("should reject %s with a message and show the current name again", (_case, name, message) => {
    const { dispatch } = displayItem(container, personItem());

    editInput(container, "Name", name);

    expect(dispatch).not.toHaveBeenCalled();
    expect(getInputByLabel(container, "Name").value).toBe("person");
    expect(getInputByLabel(container, "Name").parentElement?.querySelector(".property-message")?.textContent).toBe(
      message
    );
  });

  test.each(["unbounded", " unbounded "])("should accept maxOccurs %j without a message", (text) => {
    const { dispatch } = displayItem(container, itemWithOccurrences());

    editInput(container, "maxOccurs", text);

    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      type: "modifyElement",
      payload: { elementId: ITEM_ID, minOccurs: 1, maxOccurs: "unbounded" },
    });
    expect(container.querySelector(".property-message:not([hidden])")).toBeNull();
  });

  test.each([
    ["minOccurs", "abc", "1", "minOccurs must be a number"],
    ["minOccurs", " ", "1", "minOccurs must be a number"],
    ["maxOccurs", "many", "3", "maxOccurs must be a number or unbounded"],
    ["minOccurs", "-1", "1", "minOccurs must be a non-negative integer"],
    ["minOccurs", "1.5", "1", "minOccurs must be an integer"],
    ["maxOccurs", "-2", "3", "maxOccurs must be a non-negative integer or 'unbounded'"],
  ])("should reject %s %j with a message and show the current value again", (label, text, current, message) => {
    const { dispatch } = displayItem(container, itemWithOccurrences());

    editInput(container, label, text);

    expect(dispatch).not.toHaveBeenCalled();
    expect(getInputByLabel(container, label).value).toBe(current);
    expect(getInputByLabel(container, label).parentElement?.querySelector(".property-message")?.textContent).toBe(
      message
    );
  });

  test.each([
    ["top-level elements", "/element:item"],
    ["the schema", SCHEMA_ROOT_ID],
    ["complexType nodes", "/complexType:PersonType"],
    ["the compositor of a group definition", "/group:PersonGroup/sequence[0]"],
    ["simpleType nodes", "/simpleType:CodeType"],
  ])("should not show cardinality fields for %s", (_case, id) => {
    panel.display(diagramItem(webviewSchemaWith(KINDS), id));

    expect(hasLabel(container, "minOccurs")).toBe(false);
    expect(hasLabel(container, "maxOccurs")).toBe(false);
    expect(hasLabel(container, "Cardinality")).toBe(false);
  });

  test("should show the values of the schema on every tab until the schema with the sent change arrives", () => {
    displayItem(container, itemWithOccurrences());
    editInput(container, "maxOccurs", "7");

    const xmlTab = findButton(container, "XML");
    xmlTab?.click();

    const xmlPreview = container.querySelector("pre");
    const xmlHint = container.querySelector(".property-xml-hint");
    expect(xmlHint?.textContent).toContain("Preview only");
    expect(xmlHint?.textContent).toContain("text editor tab");
    expect(xmlPreview?.textContent).toContain("<xs:element");
    expect(xmlPreview?.textContent).toContain('maxOccurs="3"');
    expect(xmlPreview?.textContent).not.toContain('"id":');

    const generalTab = findButton(container, "General");
    generalTab?.click();

    expect(getInputByLabel(container, "maxOccurs").value).toBe("3");
  });

  test.each([
    [
      "a simple type that is a restriction",
      `<xs:simpleType name="t"><xs:restriction base="xs:string"/></xs:simpleType>`,
      "/simpleType:t",
      true,
    ],
    [
      "an element with an inline simple type",
      `<xs:element name="t"><xs:simpleType><xs:restriction base="xs:int"/></xs:simpleType></xs:element>`,
      "/element:t",
      true,
    ],
    ["a list", `<xs:simpleType name="t"><xs:list itemType="xs:int"/></xs:simpleType>`, "/simpleType:t", false],
    // Its restriction belongs to the simple content of a complex type, not to an inline simple type
    [
      "an element whose inline complex type has simple content",
      `<xs:element name="t"><xs:complexType><xs:simpleContent><xs:extension base="xs:decimal"/></xs:simpleContent></xs:complexType></xs:element>`,
      "/element:t",
      false,
    ],
  ])("should offer the Facets tab only where it applies: %s", (_case, content, id, offered) => {
    panel.display(diagramItem(webviewSchemaWith(content), id));

    expect(findButton(container, "Facets") !== undefined).toBe(offered);
  });

  test("should remove all rendered content on clear", () => {
    panel.display(personItem());

    panel.clear();

    expect(container.innerHTML).toBe("");
  });
});
