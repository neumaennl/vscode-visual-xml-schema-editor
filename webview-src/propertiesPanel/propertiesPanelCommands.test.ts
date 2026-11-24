/**
 * Unit tests for the commands of `propertiesPanelCommands`.
 */

import { createComplexBaseTypeCommand } from "./propertiesPanelCommands";
import { DiagramItemType } from "../diagram";
import { itemWithPrefix } from "../__tests__/propertiesPanelTestHelpers";
import { SchemaNodeType } from "../../shared/idStrategy";
import { webviewSchemaWith } from "../../shared/__tests__/schemaTestHelpers";

describe("createComplexBaseTypeCommand", () => {
  test("should change the base type of a complex type node", () => {
    const command = createComplexBaseTypeCommand(itemWithPrefix("/complexType:T", DiagramItemType.type), "B");
    expect(command).toMatchObject({ type: "modifyComplexType", payload: { typeId: "/complexType:T", baseType: "B" } });
  });

  test("should change the base type of the anonymous complex type of an element that has one", () => {
    const element = itemWithPrefix("/element:a");
    element.nodeType = SchemaNodeType.Element;
    element.schemaObject = webviewSchemaWith(`<xs:element name="a"><xs:simpleType/></xs:element>`).element![0]!;
    expect(createComplexBaseTypeCommand(element, "B")).toBeNull();
    element.schemaObject = webviewSchemaWith(`<xs:element name="a"><xs:complexType/></xs:element>`).element![0]!;
    expect(createComplexBaseTypeCommand(element, "B")).toMatchObject({
      payload: { typeId: "/element:a/anonymousComplexType[0]" },
    });
  });
});
