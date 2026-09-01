import { PaletteSchemaConstruct } from "./PaletteSchemaConstruct";
import { FACET_ICON_STYLES } from "./FacetIconStyles";

/**
 * Palette item definitions for editor drag-and-drop.
 * Mirrors the prototype grouping/icons while marking unsupported operations.
 */

/**
 * Single draggable item shown in the palette.
 */
export interface PaletteItem {
  /** Stable item id used as drag payload. */
  id: PaletteSchemaConstruct;
  /** User-facing display name. */
  name: string;
  /** VS Code codicon name (without the "codicon-" prefix). */
  icon: string;
  /** Accent color used by the icon. */
  color: string;
  /** Short help text shown as tooltip. */
  description: string;
  /** Whether this item can currently be dropped/executed. */
  enabled: boolean;
}

/**
 * A labelled set of related palette items.
 */
export interface PaletteGroup {
  /** Group title shown in the palette. */
  label: string;
  /** Group entries. */
  items: PaletteItem[];
}

/**
 * Grouped palette entries for currently executable operations.
 */
export const paletteGroups: PaletteGroup[] = [
  {
    label: "Structure",
    items: [
      {
        id: PaletteSchemaConstruct.Element,
        name: "element",
        icon: "code",
        color: "#dcdcaa",
        description: "Named element declaration",
        enabled: true,
      },
      {
        id: PaletteSchemaConstruct.Attribute,
        name: "attribute",
        icon: "mention",
        color: "#9cdcfe",
        description: "Attribute on an element",
        enabled: true,
      },
      {
        id: PaletteSchemaConstruct.Group,
        name: "group",
        icon: "collection",
        color: "#c586c0",
        description: "Reusable model group",
        enabled: true,
      },
      {
        id: PaletteSchemaConstruct.Any,
        name: "any",
        icon: "symbol-misc",
        color: "#d7ba7d",
        description: "xs:any wildcard",
        enabled: false,
      },
    ],
  },
  {
    label: "Compositors",
    items: [
      {
        id: PaletteSchemaConstruct.Sequence,
        name: "sequence",
        icon: "list-ordered",
        color: "#79c0a4",
        description: "Ordered list of children",
        enabled: true,
      },
      {
        id: PaletteSchemaConstruct.Choice,
        name: "choice",
        icon: "worktree",
        color: "#c586c0",
        description: "Exactly one of the children",
        enabled: true,
      },
      {
        id: PaletteSchemaConstruct.All,
        name: "all",
        icon: "layers",
        color: "#ce9178",
        description: "Each child once, any order",
        enabled: true,
      },
    ],
  },
  {
    label: "Types",
    items: [
      {
        id: PaletteSchemaConstruct.ComplexType,
        name: "complexType",
        icon: "symbol-class",
        color: "#7aa6ff",
        description: "Nested structure with children",
        enabled: true,
      },
      {
        id: PaletteSchemaConstruct.SimpleType,
        name: "simpleType",
        icon: "symbol-method",
        color: "#aac7ff",
        description: "Restriction of a primitive type",
        enabled: true,
      },
      {
        id: PaletteSchemaConstruct.Extension,
        name: "extension",
        icon: "diff-added",
        color: "#6a9955",
        description: "Extend an existing type",
        enabled: true,
      },
      {
        id: PaletteSchemaConstruct.Restriction,
        name: "restriction",
        icon: "diff-removed",
        color: "#f48771",
        description: "Restrict an existing type",
        enabled: true,
      },
    ],
  },
  {
    label: "Facets",
    items: [
      {
        id: PaletteSchemaConstruct.Enumeration,
        name: "enumeration",
        ...FACET_ICON_STYLES[PaletteSchemaConstruct.Enumeration],
        description: "Allowed value set",
        enabled: false,
      },
      {
        id: PaletteSchemaConstruct.Pattern,
        name: "pattern",
        ...FACET_ICON_STYLES[PaletteSchemaConstruct.Pattern],
        description: "Regex pattern",
        enabled: false,
      },
      {
        id: PaletteSchemaConstruct.Length,
        name: "length",
        ...FACET_ICON_STYLES[PaletteSchemaConstruct.Length],
        description: "Exact length",
        enabled: false,
      },
      {
        id: PaletteSchemaConstruct.MinLength,
        name: "minLength",
        ...FACET_ICON_STYLES[PaletteSchemaConstruct.MinLength],
        description: "Minimum length",
        enabled: false,
      },
      {
        id: PaletteSchemaConstruct.MaxLength,
        name: "maxLength",
        ...FACET_ICON_STYLES[PaletteSchemaConstruct.MaxLength],
        description: "Maximum length",
        enabled: false,
      },
      {
        id: PaletteSchemaConstruct.MinExclusive,
        name: "minExclusive",
        ...FACET_ICON_STYLES[PaletteSchemaConstruct.MinExclusive],
        description: "Exclusive lower bound",
        enabled: false,
      },
      {
        id: PaletteSchemaConstruct.MinInclusive,
        name: "minInclusive",
        ...FACET_ICON_STYLES[PaletteSchemaConstruct.MinInclusive],
        description: "Inclusive lower bound",
        enabled: false,
      },
      {
        id: PaletteSchemaConstruct.MaxExclusive,
        name: "maxExclusive",
        ...FACET_ICON_STYLES[PaletteSchemaConstruct.MaxExclusive],
        description: "Exclusive upper bound",
        enabled: false,
      },
      {
        id: PaletteSchemaConstruct.MaxInclusive,
        name: "maxInclusive",
        ...FACET_ICON_STYLES[PaletteSchemaConstruct.MaxInclusive],
        description: "Inclusive upper bound",
        enabled: false,
      },
      {
        id: PaletteSchemaConstruct.TotalDigits,
        name: "totalDigits",
        ...FACET_ICON_STYLES[PaletteSchemaConstruct.TotalDigits],
        description: "Total number of digits",
        enabled: false,
      },
      {
        id: PaletteSchemaConstruct.FractionDigits,
        name: "fractionDigits",
        ...FACET_ICON_STYLES[PaletteSchemaConstruct.FractionDigits],
        description: "Number of fraction digits",
        enabled: false,
      },
      {
        id: PaletteSchemaConstruct.WhiteSpace,
        name: "whiteSpace",
        ...FACET_ICON_STYLES[PaletteSchemaConstruct.WhiteSpace],
        description: "Whitespace normalization",
        enabled: false,
      },
    ],
  },
];

/**
 * MIME type used for palette drag event payloads.
 */
export const PALETTE_MIME_TYPE = "application/x-xsd-component";

let activeDraggedPaletteSchemaConstruct: PaletteSchemaConstruct | null = null;

/**
 * Track the currently dragged XML schema construct from the palette.
 *
 * Some dragover environments do not expose custom MIME payload values via
 * dataTransfer.getData(), so this state is used as a fallback.
 */
export function setActiveDraggedPaletteSchemaConstruct(kind: PaletteSchemaConstruct | null): void {
  activeDraggedPaletteSchemaConstruct = kind;
}

/**
 * Get the currently dragged XML schema construct from the palette, if any.
 */
export function getActiveDraggedPaletteSchemaConstruct(): PaletteSchemaConstruct | null {
  return activeDraggedPaletteSchemaConstruct;
}
