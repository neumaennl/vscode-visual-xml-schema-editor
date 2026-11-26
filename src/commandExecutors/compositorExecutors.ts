/**
 * Executors for the compositor commands: adding a compositor to a sequence or a choice, removing a
 * compositor and changing its kind and its occurrences.
 */

import type {
  schema,
  AddCompositorCommand,
  RemoveCompositorCommand,
  ModifyCompositorCommand,
  Compositor,
  namedGroup,
  all,
} from "../../shared/types.js";
import { explicitGroup } from "../../shared/types.js";
import { compositorOfNodeType, parseSchemaId } from "../../shared/idStrategy.js";
import { assumeValidated, assumptionFailed, locateValidated } from "./assumeValidated.js";
import type { LocatedNode } from "../schemaNavigator.js";
import { appendTo, assignDefined, removeFrom } from "./nodeProperties.js";
import { setComplexTypeCompositor, setGroupCompositor, withContentOf } from "./compositorReplacement.js";
import {
  getHeldCompositor,
  getParticleContainer,
  type ComplexTypeObject,
  type CompositorObject,
  type HeldCompositor,
  type SequenceOrChoiceObject,
} from "../../shared/schemaObjects.js";

/**
 * Executes an `addCompositor` command: appends a new sequence or choice to the sequence or choice that
 * holds it.
 *
 * @param command - The `addCompositor` command to execute
 * @param schemaObj - The schema object to modify
 * @throws An {@link Error} if the parent is not found
 */
export function executeAddCompositor(command: AddCompositorCommand, schemaObj: schema): void {
  const { parentId, compositor, minOccurs, maxOccurs } = command.payload;
  if (compositor === "all") {
    assumptionFailed(`An all in ${parentId}`);
  }
  // The validator ensures that the parent is a sequence or a choice
  const parent = locateValidated(schemaObj, parentId).parent as SequenceOrChoiceObject;
  appendTo(parent, compositor, assignDefined(new explicitGroup(), { minOccurs, maxOccurs }));
}

/** A compositor that the validator found, with its kind and the node that holds it. */
interface LocatedCompositor extends HeldCompositor {
  /** The node that holds the compositor, as the navigator found it */
  parentLocation: LocatedNode;
}

/**
 * Finds the compositor that a compositor ID identifies, which the validator found.
 *
 * @param schemaObj - The schema
 * @param compositorId - The ID of the compositor
 * @returns The compositor, its kind and the node that holds it
 * @throws An {@link Error} if the compositor or its parent is not found
 */
function locateCompositor(schemaObj: schema, compositorId: string): LocatedCompositor {
  const parsed = parseSchemaId(compositorId);
  const kind = compositorOfNodeType(parsed.nodeType);
  if (kind === undefined) {
    return assumptionFailed(`Compositor ID ${compositorId}`);
  }
  return {
    kind,
    // The navigator found a compositor of this kind
    compositor: locateValidated(schemaObj, compositorId).parent as CompositorObject,
    parentLocation: locateValidated(schemaObj, assumeValidated(parsed.parentId, `Parent of ${compositorId}`)),
  };
}

/**
 * Executes a `removeCompositor` command: removes the compositor from the complex type, the group definition
 * or the compositor that holds it.
 *
 * @param command - The `removeCompositor` command to execute
 * @param schemaObj - The schema object to modify
 * @throws An {@link Error} if the compositor or its parent is not found
 */
export function executeRemoveCompositor(command: RemoveCompositorCommand, schemaObj: schema): void {
  const located = locateCompositor(schemaObj, command.payload.compositorId);
  removeCompositorFromParent(located.parentLocation.parent, located.kind, located.compositor);
}

/**
 * Executes a `modifyCompositor` command: replaces the compositor with one of the new kind, which takes over
 * its content, and sets the given occurrences. A compositor in another compositor moves to the end of the
 * compositors of its new kind.
 *
 * @param command - The `modifyCompositor` command to execute
 * @param schemaObj - The schema object to modify
 * @throws An {@link Error} if the compositor or its parent is not found
 */
