/**
 * Properties-panel helpers for rendering and editing simple-type restriction facets.
 * Keeps the facet-specific UI and command-building logic separate from the main panel class.
 */

import type { SchemaCommand } from "../../shared/types";
import type { DiagramItem } from "../diagram";
import { toRestrictionFacets } from "../diagram";
import { createEditableField } from "./propertiesPanelDom";
import { resolveSimpleTypeId } from "./propertiesPanelCommands";
import type { RestrictionSnapshot } from "./propertiesPanelDraft";
import { hasEditableFacetValues } from "./propertiesPanelDraft";
import { getFacetIconStyle, type FacetPaletteConstruct } from "../palette/FacetIconStyles";
import { PaletteSchemaConstruct } from "../palette/PaletteSchemaConstruct";
import { appendFacetRemoveButton, renderValueListFacet } from "./propertiesPanelFacetLists";

/** Numeric facet keys editable in the Facets tab. */
type NumericRestrictionKey = "length" | "minLength" | "maxLength" | "totalDigits" | "fractionDigits";
/** String boundary facet keys editable in the Facets tab. */
type StringRestrictionKey = "minInclusive" | "maxInclusive" | "minExclusive" | "maxExclusive";

/** A single-value facet of the Facets tab: a number or a string. */
type ValueFacet = { label: string; construct: FacetPaletteConstruct } & (
  { key: NumericRestrictionKey; numeric: true } | { key: StringRestrictionKey; numeric: false }
);

/** The single-value facets of the Facets tab, in the order they are shown. */
const VALUE_FACETS: ValueFacet[] = [
  { label: "Length", key: "length", construct: PaletteSchemaConstruct.Length, numeric: true },
  { label: "Min Length", key: "minLength", construct: PaletteSchemaConstruct.MinLength, numeric: true },
  { label: "Max Length", key: "maxLength", construct: PaletteSchemaConstruct.MaxLength, numeric: true },
  { label: "Min Inclusive", key: "minInclusive", construct: PaletteSchemaConstruct.MinInclusive, numeric: false },
  { label: "Max Inclusive", key: "maxInclusive", construct: PaletteSchemaConstruct.MaxInclusive, numeric: false },
  { label: "Min Exclusive", key: "minExclusive", construct: PaletteSchemaConstruct.MinExclusive, numeric: false },
  { label: "Max Exclusive", key: "maxExclusive", construct: PaletteSchemaConstruct.MaxExclusive, numeric: false },
  { label: "Total Digits", key: "totalDigits", construct: PaletteSchemaConstruct.TotalDigits, numeric: true },
  { label: "Fraction Digits", key: "fractionDigits", construct: PaletteSchemaConstruct.FractionDigits, numeric: true },
];

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

  if (!restrictions || !hasEditableFacetValues(restrictions)) {
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
      payload: { typeId: simpleTypeId, restrictions: toRestrictionFacets(nextRestrictions) },
    });
  };
  const canRemoveFacet = countDefinedFacets(restrictions) > 1;

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

  for (const facet of VALUE_FACETS) {
    appendOptionalValueFacet(root, facet, restrictions[facet.key], buildAndDispatch, canRemoveFacet);
  }

  if (restrictions.whiteSpace !== undefined) {
    const field = createEditableField(
      "White Space",
      restrictions.whiteSpace,
      (next) => {
        const value = next.trim();
        if (value !== "" && value !== "preserve" && value !== "replace" && value !== "collapse") {
          return;
        }
        buildAndDispatch((draft) => {
          draft.whiteSpace = value || undefined;
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
 * @param facet - The facet
 * @param value - The value of the facet
 * @param buildAndDispatch - Applies a change to the facets and dispatches it
 * @param canRemove - Whether the facet may be removed
 */
function appendOptionalValueFacet(
  root: HTMLElement,
  facet: ValueFacet,
  value: number | string | undefined,
  buildAndDispatch: (updater: (next: RestrictionSnapshot) => void) => void,
  canRemove: boolean
): void {
  if (value === undefined) {
    return;
  }
  const assign = (draft: RestrictionSnapshot, text: string): void => {
    const trimmed = text.trim();
    if (facet.numeric) {
      draft[facet.key] = trimmed ? Number(trimmed) : undefined;
    } else {
      draft[facet.key] = trimmed || undefined;
    }
  };
  const field = createEditableField(
    facet.label,
    value.toString(),
    (next) => {
      buildAndDispatch((draft) => {
        assign(draft, next);
      });
    },
    undefined,
    getFacetIconStyle(facet.construct)
  );
  root.appendChild(
    appendFacetRemoveButton(field, facet.label, canRemove, () => {
      buildAndDispatch((draft) => {
        draft[facet.key] = undefined;
      });
    })
  );
}

/**
 * Counts the facets of a restriction that have a value; an empty list of values counts as no facet.
 *
 * @param restrictions - The facets
 * @returns The number of facets with a value
 */
function countDefinedFacets(restrictions: RestrictionSnapshot): number {
  // Object.values() drops undefined from the types of optional properties, but the draft sets them to undefined
  const values: Array<RestrictionSnapshot[keyof RestrictionSnapshot]> = Object.values(restrictions);
  return values.filter((value) => (Array.isArray(value) ? value.length > 0 : value !== undefined)).length;
}
