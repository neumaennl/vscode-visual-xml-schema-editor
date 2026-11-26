/**
 * The field of the properties panel that changes the kind of a compositor, and the ID that the compositor
 * gets from the change.
 */

import type { Compositor } from "../../shared/types";
import { compositorNodeType, generateSchemaId, parseSchemaId } from "../../shared/idStrategy";
import { getMaxOccurs, getMinOccurs, type DiagramItem } from "../diagram";
import { DiagramItemType } from "../diagram/DiagramTypes";
import { validateOccurrencesInAll } from "../../shared/occurrences";
import { createChoiceField, type ChoiceOption } from "./propertiesPanelFields";
import type { CommandDispatcher } from "./propertiesPanelCommands";

/** The kinds of compositors, in the order the field suggests them. */
const COMPOSITOR_OPTIONS: ReadonlyArray<ChoiceOption<Compositor>> = [
  { value: "sequence", label: "Sequence" },
  { value: "choice", label: "Choice" },
  { value: "all", label: "All" },
];

/** The kinds of compositors without `all`, for a compositor that cannot become one. */
const WITHOUT_ALL = COMPOSITOR_OPTIONS.filter((option) => option.value !== "all");

/**
 * Tells whether a compositor can become an `all`, which XML Schema 1.0 allows only as the compositor of a
 * complex type or a group definition, holding nothing but elements, and with restricted occurrences for the
 * `all` and its elements. The validator of `modifyCompositor` checks the same.
 *
 * @param node - The compositor
 * @returns True if the compositor can become an `all`
 */
function canBecomeAll(node: DiagramItem): boolean {
  if (node.parent?.compositor !== undefined) {
    return false;
  }
  // Wildcards are no diagram items of their own
  const { schemaObject } = node;
  if ("any_" in schemaObject && (schemaObject.any_?.length ?? 0) > 0) {
    return false;
  }
  const elementsFit = node.childElements.every(
    (child) =>
      child.itemType === DiagramItemType.element &&
      validateOccurrencesInAll(getMinOccurs(child), getMaxOccurs(child), "element").valid
  );
  return elementsFit && validateOccurrencesInAll(getMinOccurs(node), getMaxOccurs(node), "all").valid;
}

/**
 * Creates the Compositor field of a compositor, which sends the new kind of the compositor. It offers `all`
 * only where the compositor can become one (see {@link canBecomeAll}).
 *
 * @param node - The compositor
 * @param compositor - The kind of the compositor
 * @param dispatchCommand - Callback used to emit schema commands
 * @returns The field
 */
export function createCompositorField(
  node: DiagramItem,
  compositor: Compositor,
  dispatchCommand: CommandDispatcher
): HTMLElement {
  const options = compositor === "all" || canBecomeAll(node) ? COMPOSITOR_OPTIONS : WITHOUT_ALL;
  return createChoiceField("Compositor", compositor, options, (next) => {
    dispatchCommand({ type: "modifyCompositor", payload: { compositorId: node.id, compositor: next } });
    return true;
  });
}

/**
 * Returns the ID that a compositor gets when its kind changes, so that the selection can follow it. The ID
 * names the new kind; a compositor in another compositor also moves to the end of the compositors of its new
 * kind (see `modifyCompositor` in `docs/commands.md`).
 *
 * @param node - The compositor
 * @param next - The new kind of the compositor
 * @returns The ID of the compositor after the change
 */
export function compositorIdAfterChange(node: DiagramItem, next: Compositor): string {
  const { parentId } = parseSchemaId(node.id);
  const parent = node.parent;
  const position =
    parent?.compositor === undefined ? 0 : parent.childElements.filter((sibling) => sibling.compositor === next).length;
  return generateSchemaId({ nodeType: compositorNodeType(next), parentId, position });
}