export function executeModifyCompositor(command: ModifyCompositorCommand, schemaObj: schema): void {
  const { compositorId, compositor, minOccurs, maxOccurs } = command.payload;
  const { kind, compositor: current, parentLocation } = locateCompositor(schemaObj, compositorId);
  const target =
    compositor === undefined || compositor === kind
      ? current
      : replaceCompositor(parentLocation, kind, current, compositor);
  // The validator rejects occurrences for the compositor of a group definition, which has none
  if ((compositor ?? kind) === "all") {
    assignDefined(target as all, { minOccurs: minOccurs?.toString(), maxOccurs: maxOccurs?.toString() });
  } else {
    assignDefined(target as explicitGroup, { minOccurs, maxOccurs });
  }
}

/**
 * Replaces a compositor in the node that holds it with one of another kind, which takes over its content.
 *
 * @param parentLocation - The node that holds the compositor, as the navigator found it
 * @param kind - The current kind of the compositor
 * @param current - The compositor
 * @param next - The new kind of the compositor
 * @returns The new compositor
 * @throws An {@link Error} if the node cannot hold a compositor of the new kind
 */
function replaceCompositor(
  parentLocation: LocatedNode,
  kind: Compositor,
  current: CompositorObject,
  next: Compositor
): CompositorObject {
  const { parent, parentType } = parentLocation;
  switch (parentType) {
    case "sequence":
    case "choice": {
      // The validator allows only sequences and choices in another compositor
      if (kind === "all" || next === "all") {
        return assumptionFailed(`An all in a ${parentType}`);
      }
      const holder = parent as SequenceOrChoiceObject;
      removeFrom(holder, kind, (candidate) => candidate === current, `Compositor ${kind} in its parent`);
      const replacement = withContentOf(new explicitGroup(), current);
      appendTo(holder, next, replacement);
      return replacement;
    }
    case "namedGroup": {
      const group = parent as namedGroup;
      setGroupCompositor(group, next);
      return assumeValidated(getHeldCompositor(group), `Compositor of ${parentType}`).compositor;
    }
    case "topLevelComplexType":
    case "localComplexType": {
      const container = assumeValidated(
        getParticleContainer(parent as ComplexTypeObject),
        "Complex content of the complex type"
      );
      setComplexTypeCompositor(container, next);
      return assumeValidated(getHeldCompositor(container), `Compositor of ${parentType}`).compositor;
    }
    default:
      return assumptionFailed(`Parent of type '${parentType}' for a compositor`);
  }
}

/**
 * Structural type for the holders of a compositor: a complex type (directly or in its complex content), a
 * group definition, or another compositor, which holds its nested compositors in arrays.
 */
interface CompositorHolder {
  sequence?: unknown;
  choice?: unknown;
  all?: unknown;
  complexContent?: { extension?: CompositorHolder; restriction?: CompositorHolder };
}

/**
 * Removes a compositor from the node that holds it.
 *
 * @param parent - The node that holds the compositor
 * @param compositor - The kind of the compositor: `sequence`, `choice` or `all`
 * @param targetCompositor - The compositor to remove
 * @throws An {@link Error} if the parent does not hold the compositor
 */
function removeCompositorFromParent(parent: unknown, compositor: Compositor, targetCompositor: unknown): void {
  const removeFrom = (holder: CompositorHolder | undefined): boolean => {
    if (!holder) return false;
    const current = holder[compositor];
    if (current === targetCompositor) {
      holder[compositor] = undefined;
      return true;
    }
    if (Array.isArray(current) && current.includes(targetCompositor)) {
      const remaining = current.filter((candidate) => candidate !== targetCompositor);
      holder[compositor] = remaining.length > 0 ? remaining : undefined;
      return true;
    }
    return false;
  };

  const holder = parent as CompositorHolder;
  const removed =
    removeFrom(holder) ||
    removeFrom(holder.complexContent?.extension) ||
    removeFrom(holder.complexContent?.restriction);
  assumeValidated(removed || undefined, `Compositor ${compositor} in its parent`);
}
