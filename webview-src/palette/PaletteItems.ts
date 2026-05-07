import { PaletteSchemaConstruct } from "./PaletteSchemaConstruct";

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
        enabled: false,
      },
      {
        id: PaletteSchemaConstruct.Choice,
        name: "choice",
        icon: "worktree",
        color: "#c586c0",
        description: "Exactly one of the children",
        enabled: false,
      },
      {
        id: PaletteSchemaConstruct.All,
        name: "all",
        icon: "layers",
        color: "#ce9178",
        description: "Each child once, any order",
        enabled: false,
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
        enabled: false,
      },
      {
        id: PaletteSchemaConstruct.Restriction,
        name: "restriction",
        icon: "diff-removed",
        color: "#f48771",
        description: "Restrict an existing type",
        enabled: false,
      },
    ],
  },
  {
    label: "Facets",
    items: [
      {
        id: PaletteSchemaConstruct.Enumeration,
        name: "enumeration",
        icon: "symbol-enum",
        color: "#dcdcaa",
        description: "Allowed value set",
        enabled: false,
      },
      {
        id: PaletteSchemaConstruct.Pattern,
        name: "pattern",
        icon: "regex",
        color: "#c586c0",
        description: "Regex pattern",
        enabled: false,
      },
      {
        id: PaletteSchemaConstruct.Length,
        name: "length",
        icon: "symbol-ruler",
        color: "#79c0a4",
        description: "Length / min / max",
        enabled: false,
      },
      {
        id: PaletteSchemaConstruct.Range,
        name: "range",
        icon: "arrow-both",
        color: "#9cdcfe",
        description: "Min/max numeric value",
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
