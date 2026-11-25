/**
 * Unit tests for the editors of simple types of the properties panel: the kind selector, the editors
 * of lists and unions and the replacement of the inline simple type of an element.
 */

import type { Mock } from "vitest";
import {
  getSimpleTypeDerivationKind,
  isSimpleTypeNode,
  renderInlineSimpleTypeReplacement,
  renderSimpleTypeKindSelector,
  renderSimpleTypeListEditor,
  renderSimpleTypeUnionEditor,
} from "./propertiesPanelSimpleTypeEditors";
import { addPropertyToContainer } from "./propertiesPanelDom";
import type { SchemaCommand } from "../../shared/types";
import type { DiagramItem } from "../diagram";
import {
  editInput,
  getInputByLabel,
  getLabels,
  getInputsByLabel,
  getTextByLabel,
} from "../__tests__/propertiesPanelTestHelpers";
import { diagramItem, muteDiagramBuilderLog, anonymousSimpleTypeItem } from "../__tests__/diagramTestHelpers";
import { webviewSchemaWith } from "../../shared/__tests__/schemaTestHelpers";

/** Named and anonymous list, union and restriction types, and an element with a named type. */
const SIMPLE_TYPES = `<xs:simpleType name="Tokens"><xs:list itemType="xs:token"/></xs:simpleType>
<xs:simpleType name="Number"><xs:union memberTypes="xs:int xs:decimal"/></xs:simpleType>
<xs:simpleType name="Code"><xs:restriction base="xs:string"/></xs:simpleType>
<xs:simpleType name="InlineMembers"><xs:union><xs:simpleType><xs:restriction base="xs:int"/></xs:simpleType></xs:union></xs:simpleType>
<xs:element name="tags"><xs:simpleType><xs:list itemType="xs:token"/></xs:simpleType></xs:element>
<xs:element name="amount"><xs:simpleType><xs:union memberTypes="xs:int xs:decimal"/></xs:simpleType></xs:element>
<xs:element name="size"><xs:simpleType><xs:restriction base="xs:int"/></xs:simpleType></xs:element>
<xs:element name="plain" type="xs:string"/>`;

/** The type names that the editors suggest. */
const SUGGESTIONS = ["xs:string", "xs:double"];

/** An editor of a simple type, the node it edits, and the mock that receives its commands. */
interface SimpleTypeEditor {
  root: HTMLElement;
  node: DiagramItem;
  dispatch: Mock<(command: SchemaCommand) => void>;
}

/**
 * Renders an editor for the diagram item with the given ID in the diagram of {@link SIMPLE_TYPES}.
 *
 * @param id - The ID of the item
 * @param render - Renders the editor into the container
 * @returns The editor
 */
function renderEditor(
  id: string,
  render: (root: HTMLElement, node: DiagramItem, dispatch: Mock<(command: SchemaCommand) => void>) => void
): SimpleTypeEditor {
  const root = document.createElement("div");
  const node = diagramItem(webviewSchemaWith(SIMPLE_TYPES), id);
  const dispatch = vi.fn<(command: SchemaCommand) => void>();
  render(root, node, dispatch);
  return { root, node, dispatch };
}

/**
 * Renders the list or union editor of the diagram item with the given ID.
 *
 * @param id - The ID of the item
 * @param editor - The editor to render
 * @returns The editor
 */
function renderBodyEditor(id: string, editor: typeof renderSimpleTypeListEditor): SimpleTypeEditor {
  return renderEditor(id, (root, node, dispatchCommand) => {
    editor({ root, node, typeSuggestions: SUGGESTIONS, dispatchCommand, addPropertyToContainer });
  });
}

/**
 * Enters a text in an input and leaves it, which commits the text.
 *
 * @param input - The input
 * @param text - The text
 */
function enter(input: HTMLInputElement, text: string): void {
  input.value = text;
  input.dispatchEvent(new Event("blur"));
}

/**
 * Returns the remove buttons of the member types of a union.
 *
 * @param root - The container of the editor
 * @returns The buttons
 */
function removeMemberButtons(root: HTMLElement): HTMLButtonElement[] {
  return Array.from(root.querySelectorAll<HTMLButtonElement>("button[aria-label='Remove member type']"));
}

