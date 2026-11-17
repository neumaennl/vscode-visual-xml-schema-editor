/**
 * Integration tests of the properties panel for the namespace fields of the schema: they display items in a whole `PropertiesPanel`.
 * The fields are tested in `propertiesPanelSchemaNamespaces.test.ts`; this test checks that the panel
 * shows them for the schema, passes their commands on and shows the changed namespaces.
 */

import { getInputByLabel, displayItem, editInput } from "./propertiesPanelTestHelpers";
import { diagramItem, muteDiagramBuilderLog } from "./diagramTestHelpers";
import { unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../../shared/types";

describe("PropertiesPanel: the namespace fields of the schema", () => {
  muteDiagramBuilderLog();

  test("should edit the target namespace of the schema and show its changed declaration", () => {
    const container = document.createElement("div");
    const schemaObj = unmarshal(
      schema,
      '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:tns="urn:original" targetNamespace="urn:original"/>'
    );
    const { dispatch } = displayItem(container, diagramItem(schemaObj, "/schema"));

    editInput(container, "targetNamespace", "urn:updated");

    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      type: "modifySchemaNamespaces",
      payload: {
        targetNamespace: "urn:updated",
        namespacePrefixes: { tns: "urn:updated", xs: "http://www.w3.org/2001/XMLSchema" },
        previousNamespacePrefixes: { tns: "urn:original", xs: "http://www.w3.org/2001/XMLSchema" },
      },
    });
    expect(getInputByLabel(container, "targetNamespace").value).toBe("urn:updated");
    expect(
      Array.from(
        container.querySelectorAll(".property-namespace-row input"),
        (input) => (input as HTMLInputElement).value
      )
    ).toContain("urn:updated");
  });
});
