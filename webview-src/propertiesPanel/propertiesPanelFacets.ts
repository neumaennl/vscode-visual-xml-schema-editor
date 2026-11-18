/**
 * Properties-panel helpers for rendering and editing simple-type restriction facets.
 * Keeps the facet-specific UI and command-building logic separate from the main panel class.
 */

import {
  countFacetsWithValues,
  isNumericFacet,
  isWhiteSpaceValue,
  type SINGLE_VALUE_FACETS,
} from "../../shared/facets";
import type { SchemaCommand } from "../../shared/types";
import type { DiagramItem } from "../diagram";
import { createEditableField } from "./propertiesPanelDom";
import { resolveSimpleTypeId } from "./propertiesPanelTargets";
import type { RestrictionSnapshot } from "./propertiesPanelDraft";
import { getFacetIconStyle, type FacetPaletteConstruct } from "../palette/FacetIconStyles";
import { PaletteSchemaConstruct } from "../palette/PaletteSchemaConstruct";
import { appendFacetRemoveButton, renderValueListFacet } from "./propertiesPanelFacetLists";

/** The single-value facets that the Facets tab shows as text fields; `whiteSpace` has a field of its own. */
type ValueFacetName = Exclude<(typeof SINGLE_VALUE_FACETS)[number], "whiteSpace">;

/** How the Facets tab shows a single-value facet. */
interface ValueFacetField {
  label: string;
  construct: FacetPaletteConstruct;
}

/** The text fields of the single-value facets, in the order they are shown. */
const VALUE_FACETS = {
  length: { label: "Length", construct: PaletteSchemaConstruct.Length },
  minLength: { label: "Min Length", construct: PaletteSchemaConstruct.MinLength },
  maxLength: { label: "Max Length", construct: PaletteSchemaConstruct.MaxLength },
  minInclusive: { label: "Min Inclusive", construct: PaletteSchemaConstruct.MinInclusive },
  maxInclusive: { label: "Max Inclusive", construct: PaletteSchemaConstruct.MaxInclusive },
  minExclusive: { label: "Min Exclusive", construct: PaletteSchemaConstruct.MinExclusive },
  maxExclusive: { label: "Max Exclusive", construct: PaletteSchemaConstruct.MaxExclusive },
  totalDigits: { label: "Total Digits", construct: PaletteSchemaConstruct.TotalDigits },
  fractionDigits: { label: "Fraction Digits", construct: PaletteSchemaConstruct.FractionDigits },
} satisfies Record<ValueFacetName, ValueFacetField>;

/**
 * Renders the Facets tab for a simple type or inline simple type.
 *
 * @param node - Diagram node whose facets should be shown
 * @param dispatchCommand - Callback used to emit schema commands
 * @param addPropertyToContainer - Helper used for read-only property rows
 * @returns The rendered tab element
 * @throws An {@link Error} if the node has no simple type; the panel only offers the tab for simple types
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
  if (!simpleTypeId) {
    throw new Error(`The Facets tab is only shown for simple types, not for ${node.id}`);
  }

  if (!restrictions || countFacetsWithValues(restrictions) === 0) {
    addPropertyToContainer(
      root,
      "Facets",
      "This type has no facets yet. To add a facet, drag one from the palette onto the node (available in a future release)."
    );
    return root;
  }
  const buildAndDispatch = (updater: (next: RestrictionSnapshot) => void): void => {
    const nextRestrictions: RestrictionSnapshot = {
      ...restrictions,
      enumeration: restrictions.enumeration ? [...restrictions.enumeration] : undefined,
      pattern: restrictions.pattern ? [...restrictions.pattern] : undefined,
    };
    updater(nextRestrictions);
    node.restrictions = nextRestrictions;

    // Without a base type, the restriction keeps its base, which may be an inline simple type
    dispatchCommand({
      type: "modifySimpleType",
      payload: { typeId: simpleTypeId, restrictions: nextRestrictions },
    });
  };
  const canRemoveFacet = countFacetsWithValues(restrictions) > 1;

  if (restrictions.enumeration?.length) {
    renderValueListFacet(root, "enumeration", restrictions.enumeration, buildAndDispatch, canRemoveFacet, () => {
      buildAndDispatch((draft) => {
        draft.enumeration = undefined;
      });
    });
  }

  if (restrictions.pattern?.length) {
    renderValueListFacet(root, "pattern", restrictions.pattern, buildAndDispatch, canRemoveFacet, () => {
      buildAndDispatch((draft) => {
        draft.pattern = undefined;
      });
    });
  }

  for (const key of Object.keys(VALUE_FACETS) as ValueFacetName[]) {
    appendOptionalValueFacet(root, key, restrictions[key], buildAndDispatch, canRemoveFacet);
  }

  if (restrictions.whiteSpace !== undefined) {
    const field = createEditableField(
      "White Space",
      restrictions.whiteSpace,
      (next) => {
        const value = next.trim();
        if (value !== "" && !isWhiteSpaceValue(value)) {
          return;
        }
        buildAndDispatch((draft) => {
          draft.whiteSpace = value === "" ? undefined : value;
        });
      },
      undefined,
      getFacetIconStyle(PaletteSchemaConstruct.WhiteSpace)
    );
    root.appendChild(
      appendFacetRemoveButton(field, "White Space", canRemoveFacet, () => {
        buildAndDispatch((draft) => {
          draft.whiteSpace = undefined;
        });
      })
    );
  }

  return root;
}

/**
 * Adds the editable field of a single-value facet, if the facet has a value. An empty value removes the
 * facet.
 *
 * @param root - The tab
 * @param key - The facet
 * @param value - The value of the facet
 * @param buildAndDispatch - Applies a change to the facets and dispatches it
 * @param canRemove - Whether the facet may be removed
 */
function appendOptionalValueFacet(
  root: HTMLElement,
  key: ValueFacetName,
  value: number | string | undefined,
  buildAndDispatch: (updater: (next: RestrictionSnapshot) => void) => void,
  canRemove: boolean
): void {
  if (value === undefined) {
    return;
  }
  const { label, construct } = VALUE_FACETS[key];
  const assign = (draft: RestrictionSnapshot, text: string): void => {
    const trimmed = text.trim();
    if (isNumericFacet(key)) {
      draft[key] = trimmed ? Number(trimmed) : undefined;
    } else {
      draft[key] = trimmed || undefined;
    }
  };
  const field = createEditableField(
    label,
    value.toString(),
    (next) => {
      buildAndDispatch((draft) => {
        assign(draft, next);
      });
    },
    undefined,
    getFacetIconStyle(construct)
  );
  root.appendChild(
    appendFacetRemoveButton(field, label, canRemove, () => {
      buildAndDispatch((draft) => {
        draft[key] = undefined;
      });
    })
  );
}
