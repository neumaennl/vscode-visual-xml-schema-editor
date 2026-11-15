/**
 * Integration tests of the properties panel for the XML tab: they display items in a whole `PropertiesPanel`.
 */

import { PropertiesPanel } from "../propertiesPanel/propertiesPanel";
import { buildXmlPreview } from "../propertiesPanel/propertiesPanelXmlPreview";
import { findButton } from "./propertiesPanelTestHelpers";
import { diagramItem, muteDiagramBuilderLog } from "./diagramTestHelpers";
import { schemaWith } from "../../shared/__tests__/schemaTestHelpers";

describe("PropertiesPanel: the XML tab", () => {
  muteDiagramBuilderLog();

  test("should show the XSD fragment of the selected node", () => {
    const container = document.createElement("div");
    const item = diagramItem(schemaWith('<xs:element name="code" type="xs:string" default="A"/>'), "/element:code");

    new PropertiesPanel(container).display(item);
    findButton(container, "XML")?.click();

    expect(container.querySelector("pre")?.textContent).toBe(buildXmlPreview(item));
  });
});
