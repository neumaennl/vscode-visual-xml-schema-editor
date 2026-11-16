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
import { SchemaNodeType } from "../../shared/idStrategy";
import type { SchemaCommand } from "../../shared/types";
import type { DiagramItem } from "../diagram";
import { editInput, getInputByLabel, getLabels, getSelectByLabel, getSelectsByLabel, getTextByLabel } from "../__tests__/propertiesPanelTestHelpers";
import { diagramItem, muteDiagramBuilderLog } from "../__tests__/diagramTestHelpers";
import { schemaWith } from "../../shared/__tests__/schemaTestHelpers";

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
 * The item counts as an element with an inline simple type if its ID starts with `/element:`.
 *
 * @param id - The ID of the item
 * @param render - Renders the editor into the container
 * @returns The editor
 */
function renderEditor(
  id: string,
  render: (root: HTMLElement, node: DiagramItem, hasInlineSimpleType: boolean, dispatch: Mock<(command: SchemaCommand) => void>) => void
): SimpleTypeEditor {
  const root = document.createElement("div");
  const node = diagramItem(schemaWith(SIMPLE_TYPES), id);
  const dispatch = vi.fn<(command: SchemaCommand) => void>();
  render(root, node, id.startsWith("/element:"), dispatch);
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
  return renderEditor(id, (root, node, hasInlineSimpleType, dispatchCommand) => {
    editor({ root, node, hasInlineSimpleType, typeSuggestions: SUGGESTIONS, dispatchCommand, addPropertyToContainer });
  });
}

/**
 * Selects a value in a select, which reports the change.
 *
 * @param select - The select
 * @param value - The value to select
 */
