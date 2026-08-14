/**
 * Property-panel helpers for rendering and editing simple-type restriction facets.
 * Keeps the facet-specific UI and command-building logic separate from the main panel class.
 */

import { SchemaCommand } from "../../shared/types";
import { DiagramItem } from "../diagram";
import { createEditableField } from "./propertyPanelDom";
import { resolveSimpleTypeId } from "./propertyPanelCommands";
import { extractBaseType } from "./propertyPanelSimpleTypeCommands";
import { hasEditableFacetValues, RestrictionSnapshot } from "./propertyPanelDraft";

/** Numeric facet keys editable in the Facets tab. */
type NumericRestrictionKey = "length" | "minLength" | "maxLength" | "totalDigits" | "fractionDigits";
/** String boundary facet keys editable in the Facets tab. */
type StringRestrictionKey = "minInclusive" | "maxInclusive" | "minExclusive" | "maxExclusive";

const NUMERIC_FACET_ASSIGNERS: Record<
  NumericRestrictionKey,
  (draft: RestrictionSnapshot, value: number | undefined) => void
> = {
  length: (draft, value) => { draft.length = value; },
  minLength: (draft, value) => { draft.minLength = value; },
  maxLength: (draft, value) => { draft.maxLength = value; },
  totalDigits: (draft, value) => { draft.totalDigits = value; },
  fractionDigits: (draft, value) => { draft.fractionDigits = value; },
};

const STRING_FACET_ASSIGNERS: Record<
  StringRestrictionKey,
  (draft: RestrictionSnapshot, value: string | undefined) => void
> = {
  minInclusive: (draft, value) => { draft.minInclusive = value; },
  maxInclusive: (draft, value) => { draft.maxInclusive = value; },
  minExclusive: (draft, value) => { draft.minExclusive = value; },
  maxExclusive: (draft, value) => { draft.maxExclusive = value; },
};

/**
 * Renders the Facets tab for a simple type or inline simple type.
 *
 * @param node - Diagram node whose facets should be shown
 * @param dispatchCommand - Callback used to emit schema commands
 * @param addPropertyToContainer - Helper used for read-only property rows
 * @returns The rendered tab element
 */
