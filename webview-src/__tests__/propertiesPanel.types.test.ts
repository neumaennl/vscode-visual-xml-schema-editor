/**
 * Integration tests of the properties panel for the type fields: they display items in a whole `PropertiesPanel`.
 * The fields are tested in `propertiesPanelTypes.test.ts`; these tests check what the panel adds: the
 * types it suggests and what it sends after a stale item is displayed again.
 */

import { getInputByLabel, displayItem, editInput } from "./propertiesPanelTestHelpers";
import { diagramItem, muteDiagramBuilderLog } from "./diagramTestHelpers";
import { unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../../shared/types";
import { schemaWith } from "../../shared/__tests__/schemaTestHelpers";

describe("PropertiesPanel: the type fields", () => {
  muteDiagramBuilderLog();

  test("should suggest the built-in types and the types of the schema, with and without its prefix", () => {
    const container = document.createElement("div");
    const schemaObj = unmarshal(
      schema,
      `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:tns="urn:test" targetNamespace="urn:test">
  <xs:complexType name="CustomerType"/>
  <xs:element name="customer" type="xs:string"/>
</xs:schema>`
    );
    displayItem(container, diagramItem(schemaObj, "/element:customer"));

    const input = getInputByLabel(container, "Type");
    const options = Array.from(container.querySelectorAll(`datalist#${input.getAttribute("list")!} option`), (option) => (option as HTMLOptionElement).value);
    expect(options).toEqual(expect.arrayContaining(["xs:string", "CustomerType", "tns:CustomerType"]));
  });

  test("should not send a second command when the base type is left unchanged after a stale item is displayed again", () => {
    const container = document.createElement("div");
    const body = '<xs:simpleType name="lengthRestricitionType"><xs:restriction base="xs:string"/></xs:simpleType>';
    const id = "/simpleType:lengthRestricitionType";
    const { panel, dispatch } = displayItem(container, diagramItem(schemaWith(body), id));

    editInput(container, "Name", "lengthRestrictionType");
    // The diagram has not been rebuilt yet, so the panel gets the item with the old name again
    panel.display(diagramItem(schemaWith(body), id));
    editInput(container, "Base Type", "xs:string");

    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      type: "modifySimpleType",
      payload: { typeId: id, typeName: "lengthRestrictionType" },
    });
  });
});
