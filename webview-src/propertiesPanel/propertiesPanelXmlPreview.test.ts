/**
 * Unit tests for the XML tab of the properties panel.
 */

import { PropertiesPanel } from "./propertiesPanel";
import { DiagramItem } from "../diagram/DiagramItem";
import { Diagram } from "../diagram/Diagram";
import { DiagramItemType } from "../diagram/DiagramTypes";
import { SCHEMA_ROOT_ID } from "../../shared/idStrategy";
import { findButton } from "../__tests__/propertiesPanelTestHelpers";

describe("PropertiesPanel: the XML tab", () => {
  let container: HTMLDivElement;
  let panel: PropertiesPanel;
  let diagram: Diagram;

  beforeEach(() => {
    container = document.createElement("div");
    panel = new PropertiesPanel(container);
    diagram = new Diagram();
  });

  test("renders unbounded in XML tab when maxOccurrence is unlimited", () => {
    expect.hasAssertions();
    const item = new DiagramItem("/element:root/element:item[0]", "item", DiagramItemType.element, diagram);
    item.minOccurrence = 0;
    item.maxOccurrence = -1;

    panel.display(item);
    const xmlTab = findButton(container, "XML");
    xmlTab?.click();

    const xmlPreview = container.querySelector("pre");
    expect(xmlPreview?.textContent).toContain('maxOccurs="unbounded"');
  });

  test("renders compositor nodes as XML fragments in the XML tab", () => {
    expect.hasAssertions();
    const sequence = new DiagramItem(
      "/complexType:OrderType/group:sequence[0]",
      "sequence",
      DiagramItemType.group,
      diagram
    );
    sequence.minOccurrence = 0;
    sequence.maxOccurrence = -1;

    const child = new DiagramItem(
      "/complexType:OrderType/group:sequence[0]/element:item[0]",
      "item",
      DiagramItemType.element,
      diagram
    );
    child.type = "xs:string";
    sequence.addChild(child);

    panel.display(sequence);
    const xmlTab = findButton(container, "XML");
    xmlTab?.click();

    const xmlPreview = container.querySelector("pre");
    expect(xmlPreview?.textContent).toContain('<xs:sequence minOccurs="0" maxOccurs="unbounded">');
    expect(xmlPreview?.textContent).toContain('<xs:element name="item" type="xs:string"/>');
  });

  test("renders simpleType nodes in the XML tab even when the parsed node type is namespaced", () => {
    expect.hasAssertions();
    const item = new DiagramItem(
      "/xs:simpleType:TokenType",
      "TokenType",
      DiagramItemType.type,
      diagram
    );
    item.type = "xs:simpleType";

    panel.display(item);
    const xmlTab = findButton(container, "XML");
    xmlTab?.click();

    const xmlPreview = container.querySelector("pre");
    expect(xmlPreview?.textContent).toContain('<xs:simpleType name="TokenType"');
  });

  test("truncates deep XML preview content with an ellipsis marker", () => {
    expect.hasAssertions();
    const schemaRoot = new DiagramItem(SCHEMA_ROOT_ID, "schema", DiagramItemType.group, diagram);

    const complexType = new DiagramItem(
      "/complexType:OrderType",
      "OrderType",
      DiagramItemType.type,
      diagram
    );
    complexType.type = "complexType";

    const sequence = new DiagramItem(
      "/complexType:OrderType/group:sequence[0]",
      "sequence",
      DiagramItemType.group,
      diagram
    );
    const deepElement = new DiagramItem(
      "/complexType:OrderType/group:sequence[0]/element:lineItem[0]",
      "lineItem",
      DiagramItemType.element,
      diagram
    );
    deepElement.type = "xs:string";

    sequence.addChild(deepElement);
    complexType.addChild(sequence);
    schemaRoot.addChild(complexType);

    panel.display(schemaRoot);
    const xmlTab = findButton(container, "XML");
    xmlTab?.click();

    const xmlPreview = container.querySelector("pre");
    expect(xmlPreview?.textContent).toContain('<xs:complexType name="OrderType">');
    expect(xmlPreview?.textContent).toContain('<!-- ... truncated ... -->');
    expect(xmlPreview?.textContent).not.toContain('name="lineItem"');
  });
});