function choose(select: HTMLSelectElement, value: string): void {
  select.value = value;
  select.dispatchEvent(new Event("change"));
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
      expect(getSimpleTypeDerivationKind(diagramItem(schemaWith(SIMPLE_TYPES), id))).toBe(kind);
    });
  });

  describe("isSimpleTypeNode", () => {
    test.each([
      { nodeType: SchemaNodeType.SimpleType, inline: false, expected: true },
      { nodeType: SchemaNodeType.AnonymousSimpleType, inline: false, expected: true },
      { nodeType: SchemaNodeType.Element, inline: true, expected: true },
      { nodeType: SchemaNodeType.Element, inline: false, expected: false },
      { nodeType: SchemaNodeType.ComplexType, inline: false, expected: false },
    ])("should return $expected for $nodeType with an inline simple type: $inline", ({ nodeType, inline, expected }) => {
      expect(isSimpleTypeNode(nodeType, inline)).toBe(expected);
    });
  });

  describe("renderSimpleTypeKindSelector", () => {
    test("should offer the three kinds and select the current one", () => {
      const { root } = renderEditor("/simpleType:Tokens", renderSimpleTypeKindSelector);

      const select = getSelectByLabel(root, "Kind");
      expect(Array.from(select.options, (option) => option.textContent)).toEqual(["Restriction", "List", "Union"]);
      expect(select.value).toBe("list");
    });

    test.each([
      {
        id: "/simpleType:Code",
        kind: "list",
        payload: { listItemType: "xs:string" },
        draft: { simpleTypeDerivationKind: "list", simpleTypeListItemType: "xs:string", type: "simpleType (list of xs:string)" },
      },
      {
        id: "/simpleType:Tokens",
        kind: "union",
        payload: { unionMemberTypes: ["xs:token"] },
        draft: { simpleTypeDerivationKind: "union", simpleTypeUnionMemberTypes: ["xs:token"], type: "simpleType (union of xs:token)" },
      },
      {
        id: "/simpleType:Number",
        kind: "restriction",
        payload: { baseType: "xs:int" },
        draft: { simpleTypeDerivationKind: "restriction", simpleTypeUnionMemberTypes: undefined, type: "simpleType (restricts xs:int)" },
      },
      {
        id: "/element:size",
        kind: "list",
        payload: { listItemType: "xs:int" },
        draft: { simpleTypeDerivationKind: "list", restrictions: undefined, type: "<anonymous simpleType> (list of xs:int)" },
      },
    ])("should switch $id to a $kind derived from its current body and show it on the draft", ({ id, kind, payload, draft }) => {
      const { root, node, dispatch } = renderEditor(id, renderSimpleTypeKindSelector);
      const typeId = id.startsWith("/element:") ? `${id}/anonymousSimpleType[0]` : id;

      choose(getSelectByLabel(root, "Kind"), kind);

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: "modifySimpleType", payload: { typeId, ...payload } });
      expect(node).toMatchObject(draft);
    });

    test("should keep the kind of a union of inline types, which has no type to derive a list from", () => {
      const { root, dispatch } = renderEditor("/simpleType:InlineMembers", renderSimpleTypeKindSelector);
      const select = getSelectByLabel(root, "Kind");

      choose(select, "list");

      expect(dispatch).not.toHaveBeenCalled();
      expect(select.value).toBe("union");
    });
  });

  describe("renderSimpleTypeListEditor", () => {
    test("should show the item type of a list", () => {
      const { root } = renderBodyEditor("/simpleType:Tokens", renderSimpleTypeListEditor);

      expect(getLabels(root)).toEqual(["Item Type"]);
      expect(getInputByLabel(root, "Item Type").value).toBe("xs:token");
    });

    test.each([
      { id: "/simpleType:Tokens", typeId: "/simpleType:Tokens", type: "simpleType (list of xs:string)" },
      { id: "/element:tags", typeId: "/element:tags/anonymousSimpleType[0]", type: "<anonymous simpleType> (list of xs:string)" },
    ])("should change the item type of the list of $id", ({ id, typeId, type }) => {
      const { root, node, dispatch } = renderBodyEditor(id, renderSimpleTypeListEditor);

      editInput(root, "Item Type", "xs:string");

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: "modifySimpleType", payload: { typeId, listItemType: "xs:string" } });
      expect(node.type).toBe(type);
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
    test("should show a select for each member type, which offers the suggestions and the member types", () => {
      const { root } = renderBodyEditor("/simpleType:Number", renderSimpleTypeUnionEditor);

      const selects = getSelectsByLabel(root, "Member Types");
      expect(selects.map((select) => select.value)).toEqual(["xs:int", "xs:decimal"]);
      expect(Array.from(selects[0].options, (option) => option.value)).toEqual(["", ...SUGGESTIONS, "xs:int", "xs:decimal"]);
    });

    test.each([
      { id: "/simpleType:Number", typeId: "/simpleType:Number", type: "simpleType (union of xs:int, xs:double)" },
      { id: "/element:amount", typeId: "/element:amount/anonymousSimpleType[0]", type: "<anonymous simpleType> (union of xs:int, xs:double)" },
    ])("should change a member type of the union of $id", ({ id, typeId, type }) => {
      const { root, node, dispatch } = renderBodyEditor(id, renderSimpleTypeUnionEditor);

      choose(getSelectsByLabel(root, "Member Types")[1], "xs:double");

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: "modifySimpleType", payload: { typeId, unionMemberTypes: ["xs:int", "xs:double"] } });
      expect(node.type).toBe(type);
    });

    test("should send nothing when a member type is selected again", () => {
      const { root, dispatch } = renderBodyEditor("/simpleType:Number", renderSimpleTypeUnionEditor);

      choose(getSelectsByLabel(root, "Member Types")[1], "xs:decimal");

      expect(dispatch).not.toHaveBeenCalled();
    });

    test("should remove member types, but send no union without members", () => {
      const { root, dispatch } = renderBodyEditor("/simpleType:Number", renderSimpleTypeUnionEditor);

      removeMemberButtons(root)[0].click();
      removeMemberButtons(root)[0].click();

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:Number", unionMemberTypes: ["xs:decimal"] },
      });
      expect(getSelectsByLabel(root, "Member Types").map((select) => select.value)).toEqual([""]);
    });

    test("should add an empty member type without sending a command", () => {
      const { root, dispatch } = renderBodyEditor("/simpleType:Number", renderSimpleTypeUnionEditor);

      (Array.from(root.querySelectorAll("button")).find((button) => button.textContent === "Add member type")!).click();

      expect(getSelectsByLabel(root, "Member Types").map((select) => select.value)).toEqual(["xs:int", "xs:decimal", ""]);
      expect(dispatch).not.toHaveBeenCalled();
    });

    test("should show one empty member type for a union of inline types", () => {
      const { root } = renderBodyEditor("/simpleType:InlineMembers", renderSimpleTypeUnionEditor);

      expect(getSelectsByLabel(root, "Member Types").map((select) => select.value)).toEqual([""]);
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
      return renderEditor("/element:size", (root, node, _hasInlineSimpleType, dispatch) => {
        renderInlineSimpleTypeReplacement(root, node, "xs:int", SUGGESTIONS, dispatch);
      });
    }

    test("should replace the inline type with a named type", () => {
      const { root, node, dispatch } = renderReplacement();

      editInput(root, "Replacement Type", "xs:string");

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: "modifyElement", payload: { elementId: "/element:size", elementType: "xs:string" } });
      expect(node.type).toBe("xs:string");
      expect(node.isSimpleContent).toBe(false);
    });

    test.each(["xs:int", " "])("should send nothing for the type '%s'", (value) => {
      const { root, dispatch } = renderReplacement();

      editInput(root, "Replacement Type", value);

      expect(dispatch).not.toHaveBeenCalled();
    });
  });
});
