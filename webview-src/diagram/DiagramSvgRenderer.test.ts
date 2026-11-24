/**
 * Tests for `DiagramSvgRenderer` class
 */

import { DiagramSvgRenderer } from "./DiagramSvgRenderer";
import { Diagram } from "./Diagram";
import { DiagramItem } from "./DiagramItem";
import { DiagramItemType } from "./DiagramTypes";
import { setupGetBBoxMock } from "../__tests__/svgTestHelpers";
import {
  diagramItem,
  localElementWith,
  muteDiagramBuilderLog,
  component,
  documented,
} from "../__tests__/diagramTestHelpers";
import { webviewSchemaWith } from "../../shared/__tests__/schemaTestHelpers";
import { generateSchemaId, SchemaNodeType } from "../../shared/idStrategy";
import { schema } from "../../shared/types";

/** A top-level component of each kind of item. */
const COMPONENTS: Record<DiagramItemType, string> = {
  [DiagramItemType.element]: `<xs:element name="e"/>`,
  [DiagramItemType.group]: `<xs:group name="G"><xs:sequence/></xs:group>`,
  [DiagramItemType.type]: `<xs:complexType name="T"/>`,
};

describe("DiagramSvgRenderer", () => {
  muteDiagramBuilderLog();
  let svg: SVGSVGElement;
  let renderer: DiagramSvgRenderer;
  let diagram: Diagram;

  beforeEach(() => {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    document.body.appendChild(svg);
    renderer = new DiagramSvgRenderer(svg);
    diagram = new Diagram(new schema());

    // Mock getBBox for SVG text elements (not supported in jsdom)
    setupGetBBoxMock();
  });

  afterEach(() => {
    document.body.removeChild(svg);
  });

  /**
   * Creates an item in the diagram with a top-level component of its kind as its schema object.
   *
   * @param id - The ID of the item
   * @param name - The name of the item
   * @param itemType - The kind of the item
   * @returns The item
   */
  function newItem(id: string, name: string, itemType = DiagramItemType.element): DiagramItem {
    return new DiagramItem(id, name, itemType, component(COMPONENTS[itemType]), diagram);
  }

  /**
   * Adds a root item to the diagram, renders the diagram and returns the group of the item.
   *
   * @param id - The ID of the item
   * @param name - The name of the item
   * @param itemType - The kind of the item
   * @param properties - Further properties of the item; the element box defaults to 100 × 50 at (10, 10)
   * @returns The group of the item, or `null` if it was not rendered
   */
  function renderRootItem(
    id: string,
    name: string,
    itemType: DiagramItemType,
    properties: Partial<DiagramItem> = {}
  ): Element | null {
    const item = newItem(id, name, itemType);
    item.elementBox = { x: 10, y: 10, width: 100, height: 50 };
    Object.assign(item, properties);
    diagram.addRootElement(item);
    renderer.render(diagram);
    return svg.querySelector(`[data-item-id="${id}"]`);
  }

  /**
   * Adds a root item `parent` with a child `child` to the diagram and renders the diagram.
   *
   * @param properties - Further properties of the parent
   */
  function renderParentWithChild(properties: Partial<DiagramItem>): void {
    const parent = newItem("parent", "Parent");
    const child = newItem("child", "Child");
    parent.elementBox = { x: 0, y: 0, width: 100, height: 50 };
    child.elementBox = { x: 150, y: 0, width: 100, height: 50 };
    parent.addChild(child);
    Object.assign(parent, properties);
    diagram.addRootElement(parent);
    renderer.render(diagram);
  }

  describe("constructor", () => {
    test("should create renderer with SVG element", () => {
      expect(renderer).toBeDefined();
      expect(svg.querySelector("g")).toBeTruthy();
    });

    test("should create nested group structure", () => {
      const groups = svg.querySelectorAll("g");
      expect(groups.length).toBeGreaterThanOrEqual(2);
    });

    test("should use provided container group", () => {
      const customGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      svg.appendChild(customGroup);
      const customRenderer = new DiagramSvgRenderer(svg, customGroup);

      expect(customRenderer).toBeDefined();
      const nestedGroups = customGroup.querySelectorAll("g");
      expect(nestedGroups.length).toBeGreaterThan(0);
    });
  });

  describe("render", () => {
    test("should clear existing content before rendering", () => {
      const root = newItem("root", "Root");
      root.elementBox = { x: 0, y: 0, width: 100, height: 50 };
      diagram.addRootElement(root);

      renderer.render(diagram);
      const initialCount = svg.querySelectorAll(".diagram-item").length;

      renderer.render(diagram);
      const afterSecondRender = svg.querySelectorAll(".diagram-item").length;

      expect(afterSecondRender).toBe(initialCount);
    });

    test("should remove viewBox attribute", () => {
      svg.setAttribute("viewBox", "0 0 100 100");
      const root = newItem("root", "Root");
      diagram.addRootElement(root);

      renderer.render(diagram);

      expect(svg.hasAttribute("viewBox")).toBe(false);
    });

    test("should render all root elements", () => {
      const root1 = newItem("root1", "Root1");
      const root2 = newItem("root2", "Root2");
      root1.elementBox = { x: 0, y: 0, width: 100, height: 50 };
      root2.elementBox = { x: 0, y: 60, width: 100, height: 50 };
      diagram.addRootElement(root1);
      diagram.addRootElement(root2);

      renderer.render(diagram);

      const items = svg.querySelectorAll(".diagram-item");
      expect(items.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("renderItem", () => {
    test.each([
      ["element", DiagramItemType.element, "rect"],
      ["group", DiagramItemType.group, "polygon"],
      ["type", DiagramItemType.type, "polygon"],
    ])("should render a %s item with its shape", (name, itemType, shape) => {
      const itemElement = renderRootItem(name, name, itemType);

      expect(itemElement?.classList.contains("diagram-item")).toBe(true);
      expect(itemElement?.querySelector(shape)).toBeTruthy();
    });

    test("should render group item with tooltip", () => {
      const itemElement = renderRootItem("grp", "Group", DiagramItemType.group, {
        elementBox: { x: 10, y: 10, width: 40, height: 20 },
      });

      expect(itemElement?.querySelector("title")?.textContent).toBe("Group");
    });

    test.each([true, false])("should render children only when showChildElements is true (%s)", (showChildElements) => {
      renderParentWithChild({ showChildElements });

      expect(svg.querySelector('[data-item-id="parent"]')).toBeTruthy();
      expect(svg.querySelector('[data-item-id="child"]') !== null).toBe(showChildElements);
    });

    test("should render expand button when item has children", () => {
      renderParentWithChild({ childExpandButtonBox: { x: 110, y: 20, width: 12, height: 12 } });

      expect(svg.querySelector('[data-item-id="parent"] .expand-button')).toBeTruthy();
    });
  });

  describe("reference arrow", () => {
    /** A sequence with an element reference, a local element and a group reference. */
    const REFERENCES = `<xs:complexType name="T"><xs:sequence><xs:element ref="person"/><xs:element name="x"/><xs:group ref="G"/></xs:sequence></xs:complexType>`;

    test.each([
      ["a group reference", "groupRef:G[0]", DiagramItemType.group, 1],
      ["an element reference", "element:unnamed[0]", DiagramItemType.element, 1],
      ["a local element", "element:x[1]", DiagramItemType.element, 0],
    ])("should draw the arrow only for references: %s", (_case, path, itemType, arrowCount) => {
      const { schemaObject } = diagramItem(webviewSchemaWith(REFERENCES), `/complexType:T/group:sequence[0]/${path}`);

      const itemElement = renderRootItem("reference", "reference", itemType, { schemaObject });

      expect(itemElement?.querySelectorAll(".reference-arrow")).toHaveLength(arrowCount);
    });
  });

  describe("text rendering", () => {
    test.each([
      ["item text", false, {}],
      [
        "documentation when showDocumentation is true",
        true,
        { schemaObject: documented("Test documentation"), documentationBox: { x: 10, y: 70, width: 200, height: 60 } },
      ],
    ])("should render %s", (_case, showDocumentation, properties) => {
      diagram.showDocumentation = showDocumentation;

      const itemElement = renderRootItem("elem", "TestElement", DiagramItemType.element, properties);

      expect(itemElement?.querySelectorAll("text").length).toBeGreaterThan(0);
    });

    test("should render the occurrence text when it is not 1..1", () => {
      const { schemaObject } = localElementWith('minOccurs="0" maxOccurs="unbounded"');

      const itemElement = renderRootItem("elem", "TestElement", DiagramItemType.element, { schemaObject });

      expect(Array.from(itemElement?.querySelectorAll("text") ?? [], (text) => text.textContent)).toContain("0..∞");
    });

    test("should render text for top-level named groups", () => {
      const id = generateSchemaId({ nodeType: SchemaNodeType.Group, name: "PersonGroup" });

      const itemElement = renderRootItem(id, "PersonGroup", DiagramItemType.group, {
        elementBox: { x: 10, y: 10, width: 120, height: 40 },
      });

      expect(itemElement?.querySelector("text")?.textContent).toContain("PersonGroup");
    });

    test("should not render text for compositor groups", () => {
      const id = generateSchemaId({
        nodeType: SchemaNodeType.Group,
        name: "sequence",
        parentId: "/complexType:PersonType",
        position: 0,
      });

      const { schemaObject } = diagramItem(
        webviewSchemaWith(`<xs:complexType name="PersonType"><xs:sequence/></xs:complexType>`),
        id
      );

      const itemElement = renderRootItem(id, "sequence", DiagramItemType.group, {
        schemaObject,
        elementBox: { x: 10, y: 10, width: 40, height: 20 },
      });

      expect(itemElement?.querySelectorAll("text")).toHaveLength(0);
    });
  });
});
