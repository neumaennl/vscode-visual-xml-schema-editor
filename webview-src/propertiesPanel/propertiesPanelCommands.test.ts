/**
 * Unit tests for the type helpers of `propertiesPanelCommands`.
 */

import { onTypeChange, resolveComplexTypeId, resolveSimpleTypeId } from "./propertiesPanelCommands";
import { Diagram, DiagramItem, DiagramItemType } from "../diagram";

/**
 * Creates a diagram item in a diagram whose schema has the target namespace prefix `tns`. The diagram
 * defines no types, so normalizing a type only trims it.
 *
 * @param id - The ID of the item
 * @param itemType - The type of the item
 * @returns The item
 */
function itemWithPrefix(id: string, itemType = DiagramItemType.element): DiagramItem {
  const diagram = new Diagram();
  diagram.currentSchemaPrefix = "tns";
  return new DiagramItem(id, "name", itemType, diagram);
}

describe("onTypeChange", () => {
  test("should apply a changed type with the normalized and the entered value", () => {
    const apply = vi.fn();
    onTypeChange(itemWithPrefix("/element:a"), "xs:string", apply)(" xs:int ");
    expect(apply).toHaveBeenCalledWith("xs:int", " xs:int ");
  });

  test("should ignore a type that only differs before normalization", () => {
    const apply = vi.fn();
    onTypeChange(itemWithPrefix("/element:a"), "xs:int", apply)("  xs:int ");
    expect(apply).not.toHaveBeenCalled();
  });

  test("should ignore an empty type unless it is allowed", () => {
    const apply = vi.fn();
    onTypeChange(itemWithPrefix("/element:a"), "xs:string", apply)("  ");
    expect(apply).not.toHaveBeenCalled();
    onTypeChange(itemWithPrefix("/element:a"), "xs:string", apply, true)("  ");
    expect(apply).toHaveBeenCalledWith("", "  ");
  });
});

describe("resolveSimpleTypeId and resolveComplexTypeId", () => {
  test("should return the ID of a type node", () => {
    expect(resolveSimpleTypeId(itemWithPrefix("/simpleType:S", DiagramItemType.type))).toBe("/simpleType:S");
    expect(resolveComplexTypeId(itemWithPrefix("/complexType:T", DiagramItemType.type))).toBe("/complexType:T");
  });

  test("should return the ID of the anonymous type of an element that has one", () => {
    const element = itemWithPrefix("/element:a");
    element.isSimpleContent = true;
    expect(resolveSimpleTypeId(element)).toBe("/element:a/anonymousSimpleType[0]");
    expect(resolveComplexTypeId(element)).toBeNull();
    element.hasAnonymousComplexType = true;
    expect(resolveComplexTypeId(element)).toBe("/element:a/anonymousComplexType[0]");
  });
});
