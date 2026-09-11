/**
 * Single source of truth for facet icon/color styling.
 * Shared by the palette (PaletteItems.ts) and the property panel's Facets tab
 * so a facet always looks the same in both places.
 */

import { PaletteSchemaConstruct } from "./PaletteSchemaConstruct";

/** Codicon name/color pair used to render a facet's icon. */
export interface FacetIconStyle {
  /** VS Code codicon name (without the "codicon-" prefix). */
  icon: string;
  /** Accent color used by the icon. */
  color: string;
}

/** Facet-related palette constructs that own an icon style. */
export type FacetPaletteConstruct =
  | PaletteSchemaConstruct.MinExclusive
  | PaletteSchemaConstruct.MinInclusive
  | PaletteSchemaConstruct.MaxExclusive
  | PaletteSchemaConstruct.MaxInclusive
  | PaletteSchemaConstruct.TotalDigits
  | PaletteSchemaConstruct.FractionDigits
  | PaletteSchemaConstruct.Length
  | PaletteSchemaConstruct.MinLength
  | PaletteSchemaConstruct.MaxLength
  | PaletteSchemaConstruct.Enumeration
  | PaletteSchemaConstruct.WhiteSpace
  | PaletteSchemaConstruct.Pattern;

/**
 * Icon/color styling for each facet-related palette construct.
 */
export const FACET_ICON_STYLES: Record<FacetPaletteConstruct, FacetIconStyle> = {
  [PaletteSchemaConstruct.MinExclusive]: { icon: "arrow-both", color: "#9cdcfe" },
  [PaletteSchemaConstruct.MinInclusive]: { icon: "arrow-both", color: "#9cdcfe" },
  [PaletteSchemaConstruct.MaxExclusive]: { icon: "arrow-both", color: "#9cdcfe" },
  [PaletteSchemaConstruct.MaxInclusive]: { icon: "arrow-both", color: "#9cdcfe" },
  [PaletteSchemaConstruct.TotalDigits]: { icon: "symbol-numeric", color: "#b5cea8" },
  [PaletteSchemaConstruct.FractionDigits]: { icon: "symbol-numeric", color: "#b5cea8" },
  [PaletteSchemaConstruct.Length]: { icon: "symbol-ruler", color: "#79c0a4" },
  [PaletteSchemaConstruct.MinLength]: { icon: "symbol-ruler", color: "#79c0a4" },
  [PaletteSchemaConstruct.MaxLength]: { icon: "symbol-ruler", color: "#79c0a4" },
  [PaletteSchemaConstruct.Enumeration]: { icon: "symbol-enum", color: "#dcdcaa" },
  [PaletteSchemaConstruct.WhiteSpace]: { icon: "whitespace", color: "#808080" },
  [PaletteSchemaConstruct.Pattern]: { icon: "regex", color: "#c586c0" },
};

/**
 * Gets the shared palette icon style for a restriction facet.
 *
 * @param facet - Facet palette construct
 * @returns The matching shared facet icon style
 */
export function getFacetIconStyle(facet: FacetPaletteConstruct): FacetIconStyle {
  return FACET_ICON_STYLES[facet];
}
