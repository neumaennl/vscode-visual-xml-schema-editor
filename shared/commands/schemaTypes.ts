/**
 * Type command definitions for managing simple and complex types.
 * Provides commands for creating, modifying, and removing XSD type definitions.
 */

import { BaseCommand } from "./base";

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
  /** Regular expression pattern */
  pattern?: string;
  /** Enumeration values */
  enumeration?: string[];
  /** Whitespace handling */
  whiteSpace?: "preserve" | "replace" | "collapse";
  /** Total number of digits */
  totalDigits?: number;
  /** Number of fraction digits */
  fractionDigits?: number;
}

/**
 * Payload for adding a simple type definition.
 */
export interface AddSimpleTypePayload {
  /** Name of the simple type */
  typeName: string;
  /** Base type for the restriction */
  baseType: string;
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
  /** New base type (optional) */
  baseType?: string;
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

/**
 * Content model for complex types.
 */
export type ContentModel = "sequence" | "choice" | "all";

/**
 * Payload for adding a complex type definition.
 */
export interface AddComplexTypePayload {
  /** Name of the complex type */
  typeName: string;
  /** Content model (sequence, choice, all) */
  contentModel: ContentModel;
  /** Whether the type is abstract */
  abstract?: boolean;
  /** Base type for extension (optional) */
  baseType?: string;
  /** Whether to allow mixed content */
  mixed?: boolean;
  /** Optional documentation */
  documentation?: string;
}

/**
 * Command to add a complex type definition.
 */
export interface AddComplexTypeCommand extends BaseCommand<AddComplexTypePayload> {
  type: "addComplexType";
  payload: AddComplexTypePayload;
}

/**
 * Payload for removing a complex type.
 */
export interface RemoveComplexTypePayload {
  /** ID of the complex type to remove */
  typeId: string;
}

/**
 * Command to remove a complex type.
 */
export interface RemoveComplexTypeCommand extends BaseCommand<RemoveComplexTypePayload> {
  type: "removeComplexType";
  payload: RemoveComplexTypePayload;
}

/**
 * Payload for modifying a complex type.
 */
export interface ModifyComplexTypePayload {
  /** ID of the complex type to modify */
  typeId: string;
  /** New name for the type (optional) */
  typeName?: string;
  /** New content model (optional) */
  contentModel?: ContentModel;
  /** New abstract status (optional) */
  abstract?: boolean;
  /** New base type (optional) */
  baseType?: string;
  /** New mixed content flag (optional) */
  mixed?: boolean;
  /** New documentation (optional) */
  documentation?: string;
}

/**
 * Command to modify a complex type.
 */
export interface ModifyComplexTypeCommand extends BaseCommand<ModifyComplexTypePayload> {
  type: "modifyComplexType";
  payload: ModifyComplexTypePayload;
}
