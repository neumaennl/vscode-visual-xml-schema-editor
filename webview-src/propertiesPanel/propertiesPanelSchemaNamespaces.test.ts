/**
 * Unit tests for the namespace fields of the schema of the properties panel.
 */

import { PropertiesPanel } from "./propertiesPanel";
import { DiagramItem } from "../diagram/DiagramItem";
import { Diagram } from "../diagram/Diagram";
import { DiagramItemType } from "../diagram/DiagramTypes";
import { SCHEMA_ROOT_ID } from "../../shared/idStrategy";
import { getInputByLabel } from "../__tests__/propertiesPanelTestHelpers";

describe("PropertiesPanel: the namespace fields of the schema", () => {
  let container: HTMLDivElement;
  let panel: PropertiesPanel;
  let diagram: Diagram;

  beforeEach(() => {
    container = document.createElement("div");
    panel = new PropertiesPanel(container);
    diagram = new Diagram();
  });

  test("shows editable targetNamespace and namespace declarations for the schema node", () => {
    const schemaRoot = new DiagramItem(SCHEMA_ROOT_ID, "schema", DiagramItemType.group, diagram);
    diagram.schemaTargetNamespace = "http://example.com/original";
    diagram.schemaNamespacePrefixes = {
      xs: "http://www.w3.org/2001/XMLSchema",
      tns: "http://example.com/original",
    };

    panel.display(schemaRoot);

    expect(getInputByLabel(container, "targetNamespace").value).toBe("http://example.com/original");
    expect(container.querySelectorAll(".property-namespace-row").length).toBe(2);
  });

  test("updates the matching namespace declaration when targetNamespace changes", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
    const schemaRoot = new DiagramItem(SCHEMA_ROOT_ID, "schema", DiagramItemType.group, diagram);
    diagram.schemaTargetNamespace = "http://example.com/original";
    diagram.schemaNamespacePrefixes = {
      xs: "http://www.w3.org/2001/XMLSchema",
      tns: "http://example.com/original",
    };
    diagram.currentSchemaPrefix = "tns";

    panel.display(schemaRoot);

    const input = getInputByLabel(container, "targetNamespace");
    input.value = "http://example.com/updated";
    input.dispatchEvent(new Event("blur"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifySchemaNamespaces",
      payload: {
        targetNamespace: "http://example.com/updated",
        namespacePrefixes: {
          xs: "http://www.w3.org/2001/XMLSchema",
          tns: "http://example.com/updated",
        },
        previousNamespacePrefixes: {
          xs: "http://www.w3.org/2001/XMLSchema",
          tns: "http://example.com/original",
        },
      },
    });
  });

  test("updates targetNamespace when the corresponding namespace declaration URI changes", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
    const schemaRoot = new DiagramItem(SCHEMA_ROOT_ID, "schema", DiagramItemType.group, diagram);
    diagram.schemaTargetNamespace = "http://example.com/original";
    diagram.schemaNamespacePrefixes = {
      xs: "http://www.w3.org/2001/XMLSchema",
      tns: "http://example.com/original",
    };

    panel.display(schemaRoot);

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

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifySchemaNamespaces",
      payload: {
        targetNamespace: "http://example.com/updated",
        namespacePrefixes: {
          xs: "http://www.w3.org/2001/XMLSchema",
          tns: "http://example.com/updated",
        },
        previousNamespacePrefixes: {
          xs: "http://www.w3.org/2001/XMLSchema",
          tns: "http://example.com/original",
        },
      },
    });
  });
});
