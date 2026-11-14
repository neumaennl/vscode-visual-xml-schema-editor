/**
 * Unit tests for the namespace fields of the schema of the properties panel.
 */

import { DiagramItem } from "../diagram/DiagramItem";
import { DiagramItemType } from "../diagram/DiagramTypes";
import { SCHEMA_ROOT_ID } from "../../shared/idStrategy";
import { getInputByLabel, createPanel, displayItem, editInput } from "../__tests__/propertiesPanelTestHelpers";

/** The namespace declarations of the schema, whose prefix `tns` is the target namespace. */
const ORIGINAL_PREFIXES = { xs: "http://www.w3.org/2001/XMLSchema", tns: "http://example.com/original" };

/** The command that changes the target namespace and its declaration to `http://example.com/updated`. */
const UPDATE_TO_UPDATED_NAMESPACE = {
  type: "modifySchemaNamespaces",
  payload: {
    targetNamespace: "http://example.com/updated",
    namespacePrefixes: { ...ORIGINAL_PREFIXES, tns: "http://example.com/updated" },
    previousNamespacePrefixes: ORIGINAL_PREFIXES,
  },
};

describe("PropertiesPanel: the namespace fields of the schema", () => {
  let { container, panel, diagram } = createPanel();

  beforeEach(() => {
    ({ container, panel, diagram } = createPanel());
  });

  test("shows editable targetNamespace and namespace declarations for the schema node", () => {
    const schemaRoot = new DiagramItem(SCHEMA_ROOT_ID, "schema", DiagramItemType.group, diagram);
    diagram.schemaTargetNamespace = "http://example.com/original";
    diagram.schemaNamespacePrefixes = { ...ORIGINAL_PREFIXES };

    panel.display(schemaRoot);

    expect(getInputByLabel(container, "targetNamespace").value).toBe("http://example.com/original");
    expect(container.querySelectorAll(".property-namespace-row").length).toBe(2);
  });

  test("updates the matching namespace declaration when targetNamespace changes", () => {
    const schemaRoot = new DiagramItem(SCHEMA_ROOT_ID, "schema", DiagramItemType.group, diagram);
    diagram.schemaTargetNamespace = "http://example.com/original";
    diagram.schemaNamespacePrefixes = { ...ORIGINAL_PREFIXES };
    diagram.currentSchemaPrefix = "tns";

    const { dispatch } = displayItem(container, schemaRoot);

    editInput(container, "targetNamespace", "http://example.com/updated");

    expect(dispatch).toHaveBeenCalledWith(UPDATE_TO_UPDATED_NAMESPACE);
  });

  test("updates targetNamespace when the corresponding namespace declaration URI changes", () => {
    const schemaRoot = new DiagramItem(SCHEMA_ROOT_ID, "schema", DiagramItemType.group, diagram);
    diagram.schemaTargetNamespace = "http://example.com/original";
    diagram.schemaNamespacePrefixes = { ...ORIGINAL_PREFIXES };

    const { dispatch } = displayItem(container, schemaRoot);

    const targetNamespaceRow = Array.from(container.querySelectorAll(".property-namespace-row")).find(
      (row) => {
        const prefixInput = row.querySelector("input[placeholder='prefix']");
        return prefixInput instanceof HTMLInputElement && prefixInput.value === "tns";
      }
    );
    expect(targetNamespaceRow).toBeTruthy();
    const namespaceUriInput = targetNamespaceRow?.querySelector(
      "input[placeholder='namespace URI']"
    ) as HTMLInputElement;
    namespaceUriInput.value = "http://example.com/updated";
    namespaceUriInput.dispatchEvent(new Event("blur"));

    expect(dispatch).toHaveBeenCalledWith(UPDATE_TO_UPDATED_NAMESPACE);
  });
});
