/**
 * Unit tests for the fields of the properties panel that edit the target namespace and the namespace
 * declarations of the schema.
 */

import type { Mock } from "vitest";
import { renderSchemaNamespaceProperties } from "./propertiesPanelSchemaNamespaces";
import type { SchemaCommand } from "../../shared/types";
import { DiagramItem, DiagramItemType } from "../diagram";
import { editInput, getInputByLabel } from "../__tests__/propertiesPanelTestHelpers";
import { diagramItem, muteDiagramBuilderLog } from "../__tests__/diagramTestHelpers";
import { schemaWith } from "../../shared/__tests__/schemaTestHelpers";
import { unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../../shared/types";

/** The namespace of XML Schema. */
const XS = "http://www.w3.org/2001/XMLSchema";

/** The namespace declarations of {@link SCHEMA_WITH_TARGET}. */
const DECLARATIONS = { other: "urn:other", tns: "urn:original", xs: XS };

/** A schema whose target namespace has the prefix `tns`, and another namespace declaration. */
const SCHEMA_WITH_TARGET = `<xs:schema xmlns:xs="${XS}" xmlns:tns="urn:original" xmlns:other="urn:other" targetNamespace="urn:original"/>`;

/** The namespace fields of the schema, the schema node and the mocks the fields call. */
interface NamespaceFields {
  root: HTMLElement;
  node: DiagramItem;
  dispatch: Mock<(command: SchemaCommand) => void>;
  rerender: Mock<() => void>;
}

/**
 * Renders the namespace fields of the schema node in a container in the document, which moving the
 * focus needs.
 *
 * @param schemaObj - The schema; by default {@link SCHEMA_WITH_TARGET}
 * @returns The fields, the node and the mocks
 */
function renderNamespaces(schemaObj = unmarshal(schema, SCHEMA_WITH_TARGET)): NamespaceFields {
  const root = document.createElement("div");
  document.body.appendChild(root);
  const node = diagramItem(schemaObj, "/schema");
  const dispatch = vi.fn<(command: SchemaCommand) => void>();
  const rerender = vi.fn<() => void>();
  renderSchemaNamespaceProperties(root, node, dispatch, rerender);
  return { root, node, dispatch, rerender };
}

/**
 * Returns the prefix and URI inputs and the remove button of the declaration with the given prefix.
 *
 * @param root - The container of the fields
 * @param prefix - The prefix of the declaration
 * @returns The inputs and the button
 */
function declarationRow(root: HTMLElement, prefix: string): { prefix: HTMLInputElement; uri: HTMLInputElement; remove: HTMLButtonElement } {
  const row = Array.from(root.querySelectorAll(".property-namespace-row")).find(
    (candidate) => candidate.querySelector<HTMLInputElement>("input[placeholder='prefix']")?.value === prefix
  );
  expect(row).toBeDefined();
  return {
    prefix: row?.querySelector("input[placeholder='prefix']") as HTMLInputElement,
    uri: row?.querySelector("input[placeholder='namespace URI']") as HTMLInputElement,
    remove: row?.querySelector("button") as HTMLButtonElement,
  };
}

/**
 * Enters a value into an input and leaves it.
 *
 * @param input - The input
 * @param value - The new value
 */
function commit(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new FocusEvent("blur"));
}

/**
 * Returns the command that changes the namespaces of {@link SCHEMA_WITH_TARGET}.
 *
 * @param targetNamespace - The new target namespace
 * @param namespacePrefixes - The new namespace declarations
 * @returns The command
 */
function namespacesCommand(targetNamespace: string, namespacePrefixes: Record<string, string>): SchemaCommand {
  return {
    type: "modifySchemaNamespaces",
    payload: { targetNamespace, namespacePrefixes, previousNamespacePrefixes: DECLARATIONS },
  };
}

