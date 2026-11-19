/**
 * The entries of the palette: the schema constructs that can be dragged from it, grouped, with their names,
 * icons and descriptions.
 */

import { DraggableSchemaConstruct } from "../dragAndDrop/DraggableSchemaConstruct";
import { getFacetIconStyle } from "../facetIcons";

/**
 * Single draggable item shown in the palette.
 */
export interface PaletteItem {
  /** Stable item id used as drag payload. */
  id: DraggableSchemaConstruct;
  /** User-facing display name. */
  name: string;
  /** VS Code codicon name (without the `"codicon-"` prefix). */
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
        id: DraggableSchemaConstruct.Element,
        name: "element",
        icon: "code",
        color: "#dcdcaa",
        description: "Named element declaration",
        enabled: true,
      },
      {
        id: DraggableSchemaConstruct.Attribute,
        name: "attribute",
        icon: "mention",
        color: "#9cdcfe",
        description: "Attribute on an element",
        enabled: true,
      },
      {
        id: DraggableSchemaConstruct.Group,
        name: "group",
        icon: "collection",
        color: "#c586c0",
        description: "Reusable model group",
        enabled: true,
      },
      {
        id: DraggableSchemaConstruct.Any,
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
        id: DraggableSchemaConstruct.Sequence,
        name: "sequence",
        icon: "list-ordered",
        color: "#79c0a4",
        description: "Ordered list of children",
        enabled: true,
      },
      {
        id: DraggableSchemaConstruct.Choice,
        name: "choice",
        icon: "worktree",
        color: "#c586c0",
        description: "Exactly one of the children",
        enabled: true,
      },
      {
        id: DraggableSchemaConstruct.All,
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
        id: DraggableSchemaConstruct.ComplexType,
        name: "complexType",
        icon: "symbol-class",
        color: "#7aa6ff",
        description: "Nested structure with children",
        enabled: true,
      },
      {
        id: DraggableSchemaConstruct.SimpleType,
        name: "simpleType",
        icon: "symbol-method",
        color: "#aac7ff",
        description: "Restriction of a primitive type",
        enabled: true,
      },
      {
        id: DraggableSchemaConstruct.Extension,
        name: "extension",
        icon: "diff-added",
        color: "#6a9955",
        description: "Extend an existing type",
        enabled: true,
      },
      {
        id: DraggableSchemaConstruct.Restriction,
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
        id: DraggableSchemaConstruct.Enumeration,
        name: "enumeration",
        ...getFacetIconStyle("enumeration"),
        description: "Allowed value set",
        enabled: true,
      },
      {
        id: DraggableSchemaConstruct.Pattern,
        name: "pattern",
        ...getFacetIconStyle("pattern"),
        description: "Regex pattern",
        enabled: true,
      },
      {
        id: DraggableSchemaConstruct.Length,
        name: "length",
        ...getFacetIconStyle("length"),
        description: "Exact length",
        enabled: true,
      },
      {
        id: DraggableSchemaConstruct.MinLength,
        name: "minLength",
        ...getFacetIconStyle("minLength"),
        description: "Minimum length",
        enabled: true,
      },
      {
        id: DraggableSchemaConstruct.MaxLength,
        name: "maxLength",
        ...getFacetIconStyle("maxLength"),
        description: "Maximum length",
        enabled: true,
      },
      {
        id: DraggableSchemaConstruct.MinExclusive,
        name: "minExclusive",
        ...getFacetIconStyle("minExclusive"),
        description: "Exclusive lower bound",
        enabled: true,
      },
      {
        id: DraggableSchemaConstruct.MinInclusive,
        name: "minInclusive",
        ...getFacetIconStyle("minInclusive"),
        description: "Inclusive lower bound",
        enabled: true,
      },
      {
        id: DraggableSchemaConstruct.MaxExclusive,
        name: "maxExclusive",
        ...getFacetIconStyle("maxExclusive"),
        description: "Exclusive upper bound",
        enabled: true,
      },
      {
        id: DraggableSchemaConstruct.MaxInclusive,
        name: "maxInclusive",
        ...getFacetIconStyle("maxInclusive"),
        description: "Inclusive upper bound",
        enabled: true,
      },
      {
        id: DraggableSchemaConstruct.TotalDigits,
        name: "totalDigits",
        ...getFacetIconStyle("totalDigits"),
        description: "Total number of digits",
        enabled: true,
      },
      {
        id: DraggableSchemaConstruct.FractionDigits,
        name: "fractionDigits",
        ...getFacetIconStyle("fractionDigits"),
        description: "Number of fraction digits",
        enabled: true,
      },
      {
        id: DraggableSchemaConstruct.WhiteSpace,
        name: "whiteSpace",
        ...getFacetIconStyle("whiteSpace"),
        description: "Whitespace normalization",
        enabled: true,
      },
    ],
  },
];
