/**
 * Tests for DiagramSvgRenderer class
 */

import { DiagramSvgRenderer } from "./DiagramSvgRenderer";
import { Diagram } from "./Diagram";
import { DiagramItem } from "./DiagramItem";
import { DiagramItemType } from "./DiagramTypes";
import { setupGetBBoxMock } from "../testUtils/svgTestUtils";

describe("DiagramSvgRenderer", () => {
  let svg: SVGSVGElement;
  let renderer: DiagramSvgRenderer;
  let diagram: Diagram;

  beforeEach(() => {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    document.body.appendChild(svg);
    renderer = new DiagramSvgRenderer(svg);
    diagram = new Diagram();

    // Mock getBBox for SVG text elements (not supported in jsdom)
    setupGetBBoxMock();
  });

  afterEach(() => {
    document.body.removeChild(svg);
  });

  describe("constructor", () => {
    it("should create renderer with SVG element", () => {
      expect(renderer).toBeDefined();
      expect(svg.querySelector("g")).toBeTruthy();
    });

    it("should create nested group structure", () => {
      const groups = svg.querySelectorAll("g");
      expect(groups.length).toBeGreaterThanOrEqual(2);
    });

    it("should use provided container group", () => {
      const customGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      svg.appendChild(customGroup);
      const customRenderer = new DiagramSvgRenderer(svg, customGroup);
      
      expect(customRenderer).toBeDefined();
      const nestedGroups = customGroup.querySelectorAll("g");
      expect(nestedGroups.length).toBeGreaterThan(0);
    });
  });

  describe("render", () => {
    it("should clear existing content before rendering", () => {
      const root = new DiagramItem("root", "Root", DiagramItemType.element, diagram);
      root.elementBox = { x: 0, y: 0, width: 100, height: 50 };
      diagram.addRootElement(root);

      renderer.render(diagram);
      const initialCount = svg.querySelectorAll(".diagram-item").length;

      renderer.render(diagram);
      const afterSecondRender = svg.querySelectorAll(".diagram-item").length;

      expect(afterSecondRender).toBe(initialCount);
    });

    it("should remove viewBox attribute", () => {
      svg.setAttribute("viewBox", "0 0 100 100");
      const root = new DiagramItem("root", "Root", DiagramItemType.element, diagram);
      diagram.addRootElement(root);

      renderer.render(diagram);

      expect(svg.hasAttribute("viewBox")).toBe(false);
    });

    it("should render all root elements", () => {
      const root1 = new DiagramItem("root1", "Root1", DiagramItemType.element, diagram);
      const root2 = new DiagramItem("root2", "Root2", DiagramItemType.element, diagram);
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
    it("should render element item", () => {
      const item = new DiagramItem("elem", "Element", DiagramItemType.element, diagram);
      item.elementBox = { x: 10, y: 10, width: 100, height: 50 };
      diagram.addRootElement(item);

      renderer.render(diagram);

      const itemElement = svg.querySelector('[data-item-id="elem"]');
      expect(itemElement).toBeTruthy();
      expect(itemElement?.classList.contains("diagram-item")).toBe(true);
    });

    it("should render group item with tooltip", () => {
      const item = new DiagramItem("grp", "Group", DiagramItemType.group, diagram);
      item.elementBox = { x: 10, y: 10, width: 40, height: 20 };
      diagram.addRootElement(item);

      renderer.render(diagram);

      const itemElement = svg.querySelector('[data-item-id="grp"]');
      const title = itemElement?.querySelector("title");
      expect(title).toBeTruthy();
      expect(title?.textContent).toBe("Group");
    });

    it("should render type item", () => {
      const item = new DiagramItem("type", "Type", DiagramItemType.type, diagram);
      item.elementBox = { x: 10, y: 10, width: 100, height: 50 };
      diagram.addRootElement(item);

      renderer.render(diagram);

      const itemElement = svg.querySelector('[data-item-id="type"]');
      expect(itemElement).toBeTruthy();
    });

    it("should render children when showChildElements is true", () => {
      const parent = new DiagramItem("parent", "Parent", DiagramItemType.element, diagram);
      const child = new DiagramItem("child", "Child", DiagramItemType.element, diagram);
      parent.elementBox = { x: 0, y: 0, width: 100, height: 50 };
      child.elementBox = { x: 150, y: 0, width: 100, height: 50 };
      parent.addChild(child);
      parent.showChildElements = true;
      diagram.addRootElement(parent);

      renderer.render(diagram);

      const parentElement = svg.querySelector('[data-item-id="parent"]');
      const childElement = svg.querySelector('[data-item-id="child"]');
      expect(parentElement).toBeTruthy();
      expect(childElement).toBeTruthy();
    });

    it("should not render children when showChildElements is false", () => {
      const parent = new DiagramItem("parent", "Parent", DiagramItemType.element, diagram);
      const child = new DiagramItem("child", "Child", DiagramItemType.element, diagram);
      parent.elementBox = { x: 0, y: 0, width: 100, height: 50 };
      child.elementBox = { x: 150, y: 0, width: 100, height: 50 };
      parent.addChild(child);
      parent.showChildElements = false;
      diagram.addRootElement(parent);

      renderer.render(diagram);

      const parentElement = svg.querySelector('[data-item-id="parent"]');
      const childElement = svg.querySelector('[data-item-id="child"]');
      expect(parentElement).toBeTruthy();
      expect(childElement).toBeFalsy();
    });

    it("should render expand button when item has children", () => {
      const parent = new DiagramItem("parent", "Parent", DiagramItemType.element, diagram);
      const child = new DiagramItem("child", "Child", DiagramItemType.element, diagram);
      parent.elementBox = { x: 0, y: 0, width: 100, height: 50 };
      parent.childExpandButtonBox = { x: 110, y: 20, width: 12, height: 12 };
      parent.addChild(child);
      diagram.addRootElement(parent);

      renderer.render(diagram);

      const expandButton = svg.querySelector('[data-item-id="parent"] .expand-button');
      expect(expandButton).toBeTruthy();
    });
  });

  describe("item shapes", () => {
    it("should render element with rectangle shape", () => {
      const item = new DiagramItem("elem", "Element", DiagramItemType.element, diagram);
      item.elementBox = { x: 10, y: 10, width: 100, height: 50 };
      diagram.addRootElement(item);

      renderer.render(diagram);

      const rect = svg.querySelector('[data-item-id="elem"] rect');
      expect(rect).toBeTruthy();
    });

    it("should render group with octagon shape", () => {
      const item = new DiagramItem("grp", "Group", DiagramItemType.group, diagram);
      item.elementBox = { x: 10, y: 10, width: 40, height: 20 };
      diagram.addRootElement(item);

      renderer.render(diagram);

      const polygon = svg.querySelector('[data-item-id="grp"] polygon');
      expect(polygon).toBeTruthy();
    });

    it("should render type with beveled rectangle", () => {
      const item = new DiagramItem("type", "Type", DiagramItemType.type, diagram);
      item.elementBox = { x: 10, y: 10, width: 100, height: 50 };
      diagram.addRootElement(item);

      renderer.render(diagram);

      const polygon = svg.querySelector('[data-item-id="type"] polygon');
      expect(polygon).toBeTruthy();
    });
  });

  describe("text rendering", () => {
    it("should render item text", () => {
      const item = new DiagramItem("elem", "TestElement", DiagramItemType.element, diagram);
      item.elementBox = { x: 10, y: 10, width: 100, height: 50 };
      diagram.addRootElement(item);

      renderer.render(diagram);

      const text = svg.querySelector('[data-item-id="elem"] text');
      expect(text).toBeTruthy();
    });

    it("should render occurrence text when not default", () => {
      const item = new DiagramItem("elem", "Element", DiagramItemType.element, diagram);
      item.elementBox = { x: 10, y: 10, width: 100, height: 50 };
      item.minOccurrence = 0;
      item.maxOccurrence = -1; // unbounded
      diagram.addRootElement(item);

      renderer.render(diagram);

      const texts = svg.querySelectorAll('[data-item-id="elem"] text');
      expect(texts.length).toBeGreaterThan(0);
    });

    it("should render documentation when showDocumentation is true", () => {
      diagram.showDocumentation = true;
      const item = new DiagramItem("elem", "Element", DiagramItemType.element, diagram);
      item.elementBox = { x: 10, y: 10, width: 100, height: 50 };
      item.documentation = "Test documentation";
      item.documentationBox = { x: 10, y: 70, width: 200, height: 60 };
      diagram.addRootElement(item);

      renderer.render(diagram);

      const texts = svg.querySelectorAll('[data-item-id="elem"] text');
      expect(texts.length).toBeGreaterThan(0);
    });
  });
});