export function renderFacetsTab(
  node: DiagramItem,
  dispatchCommand: (command: SchemaCommand) => void,
  addPropertyToContainer: (container: HTMLElement, name: string, value: string) => void
): HTMLElement {
  const root = document.createElement("div");
  root.className = "property-tab-content";

  const restrictions = node.restrictions;
  const simpleTypeId = resolveSimpleTypeId(node);
  const baseType = extractBaseType(node.type);
  if (!simpleTypeId || !baseType) {
    addPropertyToContainer(root, "Facets", "Facets can only be edited for simple types");
    return root;
  }

  if (!restrictions || !hasEditableFacetValues(restrictions)) {
    addPropertyToContainer(
      root,
      "Facets",
      "This type has no facets yet. To add a facet, right-click the node and choose 'Add facet…' (available in a future release)."
    );
    return root;
  }

  const buildAndDispatch = (updater: (next: RestrictionSnapshot) => void): void => {
    const nextRestrictions: RestrictionSnapshot = {
      enumeration: restrictions.enumeration ? [...restrictions.enumeration] : undefined,
      pattern: restrictions.pattern ? [...restrictions.pattern] : undefined,
      length: restrictions.length,
      minLength: restrictions.minLength,
      maxLength: restrictions.maxLength,
      minInclusive: restrictions.minInclusive,
      maxInclusive: restrictions.maxInclusive,
      minExclusive: restrictions.minExclusive,
      maxExclusive: restrictions.maxExclusive,
      totalDigits: restrictions.totalDigits,
      fractionDigits: restrictions.fractionDigits,
      whiteSpace: restrictions.whiteSpace,
    };
    updater(nextRestrictions);
    node.restrictions = nextRestrictions;

    dispatchCommand({
      type: "modifySimpleType",
      payload: {
        typeId: simpleTypeId,
        baseType,
        restrictions: {
          enumeration: nextRestrictions.enumeration,
          pattern: nextRestrictions.pattern?.[0],
          length: nextRestrictions.length,
          minLength: nextRestrictions.minLength,
          maxLength: nextRestrictions.maxLength,
          minInclusive: nextRestrictions.minInclusive,
          maxInclusive: nextRestrictions.maxInclusive,
          minExclusive: nextRestrictions.minExclusive,
          maxExclusive: nextRestrictions.maxExclusive,
          totalDigits: nextRestrictions.totalDigits,
          fractionDigits: nextRestrictions.fractionDigits,
          whiteSpace:
            nextRestrictions.whiteSpace === "preserve" ||
            nextRestrictions.whiteSpace === "replace" ||
            nextRestrictions.whiteSpace === "collapse"
              ? nextRestrictions.whiteSpace
              : undefined,
        },
      },
    });
  };

  if (restrictions.enumeration?.length) {
    renderEnumerationEditor(root, restrictions.enumeration, buildAndDispatch);
  }

  if (restrictions.pattern?.length) {
    root.appendChild(
      createEditableField("Pattern", restrictions.pattern[0] ?? "", (next) => {
        buildAndDispatch((draft) => {
          const value = next.trim();
          draft.pattern = value ? [value] : undefined;
        });
      })
    );
  }

  appendOptionalNumericFacet(
    root,
    "Length",
    restrictions.length,
    NUMERIC_FACET_ASSIGNERS.length,
    buildAndDispatch
  );
  appendOptionalNumericFacet(
    root,
    "Min Length",
    restrictions.minLength,
    NUMERIC_FACET_ASSIGNERS.minLength,
    buildAndDispatch
  );
  appendOptionalNumericFacet(
    root,
    "Max Length",
    restrictions.maxLength,
    NUMERIC_FACET_ASSIGNERS.maxLength,
    buildAndDispatch
  );
  appendOptionalStringFacet(
    root,
    "Min Inclusive",
    restrictions.minInclusive,
    STRING_FACET_ASSIGNERS.minInclusive,
    buildAndDispatch
  );
  appendOptionalStringFacet(
    root,
    "Max Inclusive",
    restrictions.maxInclusive,
    STRING_FACET_ASSIGNERS.maxInclusive,
    buildAndDispatch
  );
  appendOptionalStringFacet(
    root,
    "Min Exclusive",
    restrictions.minExclusive,
    STRING_FACET_ASSIGNERS.minExclusive,
    buildAndDispatch
  );
  appendOptionalStringFacet(
    root,
    "Max Exclusive",
    restrictions.maxExclusive,
    STRING_FACET_ASSIGNERS.maxExclusive,
    buildAndDispatch
  );
  appendOptionalNumericFacet(
    root,
    "Total Digits",
    restrictions.totalDigits,
    NUMERIC_FACET_ASSIGNERS.totalDigits,
    buildAndDispatch
  );
  appendOptionalNumericFacet(
    root,
    "Fraction Digits",
    restrictions.fractionDigits,
    NUMERIC_FACET_ASSIGNERS.fractionDigits,
    buildAndDispatch
  );

  if (restrictions.whiteSpace !== undefined) {
    root.appendChild(
      createEditableField("White Space", restrictions.whiteSpace, (next) => {
        const value = next.trim();
        if (value !== "" && value !== "preserve" && value !== "replace" && value !== "collapse") {
          return;
        }
        buildAndDispatch((draft) => {
          draft.whiteSpace = value || undefined;
        });
      })
    );
  }

  return root;
}

function appendOptionalNumericFacet(
  root: HTMLElement,
  label: string,
  value: number | undefined,
  assign: (draft: RestrictionSnapshot, value: number | undefined) => void,
  buildAndDispatch: (updater: (next: RestrictionSnapshot) => void) => void
): void {
  if (value === undefined) {
    return;
  }
  root.appendChild(
    createEditableField(label, value.toString(), (next) => {
      buildAndDispatch((draft) => {
        const trimmed = next.trim();
        assign(draft, trimmed ? Number(trimmed) : undefined);
      });
    })
  );
}

function appendOptionalStringFacet(
  root: HTMLElement,
  label: string,
  value: string | undefined,
  assign: (draft: RestrictionSnapshot, value: string | undefined) => void,
  buildAndDispatch: (updater: (next: RestrictionSnapshot) => void) => void
): void {
  if (value === undefined) {
    return;
  }
  root.appendChild(
    createEditableField(label, value, (next) => {
      buildAndDispatch((draft) => {
        assign(draft, next.trim() || undefined);
      });
    })
  );
}

