/**
 * Properties-panel helpers for rendering and editing simpleType list and union fields.
 * Keeps the structured editor controls out of the general type-property module.
 */

import type { SchemaCommand, SimpleTypeDerivationKind } from "../../shared/types";
import { SchemaNodeType } from "../../shared/idStrategy";
import type { DiagramItem } from "../diagram";
import { type ChoiceOption, createChoiceField, createEditableField, createTextInput } from "./propertiesPanelFields";
import {
  createTypeCommitHandler,
  normalizeTypeReference,
  typeReferenceContextOf,
} from "./propertiesPanelTypeReferences";
import { validateTypeReference } from "../../shared/typeReferences";
import {
  createSimpleTypeKindCommand,
  createSimpleTypeListCommand,
  createSimpleTypeUnionCommand,
} from "./propertiesPanelSimpleTypeCommands";
import { getReadOnlyTypeValue } from "./propertiesPanelTypeHelpers";

/** Why the last member type of a union cannot be removed. */
const LAST_MEMBER_TYPE_MESSAGE = "A union needs at least one member type";
/**
 * Resolves the current simpleType derivation kind from structured diagram state. The diagram builder
 * sets the kind for every simple type with a body; other nodes count as restrictions.
 *
 * @param node - Diagram node being edited
 * @returns The current simpleType derivation kind
 */
export function getSimpleTypeDerivationKind(node: DiagramItem): SimpleTypeDerivationKind {
  return node.simpleTypeDerivationKind ?? "restriction";
}

/**
 * Returns the start of the type label of a simple type, as the diagram builder writes it.
 *
 * @param hasInlineSimpleType - Whether the simple type is the anonymous type of an element
 * @returns The start of the label
 */
function typeLabelPrefix(hasInlineSimpleType: boolean): string {
  return hasInlineSimpleType ? "<anonymous simpleType>" : "simpleType";
}

/**
 * Shows a list body on the draft node, so that the panel shows it before the diagram is rebuilt.
 *
 * @param node - The draft node
 * @param itemType - The item type of the list
 * @param hasInlineSimpleType - Whether the simple type is the anonymous type of an element
 */
function showListBody(node: DiagramItem, itemType: string, hasInlineSimpleType: boolean): void {
  node.simpleTypeDerivationKind = "list";
  node.simpleTypeListItemType = itemType;
  node.simpleTypeUnionMemberTypes = undefined;
  node.restrictions = undefined;
  node.type = `${typeLabelPrefix(hasInlineSimpleType)} (list of ${itemType})`;
}

/**
 * Shows a union body on the draft node, so that the panel shows it before the diagram is rebuilt.
 *
 * @param node - The draft node
 * @param memberTypes - The member types of the union
 * @param hasInlineSimpleType - Whether the simple type is the anonymous type of an element
 */
function showUnionBody(node: DiagramItem, memberTypes: string[], hasInlineSimpleType: boolean): void {
  node.simpleTypeDerivationKind = "union";
  node.simpleTypeListItemType = undefined;
  node.simpleTypeUnionMemberTypes = memberTypes;
  node.restrictions = undefined;
  node.type = `${typeLabelPrefix(hasInlineSimpleType)} (union of ${memberTypes.join(", ")})`;
}

/**
 * Returns whether a node should be treated as a simpleType in the properties panel.
 *
 * @param nodeType - The schema node type of the node
 * @param hasInlineSimpleType - Whether the node is an element with an inline simpleType
 * @returns True for simple types and elements with an inline simpleType
 */
export function isSimpleTypeNode(nodeType: SchemaNodeType | null, hasInlineSimpleType: boolean): boolean {
  return (
    nodeType === SchemaNodeType.SimpleType || nodeType === SchemaNodeType.AnonymousSimpleType || hasInlineSimpleType
  );
}

/**
 * Renders the select that switches a simpleType between restriction, list and union. The new body is
 * derived from the current one and shown on the draft node; when nothing can be derived, the select
 * goes back to the current kind.
 *
 * @param root - The tab
 * @param node - The simpleType, or the element with the inline simpleType
 * @param hasInlineSimpleType - Whether the node is an element with an inline simpleType
 * @param dispatchCommand - Callback used to emit schema commands
 */
