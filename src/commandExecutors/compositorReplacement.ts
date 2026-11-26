/**
 * Replaces a compositor with one of another kind that takes over its content: its particles, its
 * annotation and its occurrences. The validators ensure that the content fits the new kind.
 */

import type { Compositor, namedGroup } from "../../shared/types.js";
import { all, allType, explicitGroup, localElement, narrowMaxMin, simpleExplicitGroup } from "../../shared/types.js";
import { parseMaxOccurs } from "../../shared/occurrences.js";
import {
  getHeldCompositor,
  type CompositorHolder,
  type CompositorObject,
  type LocalElementObject,
  type ParticleContainer,
} from "../../shared/schemaObjects.js";

/**
 * Converts an element to an element in an `all`, which stores its occurrences as strings.
 *
 * @param element - The element
 * @returns The element in an `all`
 */
function toElementInAll(element: LocalElementObject): narrowMaxMin {
  const { minOccurs, maxOccurs } = element;
  return Object.assign(new narrowMaxMin(), element, {
    minOccurs: minOccurs?.toString(),
    maxOccurs: maxOccurs?.toString(),
  });
}

/**
 * Converts an element to an element in a sequence or a choice, which stores its occurrences as numbers.
 *
 * @param element - The element
 * @returns The element in a sequence or a choice
 */
function toLocalElement(element: LocalElementObject): localElement {
  const { minOccurs, maxOccurs } = element;
  return Object.assign(new localElement(), element, {
    minOccurs: minOccurs === undefined ? undefined : Number(minOccurs),
    maxOccurs: maxOccurs === undefined ? undefined : parseMaxOccurs(maxOccurs),
  });
}

/**
 * Gives a new compositor the content of the current one. The elements become elements of the kind that the
 * new compositor holds; an `all` stores the occurrences as strings, a sequence or a choice as numbers.
 *
 * @param target - The new compositor
 * @param current - The current compositor, if there is one
 * @returns The new compositor
 */
export function withContentOf<T extends CompositorObject>(target: T, current: CompositorObject | undefined): T {
  if (!current) {
    return target;
  }
  const inAll = target instanceof all || target instanceof allType;
  const elements: LocalElementObject[] = [...(current.element ?? [])];
  Object.assign(target, current, {
    element:
      elements.length > 0
        ? elements.map((element): LocalElementObject => (inAll ? toElementInAll(element) : toLocalElement(element)))
        : undefined,
  });
  if ("minOccurs" in current && current.minOccurs !== undefined) {
    Object.assign(target, { minOccurs: inAll ? String(current.minOccurs) : Number(current.minOccurs) });
  }
  if ("maxOccurs" in current && current.maxOccurs !== undefined) {
    Object.assign(target, { maxOccurs: inAll ? String(current.maxOccurs) : parseMaxOccurs(current.maxOccurs) });
  }
  return target;
}

/**
 * Replaces the compositor that a node holds directly with a new one, which takes over the content of the
 * current one, unless the current one is of the given kind already.
 *
 * @param holder - The node
 * @param compositor - The kind of the compositor
 * @param created - A new, empty compositor of this kind, of the class that the node holds
 */
function replaceHeldCompositor(holder: CompositorHolder, compositor: Compositor, created: CompositorObject): void {
  const current = getHeldCompositor(holder);
  if (current?.kind === compositor) {
    return;
  }
  holder.sequence = undefined;
  holder.choice = undefined;
  holder.all = undefined;
  Object.assign(holder, { [compositor]: withContentOf(created, current?.compositor) });
}

/**
 * Sets the compositor of a complex type or its complex content. A compositor of another kind is replaced
 * with the new one, which takes over its content.
 *
 * @param container - The particle container of the complex type (see `getParticleContainer()`)
 * @param compositor - The kind of the compositor
 */
export function setComplexTypeCompositor(container: ParticleContainer, compositor: Compositor): void {
  replaceHeldCompositor(container, compositor, compositor === "all" ? new all() : new explicitGroup());
}

/**
 * Sets the compositor of a group definition. A compositor of another kind is replaced with the new one,
 * which takes over its content.
 *
 * @param group - The group definition
 * @param compositor - The kind of the compositor
 */
export function setGroupCompositor(group: namedGroup, compositor: Compositor): void {
  replaceHeldCompositor(group, compositor, compositor === "all" ? new allType() : new simpleExplicitGroup());
}