describe("renderSchemaNamespaceProperties", () => {
  muteDiagramBuilderLog();

  afterEach(() => {
    document.body.replaceChildren();
  });

  test("should show the target namespace and the namespace declarations, sorted by prefix", () => {
    const { root } = renderNamespaces();

    expect(getInputByLabel(root, "targetNamespace").value).toBe("urn:original");
    const rows = Array.from(root.querySelectorAll(".property-namespace-row"), (row) =>
      Array.from(row.querySelectorAll("input"), (input) => input.value)
    );
    expect(rows).toEqual(Object.entries(DECLARATIONS));
    expect(Array.from(root.querySelectorAll("button"), (button) => button.textContent)).toEqual([
      "Remove",
      "Remove",
      "Remove",
      "Add namespace",
    ]);
  });

  test("should reject a schema node without a diagram, which the diagram builder does not create", () => {
    const node = new DiagramItem("/schema", "schema", DiagramItemType.element);

    expect(() => { renderSchemaNamespaceProperties(document.createElement("div"), node, vi.fn(), vi.fn()); }).toThrow(
      "The schema node belongs to no diagram"
    );
  });

  describe("the target namespace", () => {
    test("should change the declaration of the target namespace with it and update the diagram", () => {
      const { root, node, dispatch, rerender } = renderNamespaces();

      editInput(root, "targetNamespace", " urn:updated ");

      const declarations = { ...DECLARATIONS, tns: "urn:updated" };
      expect(dispatch).toHaveBeenCalledExactlyOnceWith(namespacesCommand("urn:updated", declarations));
      expect(node.diagram?.schemaTargetNamespace).toBe("urn:updated");
      expect(node.diagram?.schemaNamespacePrefixes).toEqual(declarations);
      expect(node.diagram?.currentSchemaPrefix).toBe("tns");
      expect(rerender).toHaveBeenCalledOnce();
    });

    test("should remove the declaration of a removed target namespace", () => {
      const { root, node, dispatch } = renderNamespaces();

      editInput(root, "targetNamespace", "");

      expect(dispatch).toHaveBeenCalledExactlyOnceWith(namespacesCommand("", { other: "urn:other", xs: XS }));
      expect(node.diagram?.currentSchemaPrefix).toBeUndefined();
    });

    test.each<{ namespaces: Record<string, string>; prefix: string }>([
      { namespaces: { other: "urn:other" }, prefix: "tns" },
      { namespaces: { tns: "urn:other" }, prefix: "ns0" },
    ])("should declare a new target namespace with the prefix $prefix for the declarations $namespaces", ({ namespaces, prefix }) => {
      const { root, node, dispatch } = renderNamespaces(schemaWith("", namespaces));
      const previous = { ...node.diagram?.schemaNamespacePrefixes };

      editInput(root, "targetNamespace", "urn:new");

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "modifySchemaNamespaces",
        payload: { targetNamespace: "urn:new", namespacePrefixes: { ...previous, [prefix]: "urn:new" }, previousNamespacePrefixes: previous },
      });
      expect(node.diagram?.currentSchemaPrefix).toBe(prefix);
    });
  });

  describe("the namespace declarations", () => {
    test("should change the target namespace with the URI of its declaration", () => {
      const { root, dispatch } = renderNamespaces();

      commit(declarationRow(root, "tns").uri, "urn:updated");

      expect(dispatch).toHaveBeenCalledExactlyOnceWith(namespacesCommand("urn:updated", { ...DECLARATIONS, tns: "urn:updated" }));
    });

    test("should rename a prefix", () => {
      const { root, dispatch } = renderNamespaces();

      commit(declarationRow(root, "other").prefix, " ext ");

      expect(dispatch).toHaveBeenCalledExactlyOnceWith(namespacesCommand("urn:original", { ext: "urn:other", tns: "urn:original", xs: XS }));
    });

    test.each([
      { case: "an emptied URI", change: (root: HTMLElement): void => { commit(declarationRow(root, "other").uri, " "); } },
      { case: "the remove button", change: (root: HTMLElement): void => { declarationRow(root, "other").remove.click(); } },
    ])("should remove a declaration with $case", ({ change }) => {
      const { root, dispatch } = renderNamespaces();

      change(root);

      expect(dispatch).toHaveBeenCalledExactlyOnceWith(namespacesCommand("urn:original", { tns: "urn:original", xs: XS }));
    });

    test("should remove the target namespace with its declaration", () => {
      const { root, dispatch } = renderNamespaces();

      declarationRow(root, "tns").remove.click();

      expect(dispatch).toHaveBeenCalledExactlyOnceWith(namespacesCommand("", { other: "urn:other", xs: XS }));
    });

    test.each(["xml", "xmlns"])("should reject the reserved prefix %s and show the declarations again", (prefix) => {
      const { root, dispatch, rerender } = renderNamespaces();

      commit(declarationRow(root, "other").prefix, prefix);

      expect(dispatch).not.toHaveBeenCalled();
      expect(rerender).toHaveBeenCalledOnce();
    });

    test("should commit a declaration with Enter", () => {
      const { root, dispatch } = renderNamespaces();
      const { uri } = declarationRow(root, "other");
      uri.focus();

      uri.value = "urn:changed";
      const enter = new KeyboardEvent("keydown", { key: "Enter", cancelable: true });
      uri.dispatchEvent(enter);

      expect(enter.defaultPrevented).toBe(true);
      expect(dispatch).toHaveBeenCalledExactlyOnceWith(namespacesCommand("urn:original", { ...DECLARATIONS, other: "urn:changed" }));
    });

    test("should add a declaration with a new prefix", () => {
      const { root, dispatch } = renderNamespaces();

      (Array.from(root.querySelectorAll("button")).find((button) => button.textContent === "Add namespace") as HTMLButtonElement).click();

      expect(dispatch).toHaveBeenCalledExactlyOnceWith(
        namespacesCommand("urn:original", { ...DECLARATIONS, ns0: "urn:example:namespace" })
      );
    });
  });
});
