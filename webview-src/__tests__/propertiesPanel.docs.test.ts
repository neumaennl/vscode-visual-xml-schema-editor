/**
 * Integration tests of the properties panel for the Docs tab: they display items in a whole `PropertiesPanel`.
 * The tab itself is tested in `propertiesPanelDocs.test.ts`; these tests check that the panel shows it
 * for the selected node, passes its commands on and renders it again after a change.
 */

import { findButton, displayItem } from "./propertiesPanelTestHelpers";
import { diagramItem, muteDiagramBuilderLog } from "./diagramTestHelpers";
import { webviewSchemaWith } from "../../shared/__tests__/schemaTestHelpers";

/** An element with documentation and one without. */
const ELEMENTS = `<xs:element name="person"><xs:annotation><xs:documentation>Person doc</xs:documentation></xs:annotation></xs:element>
<xs:element name="plain" type="xs:string"/>`;

describe("PropertiesPanel: the Docs tab", () => {
  muteDiagramBuilderLog();

  test("should show the documentation of the selected node and send its changes", () => {
    const container = document.createElement("div");
    const { dispatch } = displayItem(container, diagramItem(webviewSchemaWith(ELEMENTS), "/element:person"), "Docs");
    const textArea = container.querySelector("textarea")!;

    expect(textArea.value).toBe("Person doc");
    textArea.value = "Updated docs";
    textArea.dispatchEvent(new FocusEvent("blur"));

    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      type: "modifyDocumentation",
      payload: { documentationId: "/element:person/documentation[0]", content: "Updated docs" },
    });
  });

  test("should show added documentation at once", () => {
    const container = document.createElement("div");
    displayItem(container, diagramItem(webviewSchemaWith(ELEMENTS), "/element:plain"), "Docs");

    findButton(container, "Add documentation")?.click();

    expect(container.querySelector("textarea")?.value).toBe("New documentation");
  });
});
