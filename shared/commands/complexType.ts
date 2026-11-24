/**
 * Commands that add, remove and modify complex types.
 */

import type { BaseCommand } from "./base.js";

/**
 * Content model for complex types.
 */
export type ContentModel = "sequence" | "choice" | "all";

/**
 * Derivation mode for complex types that use a base type.
 */
export type ComplexTypeDerivationKind = "extension" | "restriction";

/**
 * Payload for adding a complex type definition.
 * When `parentId` refers to an element (not schema root), an anonymous complexType
 * is added directly inside that element. In that case `typeName` is not needed.
 */
export interface AddComplexTypePayload {
  /**
   * Parent element ID for anonymous complexTypes (e.g. `"/element:person"`).
   * Omit or set to `"schema"` to create a top-level named complexType.
   */
  parentId?: string;
  /** Name of the complex type. Required for top-level types; ignored for anonymous. */
  typeName?: string;
  /** Content model (sequence, choice, all) */
  contentModel: ContentModel;
  /** Whether the type is abstract. Only applicable to top-level types. */
  abstract?: boolean;
  /** Base type for extension (optional) */
  baseType?: string;
  /** Derivation mode used with `baseType` (defaults to extension when omitted). */
  derivationKind?: ComplexTypeDerivationKind;
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
  /** New derivation mode used with `baseType` (defaults to extension when omitted). */
  derivationKind?: ComplexTypeDerivationKind;
  /** New mixed content flag (optional) */
  mixed?: boolean;
}

/**
 * Command to modify a complex type.
 */
export interface ModifyComplexTypeCommand extends BaseCommand<ModifyComplexTypePayload> {
  type: "modifyComplexType";
  payload: ModifyComplexTypePayload;
}

/** The commands that add, remove and modify a complex type. */
export type ComplexTypeCommand = AddComplexTypeCommand | RemoveComplexTypeCommand | ModifyComplexTypeCommand;
