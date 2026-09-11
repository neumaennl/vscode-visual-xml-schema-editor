/**
 * Property-panel helpers for rendering and editing simpleType list and union fields.
 * Keeps the structured editor controls out of the general type-property module.
 */

import { SchemaCommand } from "../../shared/types";
import { RestrictionFacets } from "../../shared/commands/schemaTypes";
import { SchemaNodeType } from "../../shared/idStrategy";
import { DiagramItem } from "../diagram";
import { createEditableField } from "./propertyPanelDom";
import { normalizeTypeReferenceForCurrentSchema } from "./propertyPanelCommands";
import {
  createSimpleTypeKindCommand,
  createSimpleTypeListCommand,
  createSimpleTypeUnionCommand,
} from "./propertyPanelSimpleTypeCommands";
import { getReadOnlyTypeValue } from "./propertyPanelTypeHelpers";

/**
 * Resolves the current simpleType derivation kind from structured diagram state.
 *
 * @param node - Diagram node being edited
 * @returns The current simpleType derivation kind
 */
export function getSimpleTypeDerivationKind(
  node: DiagramItem
): "restriction" | "list" | "union" {
  if (node.simpleTypeDerivationKind) {
    return node.simpleTypeDerivationKind;
  }
  if (node.simpleTypeUnionMemberTypes?.length) {
    return "union";
  }
  if (node.simpleTypeListItemType) {
    return "list";
  }
  return "restriction";
}

/**
 * Returns whether a node should be treated as a simpleType in the property panel.
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
  select.addEventListener("change", () => {
    const nextKind = select.value as "restriction" | "list" | "union";
    if (nextKind === currentKind) {
      return;
    }
    const command = createSimpleTypeKindCommand(node, nextKind);
    if (!command) {
      select.value = currentKind;
      return;
    }

    const payload = command.payload as {
      listItemType?: string;
      unionMemberTypes?: string[];
      baseType?: string;
      restrictions?: RestrictionFacets;
    };
    const prefix = hasInlineSimpleType ? "<anonymous simpleType>" : "simpleType";

    switch (nextKind) {
      case "list": {
        const nextItemType = payload.listItemType;
        if (!nextItemType) {
          select.value = currentKind;
          return;
        }
        node.simpleTypeDerivationKind = "list";
        node.simpleTypeListItemType = nextItemType;
        node.simpleTypeUnionMemberTypes = undefined;
        node.restrictions = undefined;
        node.type = `${prefix} (list of ${nextItemType})`;
        break;
      }
      case "union": {
        const nextMemberTypes = payload.unionMemberTypes;
        if (!nextMemberTypes?.length) {
          select.value = currentKind;
          return;
        }
        node.simpleTypeDerivationKind = "union";
        node.simpleTypeListItemType = undefined;
        node.simpleTypeUnionMemberTypes = nextMemberTypes;
        node.restrictions = undefined;
        node.type = `${prefix} (union of ${nextMemberTypes.join(", ")})`;
        break;
      }
      case "restriction": {
        const nextBaseType = payload.baseType;
        if (!nextBaseType) {
          select.value = currentKind;
          return;
        }
        node.simpleTypeDerivationKind = "restriction";
        node.simpleTypeListItemType = undefined;
        node.simpleTypeUnionMemberTypes = undefined;
        if (payload.restrictions) {
          node.restrictions = {
            enumeration: Array.isArray(payload.restrictions.enumeration)
              ? [...payload.restrictions.enumeration]
              : undefined,
            pattern: payload.restrictions.pattern ? [payload.restrictions.pattern] : undefined,
            length: payload.restrictions.length,
            minLength: payload.restrictions.minLength,
            maxLength: payload.restrictions.maxLength,
            minInclusive: payload.restrictions.minInclusive,
            maxInclusive: payload.restrictions.maxInclusive,
            minExclusive: payload.restrictions.minExclusive,
            maxExclusive: payload.restrictions.maxExclusive,
            totalDigits: payload.restrictions.totalDigits,
            fractionDigits: payload.restrictions.fractionDigits,
            whiteSpace: payload.restrictions.whiteSpace,
          };
        } else {
          node.restrictions = undefined;
        }
        node.type = `${prefix} (restricts ${nextBaseType})`;
        break;
      }
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
      const prefix = hasInlineSimpleType ? "<anonymous simpleType>" : "simpleType";
      node.simpleTypeDerivationKind = "list";
      node.simpleTypeListItemType = normalizedNext;
      node.simpleTypeUnionMemberTypes = undefined;
      node.restrictions = undefined;
      node.type = `${prefix} (list of ${normalizedNext})`;
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
    const prefix = hasInlineSimpleType ? "<anonymous simpleType>" : "simpleType";
    node.simpleTypeDerivationKind = "union";
    node.simpleTypeListItemType = undefined;
    node.simpleTypeUnionMemberTypes = parsedMemberTypes;
    node.restrictions = undefined;
    node.type = `${prefix} (union of ${parsedMemberTypes.join(", ")})`;
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

      if (memberType && !optionValues.includes(memberType)) {
        const currentOption = document.createElement("option");
        currentOption.value = memberType;
        currentOption.textContent = memberType;
        select.appendChild(currentOption);
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