describe("propertiesPanelSimpleTypeEditors", () => {
  muteDiagramBuilderLog();

  describe("getSimpleTypeDerivationKind", () => {
    test.each([
      { id: "/simpleType:Tokens", kind: "list" },
      { id: "/simpleType:Number", kind: "union" },
      { id: "/simpleType:Code", kind: "restriction" },
      { id: "/element:plain", kind: "restriction" },
    ])("should return $kind for $id", ({ id, kind }) => {
      expect(getSimpleTypeDerivationKind(diagramItem(webviewSchemaWith(SIMPLE_TYPES), id))).toBe(kind);
    });
  });

  describe("isSimpleTypeNode", () => {
    test.each([
      ["/simpleType:Code", true],
      ["/element:size", true],
      ["/element:plain", false],
    ])("should return for %s: %s", (id, expected) => {
      expect(isSimpleTypeNode(diagramItem(webviewSchemaWith(SIMPLE_TYPES), id))).toBe(expected);
    });

    test("should treat an anonymous simple type as a simple type", () => {
      const node = anonymousSimpleTypeItem(diagramItem(webviewSchemaWith(SIMPLE_TYPES), "/element:size"));

      expect(isSimpleTypeNode(node)).toBe(true);
    });
  });

  describe("renderSimpleTypeKindSelector", () => {
    test("should suggest the three kinds and show the current one", () => {
      const { root } = renderEditor("/simpleType:Tokens", renderSimpleTypeKindSelector);

      const input = getInputByLabel(root, "Kind");
      const suggestions = root.querySelector<HTMLDataListElement>(`#${input.getAttribute("list") ?? ""}`)!;
      expect(Array.from(suggestions.options, (option) => option.value)).toEqual(["Restriction", "List", "Union"]);
      expect(input.value).toBe("List");
    });

    test.each([
      {
        id: "/simpleType:Code",
        kind: "list",
        payload: { listItemType: "xs:string" },
      },
      {
        id: "/simpleType:Tokens",
        kind: "union",
        payload: { unionMemberTypes: ["xs:token"] },
      },
      {
        id: "/simpleType:Number",
        kind: "restriction",
        payload: { baseType: "xs:int" },
      },
      {
        id: "/element:size",
        kind: "list",
        payload: { listItemType: "xs:int" },
      },
    ])("should switch $id to a $kind derived from its current body", ({ id, kind, payload }) => {
      const { root, dispatch } = renderEditor(id, renderSimpleTypeKindSelector);
      const typeId = id.startsWith("/element:") ? `${id}/anonymousSimpleType[0]` : id;

      editInput(root, "Kind", kind);

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: "modifySimpleType", payload: { typeId, ...payload } });
    });

    test("should keep the kind of a union of inline types, which has no type to derive a list from", () => {
      const { root, dispatch } = renderEditor("/simpleType:InlineMembers", renderSimpleTypeKindSelector);

      editInput(root, "Kind", "list");

      expect(dispatch).not.toHaveBeenCalled();
      expect(getInputByLabel(root, "Kind").value).toBe("Union");
    });
  });

  describe("renderSimpleTypeListEditor", () => {
    test("should show the item type of a list", () => {
      const { root } = renderBodyEditor("/simpleType:Tokens", renderSimpleTypeListEditor);

      expect(getLabels(root)).toEqual(["Item Type"]);
      expect(getInputByLabel(root, "Item Type").value).toBe("xs:token");
    });

    test.each([
      { id: "/simpleType:Tokens", typeId: "/simpleType:Tokens" },
      {
        id: "/element:tags",
        typeId: "/element:tags/anonymousSimpleType[0]",
      },
    ])("should change the item type of the list of $id", ({ id, typeId }) => {
      const { root, dispatch } = renderBodyEditor(id, renderSimpleTypeListEditor);

      editInput(root, "Item Type", "xs:string");

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "modifySimpleType",
        payload: { typeId, listItemType: "xs:string" },
      });
    });

    test.each(["xs:token", " "])("should send nothing for the item type '%s'", (value) => {
      const { root, dispatch } = renderBodyEditor("/simpleType:Tokens", renderSimpleTypeListEditor);

      editInput(root, "Item Type", value);

      expect(dispatch).not.toHaveBeenCalled();
    });

    test("should offer to replace the inline list of an element", () => {
      const { root } = renderBodyEditor("/element:tags", renderSimpleTypeListEditor);

      expect(getLabels(root)).toEqual(["Type", "Item Type", "Replacement Type"]);
      expect(getTextByLabel(root, "Type")).toBe("Inline simpleType (list of xs:token)");
      expect(getInputByLabel(root, "Replacement Type").value).toBe("xs:token");
    });
  });

  describe("renderSimpleTypeUnionEditor", () => {
    test("should show a text field for each member type, which suggests the type names", () => {
      const { root } = renderBodyEditor("/simpleType:Number", renderSimpleTypeUnionEditor);

      const inputs = getInputsByLabel(root, "Member Types");
      expect(inputs.map((input) => input.value)).toEqual(["xs:int", "xs:decimal"]);
      const suggestions = root.querySelector<HTMLDataListElement>(`#${inputs[0]!.getAttribute("list") ?? ""}`)!;
      expect(Array.from(suggestions.options, (option) => option.value)).toEqual(SUGGESTIONS);
    });

    test("should reject a member type that the schema does not offer, with a message below the field", () => {
      const { root, dispatch } = renderBodyEditor("/simpleType:Number", renderSimpleTypeUnionEditor);
      const input = getInputsByLabel(root, "Member Types")[1]!;

      enter(input, "ext:Unknown");

      expect(dispatch).not.toHaveBeenCalled();
      expect(input.value).toBe("xs:decimal");
      expect(input.parentElement?.querySelector(".property-message")?.textContent).toContain(
        "Unknown type 'ext:Unknown'"
      );
    });

    test.each([
      { id: "/simpleType:Number", typeId: "/simpleType:Number" },
      {
        id: "/element:amount",
        typeId: "/element:amount/anonymousSimpleType[0]",
      },
    ])("should change a member type of the union of $id", ({ id, typeId }) => {
      const { root, dispatch } = renderBodyEditor(id, renderSimpleTypeUnionEditor);

      enter(getInputsByLabel(root, "Member Types")[1]!, "xs:double");

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "modifySimpleType",
        payload: { typeId, unionMemberTypes: ["xs:int", "xs:double"] },
      });
    });

    test("should send nothing when a member type is entered again", () => {
      const { root, dispatch } = renderBodyEditor("/simpleType:Number", renderSimpleTypeUnionEditor);

      enter(getInputsByLabel(root, "Member Types")[1]!, "xs:decimal");

      expect(dispatch).not.toHaveBeenCalled();
    });

    test("should remove member types, but not the last one", () => {
      const { root, dispatch } = renderBodyEditor("/simpleType:Number", renderSimpleTypeUnionEditor);

      removeMemberButtons(root)[0]!.click();

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:Number", unionMemberTypes: ["xs:decimal"] },
      });
      expect(getInputsByLabel(root, "Member Types").map((input) => input.value)).toEqual(["xs:decimal"]);
      expect(removeMemberButtons(root).map((button) => button.disabled)).toEqual([true]);
    });

    test("should reject emptying the only member type with a message", () => {
      const { root, dispatch } = renderBodyEditor("/simpleType:Number", renderSimpleTypeUnionEditor);
      removeMemberButtons(root)[0]!.click();
      dispatch.mockClear();
      const input = getInputsByLabel(root, "Member Types")[0]!;

      enter(input, " ");

      expect(dispatch).not.toHaveBeenCalled();
      expect(input.value).toBe("xs:decimal");
      expect(input.parentElement?.querySelector(".property-message")?.textContent).toBe(
        "A union needs at least one member type"
      );
    });

    test("should add an empty member type without sending a command", () => {
      const { root, dispatch } = renderBodyEditor("/simpleType:Number", renderSimpleTypeUnionEditor);

      Array.from(root.querySelectorAll("button"))
        .find((button) => button.textContent === "Add member type")!
        .click();

      expect(getInputsByLabel(root, "Member Types").map((input) => input.value)).toEqual(["xs:int", "xs:decimal", ""]);
      expect(dispatch).not.toHaveBeenCalled();
    });

    test("should show one empty member type for a union of inline types", () => {
      const { root } = renderBodyEditor("/simpleType:InlineMembers", renderSimpleTypeUnionEditor);

      expect(getInputsByLabel(root, "Member Types").map((input) => input.value)).toEqual([""]);
    });

    test("should offer to replace the inline union of an element with its first member type", () => {
      const { root } = renderBodyEditor("/element:amount", renderSimpleTypeUnionEditor);

      expect(getLabels(root)).toEqual(["Type", "Member Types", "Replacement Type"]);
      expect(getTextByLabel(root, "Type")).toBe("Inline simpleType (union of xs:int, xs:decimal)");
      expect(getInputByLabel(root, "Replacement Type").value).toBe("xs:int");
    });
  });

  describe("renderInlineSimpleTypeReplacement", () => {
    /**
     * Renders the replacement field of the element `size`, whose inline type restricts `xs:int`.
     *
     * @returns The editor
     */
    function renderReplacement(): SimpleTypeEditor {
      return renderEditor("/element:size", (root, node, dispatch) => {
        renderInlineSimpleTypeReplacement(root, node, "xs:int", SUGGESTIONS, dispatch);
      });
    }

    test("should replace the inline type with a named type", () => {
      const { root, dispatch } = renderReplacement();

      editInput(root, "Replacement Type", "xs:string");

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "modifyElement",
        payload: { elementId: "/element:size", elementType: "xs:string" },
      });
    });

    test.each(["xs:int", " "])("should send nothing for the type '%s'", (value) => {
      const { root, dispatch } = renderReplacement();

      editInput(root, "Replacement Type", value);

      expect(dispatch).not.toHaveBeenCalled();
    });
  });
});
