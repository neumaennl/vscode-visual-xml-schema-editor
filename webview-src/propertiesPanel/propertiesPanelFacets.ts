/**
 * Properties-panel helpers for rendering and editing simple-type restriction facets.
 * Keeps the facet-specific UI and command-building logic separate from the main panel class.
 */

import {
  countFacetsWithValues,
  isNumericFacet,
  validateFacetValue,
  WHITE_SPACE_VALUES,
  type SINGLE_VALUE_FACETS,
} from "../../shared/facets";
import type { RestrictionFacets } from "../../shared/types";
import { getFacets, type DiagramItem } from "../diagram";
import { createChoiceField, createEditableField } from "./propertiesPanelFields";
import { resolveSimpleTypeId } from "./propertiesPanelTargets";
import { getFacetIconStyle } from "../facetIcons";
import {
  appendFacetRemoveButton,
  LAST_FACET_TITLE,
  renderValueListFacet,
  type BuildAndDispatch,
} from "./propertiesPanelFacetLists";
import type { CommandDispatcher } from "./propertiesPanelCommands";
import type { PropertyRowAdder } from "./propertiesPanelDom";

/** The single-value facets that the Facets tab shows as text fields; `whiteSpace` has a field of its own. */
type ValueFacetName = Exclude<(typeof SINGLE_VALUE_FACETS)[number], "whiteSpace">;

/** The labels of the text fields of the single-value facets, in the order they are shown. */
const VALUE_FACET_LABELS = {
  length: "Length",
  minLength: "Min Length",
  maxLength: "Max Length",
  minInclusive: "Min Inclusive",
  maxInclusive: "Max Inclusive",
  minExclusive: "Min Exclusive",
  maxExclusive: "Max Exclusive",
  totalDigits: "Total Digits",
  fractionDigits: "Fraction Digits",
} satisfies Record<ValueFacetName, string>;

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
  dispatchCommand: CommandDispatcher,
  addPropertyToContainer: PropertyRowAdder
): HTMLElement {
  const root = document.createElement("div");
  root.className = "property-tab-content";

  const restrictions = getFacets(node);
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
  const buildAndDispatch: BuildAndDispatch = (updater) => {
    const nextRestrictions: RestrictionFacets = {
      ...restrictions,
      enumeration: restrictions.enumeration ? [...restrictions.enumeration] : undefined,
      pattern: restrictions.pattern ? [...restrictions.pattern] : undefined,
    };
    updater(nextRestrictions);

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

  for (const key of Object.keys(VALUE_FACET_LABELS) as ValueFacetName[]) {
    appendOptionalValueFacet(root, key, restrictions[key], buildAndDispatch, canRemoveFacet);
  }

  if (restrictions.whiteSpace !== undefined) {
    // The facet has three values, so it accepts only these; it is removed with its remove button
    const field = createChoiceField(
      "White Space",
      restrictions.whiteSpace,
      WHITE_SPACE_VALUES.map((value) => ({ value, label: value })),
      (next) => {
        buildAndDispatch((draft) => {
          draft.whiteSpace = next;
        });
        return true;
      },
      getFacetIconStyle("whiteSpace")
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
  buildAndDispatch: BuildAndDispatch,
  canRemove: boolean
): void {
  if (value === undefined) {
    return;
  }
  const label = VALUE_FACET_LABELS[key];
  const assign = (draft: RestrictionFacets, text: string): void => {
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
    (next, reject) => {
      const trimmed = next.trim();
      if (!trimmed && !canRemove) {
        reject(LAST_FACET_TITLE);
        return;
      }
      if (trimmed && isNumericFacet(key)) {
        const result = validateFacetValue(key, Number(trimmed));
        if (!result.valid) {
          reject(result.error);
          return;
        }
      }
      buildAndDispatch((draft) => {
        assign(draft, next);
      });
    },
    undefined,
    getFacetIconStyle(key)
  );
  root.appendChild(
    appendFacetRemoveButton(field, label, canRemove, () => {
      buildAndDispatch((draft) => {
        draft[key] = undefined;
      });
    })
  );
}
