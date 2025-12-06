/**
 * Tests for DiagramLayout class
 */

import { DiagramLayout } from "./DiagramLayout";
import { Diagram } from "./Diagram";
import { DiagramItem } from "./DiagramItem";
import { DiagramItemType } from "./DiagramTypes";

describe("DiagramLayout", () => {
  let layout: DiagramLayout;
  let diagram: Diagram;

  beforeEach(() => {
    layout = new DiagramLayout();
    diagram = new Diagram();
  });

  describe("layout", () => {
    it("should layout diagram with single root element", () => {
      const root = new DiagramItem("root", "Root", DiagramItemType.element, diagram);
      diagram.addRootElement(root);

      layout.layout(diagram);

      expect(root.location).toEqual({ x: 0, y: 0 });
      expect(root.size.width).toBeGreaterThan(0);
      expect(root.size.height).toBeGreaterThan(0);
      expect(root.elementBox).toBeDefined();
    });

    it("should layout multiple root elements vertically", () => {
      const root1 = new DiagramItem("root1", "Root1", DiagramItemType.element, diagram);
      const root2 = new DiagramItem("root2", "Root2", DiagramItemType.element, diagram);
      diagram.addRootElement(root1);
      diagram.addRootElement(root2);

      layout.layout(diagram);

      expect(root1.location.y).toBe(0);
      expect(root2.location.y).toBeGreaterThan(root1.location.y);
    });

    it("should calculate overall bounding box", () => {
      const root = new DiagramItem("root", "Root", DiagramItemType.element, diagram);
      diagram.addRootElement(root);

      layout.layout(diagram);

      expect(diagram.boundingBox.width).toBeGreaterThan(0);
      expect(diagram.boundingBox.height).toBeGreaterThan(0);
    });
  });

  describe("item sizing", () => {
    it("should size element items correctly", () => {
      const item = new DiagramItem("elem", "Element", DiagramItemType.element, diagram);
      diagram.addRootElement(item);

      layout.layout(diagram);

      expect(item.size.width).toBe(120); // ELEMENT_WIDTH
      expect(item.size.height).toBe(40); // ELEMENT_HEIGHT
    });

    it("should size type items correctly", () => {
      const item = new DiagramItem("type", "Type", DiagramItemType.type, diagram);
      diagram.addRootElement(item);

      layout.layout(diagram);

      expect(item.size.width).toBe(120);
      expect(item.size.height).toBe(40);
    });

    it("should size group items correctly", () => {
      const item = new DiagramItem("group", "Group", DiagramItemType.group, diagram);
      diagram.addRootElement(item);

      layout.layout(diagram);

      expect(item.size.width).toBe(40); // GROUP_WIDTH
      expect(item.size.height).toBe(20); // GROUP_HEIGHT
    });

    it("should size reference items correctly", () => {
      const item = new DiagramItem("ref", "Reference", DiagramItemType.reference, diagram);
      diagram.addRootElement(item);

      layout.layout(diagram);

      expect(item.size.width).toBe(120);
      expect(item.size.height).toBe(40);
    });
  });

  describe("expand button", () => {
    it("should add expand button when item has children", () => {
      const parent = new DiagramItem("parent", "Parent", DiagramItemType.element, diagram);
      const child = new DiagramItem("child", "Child", DiagramItemType.element, diagram);
      parent.addChild(child);
      diagram.addRootElement(parent);

      layout.layout(diagram);

      expect(parent.childExpandButtonBox).toBeDefined();
      expect(parent.childExpandButtonBox?.width).toBe(12);
      expect(parent.childExpandButtonBox?.height).toBe(12);
    });

    it("should not add expand button when item has no children", () => {
      const item = new DiagramItem("item", "Item", DiagramItemType.element, diagram);
      diagram.addRootElement(item);

      layout.layout(diagram);

      // When no children, expand button should have zero size
      expect(item.childExpandButtonBox.width).toBe(0);
      expect(item.childExpandButtonBox.height).toBe(0);
    });
  });

  describe("children layout", () => {
    it("should layout children when expanded", () => {
      const parent = new DiagramItem("parent", "Parent", DiagramItemType.element, diagram);
      const child = new DiagramItem("child", "Child", DiagramItemType.element, diagram);
      parent.addChild(child);
      parent.showChildElements = true;
      diagram.addRootElement(parent);

      layout.layout(diagram);

      expect(child.location.x).toBeGreaterThan(parent.location.x);
      expect(child.size.width).toBeGreaterThan(0);
    });

    it("should not layout children when collapsed", () => {
      const parent = new DiagramItem("parent", "Parent", DiagramItemType.element, diagram);
      const child = new DiagramItem("child", "Child", DiagramItemType.element, diagram);
      parent.addChild(child);
      parent.showChildElements = false;
      diagram.addRootElement(parent);

      layout.layout(diagram);

      // Child should have default location
      expect(child.location).toEqual({ x: 0, y: 0 });
    });

    it("should layout multiple children vertically", () => {
      const parent = new DiagramItem("parent", "Parent", DiagramItemType.element, diagram);
      const child1 = new DiagramItem("child1", "Child1", DiagramItemType.element, diagram);
      const child2 = new DiagramItem("child2", "Child2", DiagramItemType.element, diagram);
      parent.addChild(child1);
      parent.addChild(child2);
      parent.showChildElements = true;
      diagram.addRootElement(parent);

      layout.layout(diagram);

      expect(child2.location.y).toBeGreaterThan(child1.location.y);
    });
  });

  describe("documentation box", () => {
    it("should add documentation box when showDocumentation is true", () => {
      diagram.showDocumentation = true;
      const item = new DiagramItem("item", "Item", DiagramItemType.element, diagram);
      item.documentation = "Test documentation";
      diagram.addRootElement(item);

      layout.layout(diagram);

      expect(item.documentationBox).toBeDefined();
      expect(item.documentationBox?.width).toBeGreaterThan(0);
    });

    it("should not add documentation box when showDocumentation is false", () => {
      diagram.showDocumentation = false;
      const item = new DiagramItem("item", "Item", DiagramItemType.element, diagram);
      item.documentation = "Test documentation";
      diagram.addRootElement(item);

      layout.layout(diagram);

      // When not showing documentation, box should have zero size
      expect(item.documentationBox.width).toBe(0);
      expect(item.documentationBox.height).toBe(0);
    });

    it("should not add documentation box when documentation is empty", () => {
      diagram.showDocumentation = true;
      const item = new DiagramItem("item", "Item", DiagramItemType.element, diagram);
      item.documentation = "";
      diagram.addRootElement(item);

      layout.layout(diagram);

      // When documentation is empty, box should have zero size
      expect(item.documentationBox.width).toBe(0);
      expect(item.documentationBox.height).toBe(0);
    });
  });

  describe("bounding box calculation", () => {
    it("should calculate bounding box for item", () => {
      const item = new DiagramItem("item", "Item", DiagramItemType.element, diagram);
      diagram.addRootElement(item);

      layout.layout(diagram);

      expect(item.boundingBox).toBeDefined();
      expect(item.boundingBox.width).toBeGreaterThan(0);
      expect(item.boundingBox.height).toBeGreaterThan(0);
    });

    it("should include children in bounding box when expanded", () => {
      const parent = new DiagramItem("parent", "Parent", DiagramItemType.element, diagram);
      const child = new DiagramItem("child", "Child", DiagramItemType.element, diagram);
      parent.addChild(child);
      parent.showChildElements = true;
      diagram.addRootElement(parent);

      layout.layout(diagram);

      expect(parent.boundingBox.width).toBeGreaterThan(parent.size.width);
    });
  });
});
