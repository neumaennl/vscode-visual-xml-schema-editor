/**
 * Unit tests for `TypeNodeCreators` module.
 */

import { emptyDiagram } from "../__tests__/diagramTestHelpers";
import { createTopLevelNode } from "./TypeNodeCreators";
import { getDocumentation } from "./documentationAccessors";
import type { Diagram } from "./Diagram";
import { DiagramItemType } from "./DiagramTypes";
import { annotationType, documentationType } from "../../shared/types";
import type { namedGroup } from "../../shared/types";
import { SchemaNodeType } from "../../shared/idStrategy";

describe("TypeNodeCreators", () => {
  let diagram: Diagram;

  beforeEach(() => {
    diagram = emptyDiagram();
  });

  describe("createTopLevelNode", () => {
    test("should return null for a component without name", () => {
      expect(createTopLevelNode({} as namedGroup, SchemaNodeType.Group, DiagramItemType.group, diagram)).toBeNull();
    });

    test("should create the item with its ID, name, schema object and documentation", () => {
      const annotation = new annotationType();
      annotation.documentation = [Object.assign(new documentationType(), { value: "About G" })];
      const group = { name: "G", annotation };
      const item = createTopLevelNode(group, SchemaNodeType.Group, DiagramItemType.group, diagram);
      expect(item?.id).toBe("/group:G");
      expect(item?.schemaObject).toBe(group);
      expect(item?.label).toBe("G");
      expect(item?.itemType).toBe(DiagramItemType.group);
      expect(item?.diagram).toBe(diagram);
      expect(getDocumentation(item!)).toBe("About G");
    });
  });
});
