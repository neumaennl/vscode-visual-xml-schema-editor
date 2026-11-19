/**
 * Unit tests of `draggedSchemaConstruct`.
 */

import { getDraggedSchemaConstruct, setDraggedSchemaConstruct } from "./draggedSchemaConstruct";
import { DraggableSchemaConstruct } from "./DraggableSchemaConstruct";

describe("draggedSchemaConstruct", () => {
  afterEach(() => {
    setDraggedSchemaConstruct(null);
  });

  test("should return null when nothing is dragged", () => {
    expect(getDraggedSchemaConstruct()).toBeNull();
  });

  test("should return the schema construct of the current drag until the drag ends", () => {
    setDraggedSchemaConstruct(DraggableSchemaConstruct.Element);
    expect(getDraggedSchemaConstruct()).toBe(DraggableSchemaConstruct.Element);

    setDraggedSchemaConstruct(null);
    expect(getDraggedSchemaConstruct()).toBeNull();
  });
});
