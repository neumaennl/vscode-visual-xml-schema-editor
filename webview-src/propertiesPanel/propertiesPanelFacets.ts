/**
 * Properties-panel helpers for rendering and editing simple-type restriction facets.
 * Keeps the facet-specific UI and command-building logic separate from the main panel class.
 */

import { SchemaCommand } from "../../shared/types";
import { DiagramItem } from "../diagram";
import { createEditableField } from "./propertiesPanelDom";
import { resolveSimpleTypeId } from "./propertiesPanelCommands";
import { hasEditableFacetValues, RestrictionSnapshot } from "./propertiesPanelDraft";
import {
  getFacetIconStyle,
  type FacetIconStyle,
} from "../palette/FacetIconStyles";
import { PaletteSchemaConstruct } from "../palette/PaletteSchemaConstruct";
import { appendFacetRemoveButton, renderValueListFacet } from "./propertiesPanelFacetLists";

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
  if (!simpleTypeId) {
    addPropertyToContainer(root, "Facets", "Facets can only be edited for simple types");
    return root;
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

    // Without a base type, the restriction keeps its base, which may be an inline simple type
    dispatchCommand({
      type: "modifySimpleType",
      payload: {
        typeId: simpleTypeId,
        restrictions: {
          enumeration: nextRestrictions.enumeration,
          pattern: nextRestrictions.pattern,
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
  const canRemoveFacet = countDefinedFacets(restrictions) > 1;

  if (restrictions.enumeration?.length) {
    renderValueListFacet(
      root,
      "enumeration",
      restrictions.enumeration,
      buildAndDispatch,
      canRemoveFacet,
      () => buildAndDispatch((draft) => { draft.enumeration = undefined; })
    );
  }

  if (restrictions.pattern?.length) {
    renderValueListFacet(
      root,
      "pattern",
      restrictions.pattern,
      buildAndDispatch,
      canRemoveFacet,
      () => buildAndDispatch((draft) => { draft.pattern = undefined; })
    );
  }

  appendOptionalNumericFacet(
    root,
    "Length",
    restrictions.length,
    NUMERIC_FACET_ASSIGNERS.length,
    buildAndDispatch,
    getFacetIconStyle(PaletteSchemaConstruct.Length),
    canRemoveFacet
  );
  appendOptionalNumericFacet(
    root,
    "Min Length",
    restrictions.minLength,
    NUMERIC_FACET_ASSIGNERS.minLength,
    buildAndDispatch,
    getFacetIconStyle(PaletteSchemaConstruct.MinLength),
    canRemoveFacet
  );
  appendOptionalNumericFacet(
    root,
    "Max Length",
    restrictions.maxLength,
    NUMERIC_FACET_ASSIGNERS.maxLength,
    buildAndDispatch,
    getFacetIconStyle(PaletteSchemaConstruct.MaxLength),
    canRemoveFacet
  );
  appendOptionalStringFacet(
    root,
    "Min Inclusive",
    restrictions.minInclusive,
    STRING_FACET_ASSIGNERS.minInclusive,
    buildAndDispatch,
    getFacetIconStyle(PaletteSchemaConstruct.MinInclusive),
    canRemoveFacet
  );
  appendOptionalStringFacet(
    root,
    "Max Inclusive",
    restrictions.maxInclusive,
    STRING_FACET_ASSIGNERS.maxInclusive,
    buildAndDispatch,
    getFacetIconStyle(PaletteSchemaConstruct.MaxInclusive),
    canRemoveFacet
  );
  appendOptionalStringFacet(
    root,
    "Min Exclusive",
    restrictions.minExclusive,
    STRING_FACET_ASSIGNERS.minExclusive,
    buildAndDispatch,
    getFacetIconStyle(PaletteSchemaConstruct.MinExclusive),
    canRemoveFacet
  );
  appendOptionalStringFacet(
    root,
    "Max Exclusive",
    restrictions.maxExclusive,
    STRING_FACET_ASSIGNERS.maxExclusive,
    buildAndDispatch,
    getFacetIconStyle(PaletteSchemaConstruct.MaxExclusive),
    canRemoveFacet
  );
  appendOptionalNumericFacet(
    root,
    "Total Digits",
    restrictions.totalDigits,
    NUMERIC_FACET_ASSIGNERS.totalDigits,
    buildAndDispatch,
    getFacetIconStyle(PaletteSchemaConstruct.TotalDigits),
    canRemoveFacet
  );
  appendOptionalNumericFacet(
    root,
    "Fraction Digits",
    restrictions.fractionDigits,
    NUMERIC_FACET_ASSIGNERS.fractionDigits,
    buildAndDispatch,
    getFacetIconStyle(PaletteSchemaConstruct.FractionDigits),
    canRemoveFacet
  );

  if (restrictions.whiteSpace !== undefined) {
    const field = createEditableField("White Space", restrictions.whiteSpace, (next) => {
        const value = next.trim();
        if (value !== "" && value !== "preserve" && value !== "replace" && value !== "collapse") {
          return;
        }
        buildAndDispatch((draft) => {
          draft.whiteSpace = value || undefined;
        });
      }, undefined, getFacetIconStyle(PaletteSchemaConstruct.WhiteSpace));
    root.appendChild(
      appendFacetRemoveButton(field, "White Space", canRemoveFacet, () => {
        buildAndDispatch((draft) => { draft.whiteSpace = undefined; });
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
  buildAndDispatch: (updater: (next: RestrictionSnapshot) => void) => void,
  icon: FacetIconStyle,
  canRemove: boolean
): void {
  if (value === undefined) {
    return;
  }
  const field = createEditableField(label, value.toString(), (next) => {
      buildAndDispatch((draft) => {
        const trimmed = next.trim();
        assign(draft, trimmed ? Number(trimmed) : undefined);
      });
    }, undefined, icon);
  root.appendChild(
    appendFacetRemoveButton(field, label, canRemove, () => {
      buildAndDispatch((draft) => { assign(draft, undefined); });
    })
  );
}

function appendOptionalStringFacet(
  root: HTMLElement,
  label: string,
  value: string | undefined,
  assign: (draft: RestrictionSnapshot, value: string | undefined) => void,
  buildAndDispatch: (updater: (next: RestrictionSnapshot) => void) => void,
  icon: FacetIconStyle,
  canRemove: boolean
): void {
  if (value === undefined) {
    return;
  }
  const field = createEditableField(label, value, (next) => {
      buildAndDispatch((draft) => {
        assign(draft, next.trim() || undefined);
      });
    }, undefined, icon);
  root.appendChild(
    appendFacetRemoveButton(field, label, canRemove, () => {
      buildAndDispatch((draft) => { assign(draft, undefined); });
    })
  );
}

function countDefinedFacets(restrictions: RestrictionSnapshot): number {
  // Object.values() drops undefined from the types of optional properties, but the draft sets them to undefined
  const values: Array<RestrictionSnapshot[keyof RestrictionSnapshot]> = Object.values(restrictions);
  return values.filter((value) => (Array.isArray(value) ? value.length > 0 : value !== undefined)).length;
}