/**
 * Renders the enumeration facet as a list of removable value chips with an add control,
 * instead of a single comma-separated textbox.
 *
 * @param root - Container to append the editor to
 * @param initialValues - Current enumeration values
 * @param buildAndDispatch - Callback used to commit a restriction-snapshot update
 */
function renderEnumerationEditor(
  root: HTMLElement,
  initialValues: string[],
  buildAndDispatch: (updater: (next: RestrictionSnapshot) => void) => void
): void {
  const field = document.createElement("div");
  field.className = "property";

  const label = document.createElement("label");
  label.textContent = "Enumeration:";
  field.appendChild(label);

  const list = document.createElement("div");
  list.className = "property-enum-list";
  field.appendChild(list);

  let values = [...initialValues];
  let isAdding = false;
  let draggedIndex: number | null = null;

  const commit = (): void => {
    buildAndDispatch((draft) => {
      draft.enumeration = values.length > 0 ? [...values] : undefined;
    });
  };

  const moveValueTo = (sourceIndex: number, targetIndex: number): void => {
    if (
      sourceIndex < 0 ||
      sourceIndex >= values.length ||
      targetIndex < 0 ||
      targetIndex >= values.length ||
      sourceIndex === targetIndex
    ) {
      return;
    }
    const next = [...values];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    values = next;
    commit();
    render();
  };

  const clearDragOverStyling = (): void => {
    list.querySelectorAll(".property-enum-chip-drag-over").forEach((el) => {
      el.classList.remove("property-enum-chip-drag-over");
    });
  };

  const render = (): void => {
    list.replaceChildren();

    values.forEach((value, index) => {
      const chip = document.createElement("span");
      chip.className = "property-enum-chip";
      chip.draggable = true;
      chip.title = "Drag to reorder";

      const valueText = document.createElement("span");
      valueText.className = "property-enum-chip-value";
      valueText.textContent = value;
      chip.appendChild(valueText);

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "property-enum-chip-remove";
      removeButton.setAttribute("aria-label", `Remove ${value}`);
      removeButton.title = `Remove ${value}`;
      const icon = document.createElement("span");
      icon.className = "codicon codicon-close";
      icon.setAttribute("aria-hidden", "true");
      removeButton.appendChild(icon);
      removeButton.addEventListener("click", () => {
        values = values.filter((_, i) => i !== index);
        commit();
        render();
      });
      chip.appendChild(removeButton);

      chip.addEventListener("dragstart", (event) => {
        draggedIndex = index;
        event.dataTransfer?.setData("text/plain", String(index));
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
        }
        chip.classList.add("property-enum-chip-dragging");
      });
      chip.addEventListener("dragend", () => {
        chip.classList.remove("property-enum-chip-dragging");
        clearDragOverStyling();
        draggedIndex = null;
      });
      chip.addEventListener("dragover", (event) => {
        event.preventDefault();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = "move";
        }
        chip.classList.add("property-enum-chip-drag-over");
      });
      chip.addEventListener("dragleave", () => {
        chip.classList.remove("property-enum-chip-drag-over");
      });
      chip.addEventListener("drop", (event) => {
        event.preventDefault();
        chip.classList.remove("property-enum-chip-drag-over");
        const sourceIndex = draggedIndex ?? Number(event.dataTransfer?.getData("text/plain"));
        moveValueTo(sourceIndex, index);
      });

      list.appendChild(chip);
    });

    if (isAdding) {
      const input = document.createElement("input");
      input.type = "text";
      input.className = "property-enum-add-input";
      const finishAdding = (): void => {
        const next = input.value.trim();
        isAdding = false;
        if (next && !values.includes(next)) {
          values = [...values, next];
          commit();
        }
        render();
      };
      input.addEventListener("blur", finishAdding);
      input.addEventListener("keydown", (event: KeyboardEvent) => {
        if (event.key === "Enter") {
          event.preventDefault();
          input.blur();
        }
        if (event.key === "Escape") {
          isAdding = false;
          render();
        }
      });
      list.appendChild(input);
      input.focus();
    } else {
      const addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className = "property-enum-add-button";
      addButton.textContent = "+ value";
      addButton.addEventListener("click", () => {
        isAdding = true;
        render();
      });
      list.appendChild(addButton);
    }
  };

  render();
  root.appendChild(field);
}
