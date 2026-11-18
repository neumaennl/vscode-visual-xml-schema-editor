/**
 * Commands that add, remove and modify simple types.
 */

import type { BaseCommand } from "./base.js";

/**
 * Restriction facets for simple types.
 */
export interface RestrictionFacets {
  /** Minimum value (inclusive) */
  minInclusive?: string;
  /** Maximum value (inclusive) */
  maxInclusive?: string;
  /** Minimum value (exclusive) */
  minExclusive?: string;
  /** Maximum value (exclusive) */
  maxExclusive?: string;
  /** Exact length */
  length?: number;
  /** Minimum length */
  minLength?: number;
  /** Maximum length */
  maxLength?: number;
  /** Regular expression patterns; a value is valid if it matches any of them */
  pattern?: string[];
  /** Enumeration values */
  enumeration?: string[];
  /** Whitespace handling */
  whiteSpace?: "preserve" | "replace" | "collapse";
  /** Total number of digits */
  totalDigits?: number;
  /** Number of fraction digits */
  fractionDigits?: number;
}

/** Supported derivation kinds for simpleType bodies. */
export type SimpleTypeDerivationKind = "restriction" | "list" | "union";

/**
 * Payload for adding a simple type definition.
 * When `parentId` refers to an element (not schema root), an anonymous simpleType
 * is added directly inside that element. In that case `typeName` is not needed.
 */
export interface AddSimpleTypePayload {
  /**
   * Parent element ID for anonymous simpleTypes (e.g. `"/element:age"`).
   * Omit or set to `"schema"` to create a top-level named simpleType.
   */
  parentId?: string;
  /** Name of the simple type. Required for top-level types; ignored for anonymous. */
  typeName?: string;
  /**
   * Base type for restriction simpleTypes.
   * Required when the payload uses a restriction body.
   */
  baseType?: string;
  /**
   * Item type for list simpleTypes.
   * Required when the payload uses a list body.
   */
  listItemType?: string;
  /**
   * Member types for union simpleTypes.
   * Required when the payload uses a union body.
   */
  unionMemberTypes?: string[];
  /** Restriction facets */
  restrictions?: RestrictionFacets;
  /** Optional documentation */
  documentation?: string;
}

/**
 * Command to add a simple type definition.
 */
export interface AddSimpleTypeCommand extends BaseCommand<AddSimpleTypePayload> {
  type: "addSimpleType";
  payload: AddSimpleTypePayload;
}

/**
 * Payload for removing a simple type.
 */
export interface RemoveSimpleTypePayload {
  /** ID of the simple type to remove */
  typeId: string;
}

/**
 * Command to remove a simple type.
 */
export interface RemoveSimpleTypeCommand extends BaseCommand<RemoveSimpleTypePayload> {
  type: "removeSimpleType";
  payload: RemoveSimpleTypePayload;
}

/**
 * Payload for modifying a simple type.
 */
export interface ModifySimpleTypePayload {
  /** ID of the simple type to modify */
  typeId: string;
  /** New name for the type (optional) */
  typeName?: string;
  /**
   * Body definition for this simpleType.
   * The validator and executor infer the body kind from the fields present.
   * Restriction bodies use `baseType`/`restrictions`, list bodies use `listItemType`,
   * and union bodies use `unionMemberTypes`.
   */
  baseType?: string;
  /** New list item type (optional) */
  listItemType?: string;
  /** New union member types (optional) */
  unionMemberTypes?: string[];
  /** New restrictions (optional) */
  restrictions?: RestrictionFacets;
  /** New documentation (optional) */
  documentation?: string;
}

/**
 * Command to modify a simple type.
 */
export interface ModifySimpleTypeCommand extends BaseCommand<ModifySimpleTypePayload> {
  type: "modifySimpleType";
  payload: ModifySimpleTypePayload;
}

/** The commands that add, remove and modify a simple type. */
export type SimpleTypeCommand = AddSimpleTypeCommand | RemoveSimpleTypeCommand | ModifySimpleTypeCommand;