export function renderSimpleTypeKindSelector(
  root: HTMLElement,
  node: DiagramItem,
  hasInlineSimpleType: boolean,
  dispatchCommand: (command: SchemaCommand) => void
): void {
  const options: ReadonlyArray<ChoiceOption<SimpleTypeDerivationKind>> = [
    { value: "restriction", label: "Restriction" },
    { value: "list", label: "List" },
    { value: "union", label: "Union" },
  ];
  const field = createChoiceField("Kind", getSimpleTypeDerivationKind(node), options, (nextKind) => {
    const command = createSimpleTypeKindCommand(node, nextKind);
    if (!command) {
      // Nothing to derive the new body from, for example a union of inline types only
      return false;
    }

    // The command builder derives the new body from the current one; a list or union has no facets
    const payload = command.payload as { listItemType: string; unionMemberTypes: string[]; baseType: string };
    if (nextKind === "list") {
      showListBody(node, payload.listItemType, hasInlineSimpleType);
    } else if (nextKind === "union") {
      showUnionBody(node, payload.unionMemberTypes, hasInlineSimpleType);
    } else {
      node.simpleTypeDerivationKind = "restriction";
      node.simpleTypeListItemType = undefined;
      node.simpleTypeUnionMemberTypes = undefined;
      node.restrictions = undefined;
      node.type = `${typeLabelPrefix(hasInlineSimpleType)} (restricts ${payload.baseType})`;
    }

    dispatchCommand(command);
    return true;
  });
  root.appendChild(field);
}

/** What the list and union editors of a simpleType need. */
export interface SimpleTypeEditorContext {
  /** The tab */
  root: HTMLElement;
  /** The simpleType, or the element with the inline simpleType */
  node: DiagramItem;
  /** Whether the node is an element with an inline simpleType */
  hasInlineSimpleType: boolean;
  /** Type names offered in the type fields */
  typeSuggestions: string[];
  /** Callback used to emit schema commands */
  dispatchCommand: (command: SchemaCommand) => void;
  /** Helper used for read-only property rows */
  addPropertyToContainer: (container: HTMLElement, name: string, value: string) => void;
}

/**
 * Shows the type of an element with an inline list or union as a read-only row.
 *
 * @param context - The editor context
 */
function showInlineSimpleType(context: SimpleTypeEditorContext): void {
  if (context.hasInlineSimpleType) {
    context.addPropertyToContainer(context.root, "Type", getReadOnlyTypeValue(context.node, undefined));
  }
}

/**
 * Renders the list-specific simpleType editor.
 *
 * @param context - The editor context
 */
export function renderSimpleTypeListEditor(context: SimpleTypeEditorContext): void {
  const { root, node, hasInlineSimpleType, typeSuggestions, dispatchCommand } = context;
  const itemType = node.simpleTypeListItemType ?? "";
  showInlineSimpleType(context);

  root.appendChild(
    createEditableField(
      "Item Type",
      itemType,
      createTypeCommitHandler(node, itemType, (normalizedNext) => {
        const command = createSimpleTypeListCommand(node, normalizedNext);
        if (!command) {
          return;
        }
        showListBody(node, normalizedNext, hasInlineSimpleType);
        dispatchCommand(command);
      }),
      typeSuggestions
    )
  );

  if (hasInlineSimpleType) {
    renderInlineSimpleTypeReplacement(root, node, itemType, typeSuggestions, dispatchCommand);
  }
}

/**
 * Renders the union-specific simpleType editor: a select for each member type, buttons that remove
 * and add member types and, for an inline simpleType, a replacement type. A union without member types
 * is not sent.
 *
 * @param context - The editor context
 */
