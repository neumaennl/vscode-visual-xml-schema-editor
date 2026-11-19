/**
 * The look of each facet: its codicon and color, so that a facet looks the same in the palette and in
 * the Facets tab of the properties panel.
 */

import type { FacetName } from "../shared/facets";

/** Codicon name/color pair used to render a facet's icon. */
export interface FacetIconStyle {
  /** VS Code codicon name (without the `"codicon-"` prefix). */
  icon: string;
  /** Accent color used by the icon. */
  color: string;
}

/** The icon and color of each facet. */
const FACET_ICON_STYLES: Record<FacetName, FacetIconStyle> = {
  minExclusive: { icon: "arrow-both", color: "#9cdcfe" },
  minInclusive: { icon: "arrow-both", color: "#9cdcfe" },
  maxExclusive: { icon: "arrow-both", color: "#9cdcfe" },
  maxInclusive: { icon: "arrow-both", color: "#9cdcfe" },
  totalDigits: { icon: "symbol-numeric", color: "#b5cea8" },
  fractionDigits: { icon: "symbol-numeric", color: "#b5cea8" },
  length: { icon: "symbol-ruler", color: "#79c0a4" },
  minLength: { icon: "symbol-ruler", color: "#79c0a4" },
  maxLength: { icon: "symbol-ruler", color: "#79c0a4" },
  enumeration: { icon: "symbol-enum", color: "#dcdcaa" },
  whiteSpace: { icon: "whitespace", color: "#808080" },
  pattern: { icon: "regex", color: "#c586c0" },
};

/**
 * Returns the icon and color of a facet.
 *
 * @param facet - The facet
 * @returns The style of its icon
 */
export function getFacetIconStyle(facet: FacetName): FacetIconStyle {
  return FACET_ICON_STYLES[facet];
}
