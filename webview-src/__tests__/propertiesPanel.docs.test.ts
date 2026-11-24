/**
 * Integration tests of the properties panel for the Docs tab: they display items in a whole `PropertiesPanel`.
 * The tab itself is tested in `propertiesPanelDocs.test.ts`; these tests check that the panel shows it
 * for the selected node, passes its commands on and shows a change with the next schema.
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

  test("should send added documentation and show it with the schema that the extension host sends next", () => {
    const container = document.createElement("div");
    const { panel, dispatch } = displayItem(
      container,
      diagramItem(webviewSchemaWith(ELEMENTS), "/element:plain"),
      "Docs"
    );

    findButton(container, "Add documentation")?.click();

    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      type: "addDocumentation",
      payload: { targetId: "/element:plain", content: "New documentation" },
    });
    expect(container.querySelector("textarea")).toBeNull();

    // The webview displays the selected node again when the new schema arrives
    const changed = ELEMENTS.replace(
      `<xs:element name="plain" type="xs:string"/>`,
      `<xs:element name="plain" type="xs:string"><xs:annotation><xs:documentation>New documentation</xs:documentation></xs:annotation></xs:element>`
    );
    panel.display(diagramItem(webviewSchemaWith(changed), "/element:plain"));

    expect(container.querySelector("textarea")?.value).toBe("New documentation");
  });
});