export function renderSimpleTypeUnionEditor(context: SimpleTypeEditorContext): void {
  const { root, node, hasInlineSimpleType, typeSuggestions, dispatchCommand } = context;
  const initialMemberTypes = node.simpleTypeUnionMemberTypes ? [...node.simpleTypeUnionMemberTypes] : [];
  const memberTypes = initialMemberTypes.length > 0 ? initialMemberTypes : [""];
  showInlineSimpleType(context);

  const unionEditor = document.createElement("div");
  unionEditor.className = "property";

  const memberTypesLabel = document.createElement("label");
  memberTypesLabel.textContent = "Member Types:";
  unionEditor.appendChild(memberTypesLabel);

  const editorBody = document.createElement("div");
  editorBody.style.display = "grid";
  editorBody.style.gap = "6px";

  const toNormalizedMembers = (entries: string[]): string[] =>
    entries
      .map((memberType) => normalizeTypeReference(node, memberType))
      .map((memberType) => memberType.trim())
      .filter((memberType) => memberType.length > 0);

  const normalizedCurrent = toNormalizedMembers(memberTypes);

  const commitUnionMembers = (nextRawMemberTypes: string[]): void => {
    const parsedMemberTypes = toNormalizedMembers(nextRawMemberTypes);
    if (parsedMemberTypes.length === 0) {
      return;
    }
    if (parsedMemberTypes.join("|") === normalizedCurrent.join("|")) {
      return;
    }
    const command = createSimpleTypeUnionCommand(node, parsedMemberTypes);
    if (!command) {
      return;
    }
    showUnionBody(node, parsedMemberTypes, hasInlineSimpleType);
    dispatchCommand(command);
  };

  const renderRows = (): void => {
    editorBody.replaceChildren();

    memberTypes.forEach((memberType, index) => {
      const row = document.createElement("div");
      row.style.display = "grid";
      row.style.gridTemplateColumns = "1fr auto";
      row.style.gap = "6px";
      row.style.alignItems = "center";

      // A member type is a type reference, an open value: any type can be entered, the known ones are suggested
      const memberInput = createTextInput(
        memberType,
        (next, reject) => {
          const entered = next.trim();
          if (entered === memberTypes[index]) {
            return;
          }
          const nextMemberTypes = memberTypes.map((existing, i) => (i === index ? entered : existing));
          if (toNormalizedMembers(nextMemberTypes).length === 0) {
            reject(LAST_MEMBER_TYPE_MESSAGE);
            return;
          }
          const result = entered
            ? validateTypeReference(normalizeTypeReference(node, entered), typeReferenceContextOf(node))
            : undefined;
          if (result && !result.valid) {
            reject(result.error);
            return;
          }
          memberTypes[index] = entered;
          commitUnionMembers(memberTypes);
        },
        { suggestions: typeSuggestions, placeholder: "type, such as xs:string" }
      );

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "property-docs-action property-docs-action-destructive property-docs-action-icon-only";
      deleteButton.setAttribute("aria-label", "Remove member type");
      // A union needs at least one member type
      deleteButton.disabled = memberTypes.length <= 1;
      deleteButton.title = deleteButton.disabled ? LAST_MEMBER_TYPE_MESSAGE : "Remove member type";
      const iconSpan = document.createElement("span");
      iconSpan.className = "codicon codicon-trash";
      iconSpan.setAttribute("aria-hidden", "true");
      deleteButton.appendChild(iconSpan);
      deleteButton.addEventListener("click", () => {
        memberTypes.splice(index, 1);
        renderRows();
        commitUnionMembers(memberTypes);
      });

      row.appendChild(memberInput);
      row.appendChild(deleteButton);
      editorBody.appendChild(row);
    });

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "property-docs-action";
    addButton.textContent = "Add member type";
    addButton.addEventListener("click", () => {
      memberTypes.push("");
      renderRows();
    });
    editorBody.appendChild(addButton);
  };

  renderRows();
  unionEditor.appendChild(editorBody);
  root.appendChild(unionEditor);

  if (hasInlineSimpleType) {
    renderInlineSimpleTypeReplacement(root, node, normalizedCurrent[0] ?? "", typeSuggestions, dispatchCommand);
  }
}

/**
 * Renders the field that replaces the inline simpleType of an element with a named type.
 *
 * @param root - The tab
 * @param node - The element
 * @param baseType - The current base type of the inline simpleType
 * @param typeSuggestions - Type names offered in the field
 * @param dispatchCommand - Callback used to emit schema commands
 */
export function renderInlineSimpleTypeReplacement(
  root: HTMLElement,
  node: DiagramItem,
  baseType: string,
  typeSuggestions: string[],
  dispatchCommand: (command: SchemaCommand) => void
): void {
  root.appendChild(
    createEditableField(
      "Replacement Type",
      baseType,
      createTypeCommitHandler(node, baseType, (normalizedNext) => {
        const command: SchemaCommand = {
          type: "modifyElement",
          payload: {
            elementId: node.id,
            elementType: normalizedNext,
          },
        };
        node.type = normalizedNext;
        node.hasAnonymousComplexType = false;
        node.isSimpleContent = false;
        dispatchCommand(command);
      }),
      typeSuggestions
    )
  );
}
