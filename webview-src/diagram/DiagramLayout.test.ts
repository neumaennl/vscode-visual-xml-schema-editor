/**
 * Tests for `DiagramLayout` class
 */

import { DiagramLayout } from "./DiagramLayout";
import { Diagram } from "./Diagram";
import { createCompositorItem, DiagramItem } from "./DiagramItem";
import { explicitGroup } from "../../shared/types";
import { DiagramItemType } from "./DiagramTypes";
import { schema } from "../../shared/types";
import { documented, NOT_READ_SCHEMA_OBJECT } from "../__tests__/diagramTestHelpers";

describe("DiagramLayout", () => {
  let layout: DiagramLayout;
  let diagram: Diagram;

  beforeEach(() => {
    layout = new DiagramLayout();
    diagram = new Diagram(new schema());
  });

  /**
   * Adds a root item to the diagram and lays out the diagram.
   *
   * @param id - The ID of the item
   * @param itemType - The kind of the item
   * @param properties - Further properties of the item
   * @returns The item
   */
  function layoutRootItem(id: string, itemType: DiagramItemType, properties: Partial<DiagramItem> = {}): DiagramItem {
    const item =
      itemType === DiagramItemType.compositor
        ? createCompositorItem(id, "sequence", new explicitGroup(), diagram)
        : new DiagramItem(id, id, itemType, NOT_READ_SCHEMA_OBJECT, diagram);
    Object.assign(item, properties);
    diagram.addRootElement(item);
    layout.layout(diagram);
    return item;
  }

  /**
   * Adds a root item `parent` with children to the diagram and lays out the diagram.
   *
   * @param showChildElements - Whether the parent shows its children
   * @param childCount - The number of children
   * @returns The parent and its children
   */
  function layoutParentWithChildren(
    showChildElements: boolean,
    childCount = 1
  ): { parent: DiagramItem; children: DiagramItem[] } {
    const parent = new DiagramItem("parent", "Parent", DiagramItemType.element, NOT_READ_SCHEMA_OBJECT, diagram);
    const children = Array.from(
      { length: childCount },
      (_, i) => new DiagramItem(`child${i}`, `Child${i}`, DiagramItemType.element, NOT_READ_SCHEMA_OBJECT, diagram)
    );
    children.forEach((child) => {
      parent.addChild(child);
    });
    parent.showChildElements = showChildElements;
    diagram.addRootElement(parent);
    layout.layout(diagram);
    return { parent, children };
  }

  describe("layout", () => {
    test("should layout diagram with single root element", () => {
      const root = new DiagramItem("root", "Root", DiagramItemType.element, NOT_READ_SCHEMA_OBJECT, diagram);
      diagram.addRootElement(root);

      layout.layout(diagram);

      expect(root.location).toEqual({ x: 0, y: 0 });
      expect(root.size.width).toBeGreaterThan(0);
      expect(root.size.height).toBeGreaterThan(0);
      expect(root.elementBox).toBeDefined();
    });

    test("should layout multiple root elements vertically", () => {
      const root1 = new DiagramItem("root1", "Root1", DiagramItemType.element, NOT_READ_SCHEMA_OBJECT, diagram);
      const root2 = new DiagramItem("root2", "Root2", DiagramItemType.element, NOT_READ_SCHEMA_OBJECT, diagram);
      diagram.addRootElement(root1);
      diagram.addRootElement(root2);

      layout.layout(diagram);

      expect(root1.location.y).toBe(0);
      expect(root2.location.y).toBeGreaterThan(root1.location.y);
    });

    test("should calculate overall bounding box", () => {
      const root = new DiagramItem("root", "Root", DiagramItemType.element, NOT_READ_SCHEMA_OBJECT, diagram);
      diagram.addRootElement(root);

      layout.layout(diagram);

      expect(diagram.boundingBox.width).toBeGreaterThan(0);
      expect(diagram.boundingBox.height).toBeGreaterThan(0);
    });
  });

  describe("item sizing", () => {
    test.each<[string, string, DiagramItemType, Partial<DiagramItem>, object]>([
      ["element", "elem", DiagramItemType.element, {}, { width: 120, height: 40 }], // ELEMENT_WIDTH, ELEMENT_HEIGHT
      ["type", "type", DiagramItemType.type, {}, { width: 120, height: 40 }],
      // GROUP_WIDTH, GROUP_HEIGHT
      ["compositor", "/complexType:T/sequence[0]", DiagramItemType.compositor, {}, { width: 40, height: 20 }],
    ])("should size %s items correctly", (_case, id, itemType, properties, size) => {
      expect(layoutRootItem(id, itemType, properties).size).toMatchObject(size);
    });
  });

  describe("expand button", () => {
    test("should add expand button when item has children", () => {
      const { parent } = layoutParentWithChildren(false);

      expect(parent.childExpandButtonBox).toMatchObject({ width: 12, height: 12 });
    });

    test("should not add expand button when item has no children", () => {
      const item = layoutRootItem("item", DiagramItemType.element);

      // When no children, expand button should have zero size
      expect(item.childExpandButtonBox).toMatchObject({ width: 0, height: 0 });
    });
  });

  describe("children layout", () => {
    test("should layout children when expanded", () => {
      const { parent, children } = layoutParentWithChildren(true);

      expect(children[0]!.location.x).toBeGreaterThan(parent.location.x);
      expect(children[0]!.size.width).toBeGreaterThan(0);
    });

    test("should not layout children when collapsed", () => {
      const { children } = layoutParentWithChildren(false);

      // Child should have default location
      expect(children[0]!.location).toEqual({ x: 0, y: 0 });
    });

    test("should layout multiple children vertically", () => {
      const { children } = layoutParentWithChildren(true, 2);

      expect(children[1]!.location.y).toBeGreaterThan(children[0]!.location.y);
    });
  });

  describe("documentation box", () => {
    test("should add documentation box when showDocumentation is true", () => {
      diagram.showDocumentation = true;

      const item = layoutRootItem("item", DiagramItemType.element, { schemaObject: documented("Test documentation") });

      expect(item.documentationBox.width).toBeGreaterThan(0);
    });

    test.each([
      ["showDocumentation is false", false, "Test documentation"],
      ["documentation is empty", true, ""],
    ])("should not add documentation box when %s", (_case, showDocumentation, documentation) => {
      diagram.showDocumentation = showDocumentation;

      const item = layoutRootItem("item", DiagramItemType.element, { schemaObject: documented(documentation) });

      expect(item.documentationBox).toMatchObject({ width: 0, height: 0 });
    });
  });

  describe("bounding box calculation", () => {
    test("should calculate bounding box for item", () => {
      const item = layoutRootItem("item", DiagramItemType.element);

      expect(item.boundingBox.width).toBeGreaterThan(0);
      expect(item.boundingBox.height).toBeGreaterThan(0);
    });

    test("should include children in bounding box when expanded", () => {
      const { parent } = layoutParentWithChildren(true);

      expect(parent.boundingBox.width).toBeGreaterThan(parent.size.width);
    });
  });
});
