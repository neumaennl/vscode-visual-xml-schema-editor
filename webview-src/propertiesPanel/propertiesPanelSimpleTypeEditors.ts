/**
 * Properties-panel helpers for rendering and editing simpleType list and union fields.
 * Keeps the structured editor controls out of the general type-property module.
 */

import { SchemaCommand } from "../../shared/types";
import { SchemaNodeType } from "../../shared/idStrategy";
import { DiagramItem } from "../diagram";
import { createEditableField } from "./propertiesPanelDom";
import { normalizeTypeReferenceForCurrentSchema } from "./propertiesPanelCommands";
import {
  createSimpleTypeKindCommand,
  createSimpleTypeListCommand,
  createSimpleTypeUnionCommand,
} from "./propertiesPanelSimpleTypeCommands";
import { getReadOnlyTypeValue } from "./propertiesPanelTypeHelpers";

/**
 * Resolves the current simpleType derivation kind from structured diagram state. The diagram builder
 * sets the kind for every simple type with a body; other nodes count as restrictions.
 *
 * @param node - Diagram node being edited
 * @returns The current simpleType derivation kind
 */
export function getSimpleTypeDerivationKind(
  node: DiagramItem
): "restriction" | "list" | "union" {
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
 */
export function isSimpleTypeNode(nodeType: SchemaNodeType | null, hasInlineSimpleType: boolean): boolean {
  return (
    nodeType === SchemaNodeType.SimpleType ||
    nodeType === SchemaNodeType.AnonymousSimpleType ||
    hasInlineSimpleType
  );
}

/**
 * Renders the list-specific simpleType editor.
 */
export function renderSimpleTypeKindSelector(
  root: HTMLElement,
  node: DiagramItem,
  hasInlineSimpleType: boolean,
  dispatchCommand: (command: SchemaCommand) => void
): void {
  const currentKind = getSimpleTypeDerivationKind(node);
  const field = document.createElement("div");
  field.className = "property";

  const label = document.createElement("label");
  label.textContent = "Kind:";
  field.appendChild(label);

  const select = document.createElement("select");
  select.className = "property-input";
  const options = [
    { value: "restriction", label: "Restriction" },
    { value: "list", label: "List" },
    { value: "union", label: "Union" },
  ];

  for (const option of options) {
    const optionElement = document.createElement("option");
    optionElement.value = option.value;
    optionElement.textContent = option.label;
    select.appendChild(optionElement);
  }

  select.value = currentKind;
  // A select only reports a change to another value, so the new kind always differs from the current one
  select.addEventListener("change", () => {
    const nextKind = select.value as "restriction" | "list" | "union";
    const command = createSimpleTypeKindCommand(node, nextKind);
    if (!command) {
      // Nothing to derive the new body from, for example a union of inline types only
      select.value = currentKind;
      return;
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
  });

  field.appendChild(select);
  root.appendChild(field);
}

export function renderSimpleTypeListEditor(
  root: HTMLElement,
  node: DiagramItem,
  hasInlineSimpleType: boolean,
  typeSuggestions: string[],
  dispatchCommand: (command: SchemaCommand) => void,
  addPropertyToContainer: (container: HTMLElement, name: string, value: string) => void
): void {
  const itemType = node.simpleTypeListItemType ?? "";
  if (hasInlineSimpleType) {
    addPropertyToContainer(root, "Type", getReadOnlyTypeValue(node, itemType));
  }

  root.appendChild(
    createEditableField("Item Type", itemType, (next) => {
      const normalizedNext = normalizeTypeReferenceForCurrentSchema(node, next);
      const normalizedCurrent = normalizeTypeReferenceForCurrentSchema(node, itemType);
      if (!normalizedNext || normalizedNext === normalizedCurrent) {
        return;
      }
      const command = createSimpleTypeListCommand(node, normalizedNext);
      if (!command) {
        return;
      }
      showListBody(node, normalizedNext, hasInlineSimpleType);
      dispatchCommand(command);
    }, typeSuggestions)
  );

  if (hasInlineSimpleType) {
    renderInlineSimpleTypeReplacement(root, node, itemType, typeSuggestions, dispatchCommand);
  }
}

/**
 * Renders the union-specific simpleType editor.
 */
export function renderSimpleTypeUnionEditor(
  root: HTMLElement,
  node: DiagramItem,
  hasInlineSimpleType: boolean,
  typeSuggestions: string[],
  dispatchCommand: (command: SchemaCommand) => void,
  addPropertyToContainer: (container: HTMLElement, name: string, value: string) => void
): void {
  const initialMemberTypes = node.simpleTypeUnionMemberTypes
    ? [...node.simpleTypeUnionMemberTypes]
    : [];
  const memberTypes = initialMemberTypes.length > 0 ? initialMemberTypes : [""];
  if (hasInlineSimpleType) {
    addPropertyToContainer(root, "Type", getReadOnlyTypeValue(node, node.type));
  }

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
      .map((memberType) => normalizeTypeReferenceForCurrentSchema(node, memberType))
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

      const select = document.createElement("select");
      select.className = "property-input";

      const optionValues = Array.from(
        new Set(["", ...typeSuggestions, ...memberTypes].map((entry) => entry.trim()).filter(Boolean))
      );
      const emptyOption = document.createElement("option");
      emptyOption.value = "";
      emptyOption.textContent = "Select type...";
      select.appendChild(emptyOption);

      for (const optionValue of optionValues) {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionValue;
        select.appendChild(option);
      }

      select.value = memberType;
      select.addEventListener("change", () => {
        memberTypes[index] = select.value;
        commitUnionMembers(memberTypes);
      });

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className =
        "property-docs-action property-docs-action-destructive property-docs-action-icon-only";
      deleteButton.setAttribute("aria-label", "Remove member type");
      deleteButton.title = "Remove member type";
      const iconSpan = document.createElement("span");
      iconSpan.className = "codicon codicon-trash";
      iconSpan.setAttribute("aria-hidden", "true");
      deleteButton.appendChild(iconSpan);
      deleteButton.addEventListener("click", () => {
        memberTypes.splice(index, 1);
        if (memberTypes.length === 0) {
          memberTypes.push("");
        }
        renderRows();
        commitUnionMembers(memberTypes);
      });

      row.appendChild(select);
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

function renderInlineSimpleTypeReplacement(
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
      (next) => {
        const normalizedNext = normalizeTypeReferenceForCurrentSchema(node, next);
        const normalizedCurrent = normalizeTypeReferenceForCurrentSchema(node, baseType);
        if (!normalizedNext || normalizedNext === normalizedCurrent) {
          return;
        }
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
      },
      typeSuggestions
    )
  );
}