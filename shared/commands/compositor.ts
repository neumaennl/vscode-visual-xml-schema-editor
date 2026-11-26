/**
 * Commands that add, remove and modify compositors (`xs:sequence`, `xs:choice` and `xs:all`). The
 * compositor that a complex type or a group definition holds directly is set and replaced through the
 * `compositor` fields of the complex type and group commands.
 */

import type { BaseCommand } from "./base.js";
import type { Compositor } from "./complexType.js";
import type { MaxOccurs } from "../occurrences.js";

/**
 * Payload for adding a compositor to a sequence or a choice. XML Schema allows no `all` there, and no
 * compositor in an `all`.
 */
export interface AddCompositorPayload {
  /** ID of the sequence or choice to add the compositor to, such as `/complexType:X/sequence[0]` */
  parentId: string;
  /** The compositor to add: `sequence` or `choice` */
  compositor: Compositor;
  /** Minimum occurrences (optional) */
  minOccurs?: number;
  /** Maximum occurrences (optional) */
  maxOccurs?: MaxOccurs;
}

/**
 * Command to add a compositor to a sequence or a choice.
 */
export interface AddCompositorCommand extends BaseCommand<AddCompositorPayload> {
  type: "addCompositor";
  payload: AddCompositorPayload;
}

/**
 * Payload for removing a compositor from the complex type, the group definition or the compositor that
 * holds it.
 */
export interface RemoveCompositorPayload {
  /** ID of the compositor to remove, such as `/complexType:X/sequence[0]` */
  compositorId: string;
}

/**
 * Command to remove a compositor.
 */
export interface RemoveCompositorCommand extends BaseCommand<RemoveCompositorPayload> {
  type: "removeCompositor";
  payload: RemoveCompositorPayload;
}

/**
 * Payload for modifying the kind or the occurrences of a compositor. The compositor of a group definition
 * has no occurrences.
 */
export interface ModifyCompositorPayload {
  /** ID of the compositor to modify, such as `/complexType:X/sequence[0]` */
  compositorId: string;
  /**
   * New kind of the compositor (optional), which takes over the particles of the current one. A compositor
   * in another compositor cannot become an `all`.
   */
  compositor?: Compositor;
  /** New minimum occurrences (optional) */
  minOccurs?: number;
  /** New maximum occurrences (optional) */
  maxOccurs?: MaxOccurs;
}

/**
 * Command to modify a compositor.
 */
export interface ModifyCompositorCommand extends BaseCommand<ModifyCompositorPayload> {
  type: "modifyCompositor";
  payload: ModifyCompositorPayload;
}

/** The commands that add, remove and modify a compositor. */
export type CompositorCommand = AddCompositorCommand | RemoveCompositorCommand | ModifyCompositorCommand;
