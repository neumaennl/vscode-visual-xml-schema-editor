/**
 * Validators for the compositor commands.
 */

import type {
  schema,
  Compositor,
  AddCompositorCommand,
  RemoveCompositorCommand,
  ModifyCompositorCommand,
} from "../../shared/types.js";
import type { ValidationResult, ValidationResultWith } from "../../shared/validation.js";
import { validateOccurrences, validateOccurrencesInAll, type MaxOccurs } from "../../shared/occurrences.js";
import { compositorOfNodeType, isCompositorNodeType, parseSchemaId, SchemaNodeType } from "../../shared/idStrategy.js";
import { locateNodeById } from "../schemaNavigator.js";
import { parseRequiredId, validateCompositor } from "./commonValidators.js";
import type { CompositorObject, HeldCompositor, SequenceOrChoiceObject } from "../../shared/schemaObjects.js";

/** What holds a compositor: a complex type (directly or in its complex content), a group definition or another compositor. */
type CompositorParent = "complexType" | "groupDefinition" | "compositor";

/** A compositor that a compositor ID identifies, with what holds it. */
interface LocatedCompositor extends HeldCompositor {
  /** What holds the compositor */
  parent: CompositorParent;
}

/**
 * Validates that the compositor that a compositor ID (`…/sequence[N]`) identifies exists. Used by
 * all compositor validators.
 *
 * @param compositorId - The ID of the compositor
 * @param schemaObj - The schema
 * @param label - What the ID identifies, capitalized, for the error message of an empty ID
 * @returns The compositor, or the validation failure
 */
function locateCompositor(
  compositorId: string,
  schemaObj: schema,
  label = "Compositor"
): ValidationResultWith<LocatedCompositor> {
  const parsedId = parseRequiredId(compositorId, label);
  if (!parsedId.valid) {
    return parsedId;
  }
  const { nodeType, parentId } = parsedId.parsed;
  const kind = compositorOfNodeType(nodeType);
  if (kind === undefined || !parentId) {
    return { valid: false, error: `Not a compositor: ${compositorId}` };
  }
  const location = locateNodeById(schemaObj, compositorId);
  if (!location.found) {
    return { valid: false, error: `Compositor not found: ${compositorId}` };
  }
  return {
    valid: true,
    kind,
    // The navigator found a compositor of this kind
    compositor: location.parent as CompositorObject,
    parent: compositorParent(parentId),
  };
}

/**
 * Tells what holds a compositor, from the ID of its parent.
 *
 * @param parentId - The ID of the parent of the compositor
 * @returns What holds the compositor
 */
function compositorParent(parentId: string): CompositorParent {
  const { nodeType } = parseSchemaId(parentId);
  if (isCompositorNodeType(nodeType)) {
    return "compositor";
  }
  return nodeType === SchemaNodeType.Group ? "groupDefinition" : "complexType";
}

/**
 * Validates that a compositor can become a compositor of another kind, which takes over its particles and
 * its occurrences. XML Schema 1.0 allows only elements in an `all`, and restricts the occurrences of an
 * `all` and of its elements (see {@link validateOccurrencesInAll}). Any compositor can become a sequence
 * or a choice.
 *
 * @param current - The current compositor, if there is one
 * @param next - The kind of the new compositor
 * @param occurrences - The occurrences of the new compositor, where they replace those of the current one
 * @returns The validation result
 */
export function validateCompositorReplacement(
  current: HeldCompositor | undefined,
  next: Compositor,
  occurrences: { minOccurs?: number; maxOccurs?: MaxOccurs } = {}
): ValidationResult {
  if (next !== "all" || current === undefined || current.kind === "all") {
    return { valid: true };
  }
  // Only an all holds nothing but elements
  const compositor = current.compositor as SequenceOrChoiceObject;
  const hasOtherParticles = [compositor.group, compositor.choice, compositor.sequence, compositor.any_].some(
    (particles) => (particles?.length ?? 0) > 0
  );
  if (hasOtherParticles) {
    return { valid: false, error: `A ${current.kind} with particles other than elements cannot become an all` };
  }
  for (const element of compositor.element ?? []) {
    const elementResult = validateOccurrencesInAll(element.minOccurs, element.maxOccurs, "element");
    if (!elementResult.valid) {
      return { valid: false, error: `Element '${element.name ?? element.ref ?? ""}': ${elementResult.error}` };
    }
  }
  // The compositor of a group definition has no occurrences
  const own = "minOccurs" in compositor ? compositor : {};
  return validateOccurrencesInAll(
    occurrences.minOccurs ?? own.minOccurs,
    occurrences.maxOccurs ?? own.maxOccurs,
    "all"
  );
}

/**
 * Validates an `addCompositor` command: the parent must be a sequence or a choice, the compositor a
 * sequence or a choice, which XML Schema allows there, and the occurrences must be valid.
 *
 * @param command - The command
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateAddCompositor(command: AddCompositorCommand, schemaObj: schema): ValidationResult {
  const { parentId, compositor, minOccurs, maxOccurs } = command.payload;
  const compositorResult = validateCompositor(compositor);
  if (!compositorResult.valid) {
    return compositorResult;
  }
  if (compositor === "all") {
    return { valid: false, error: "An all can only be the compositor of a complex type or a group definition" };
  }
  const parent = locateCompositor(parentId, schemaObj, "Parent");
  if (!parent.valid) {
    return parent;
  }
  if (parent.kind === "all") {
    return { valid: false, error: "An all cannot hold compositors" };
  }
  return validateOccurrences(minOccurs, maxOccurs);
}

/**
 * Validates a `removeCompositor` command: the compositor must exist and must not be the compositor of a
 * group definition, which needs one.
 *
 * @param command - The command
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateRemoveCompositor(command: RemoveCompositorCommand, schemaObj: schema): ValidationResult {
  const located = locateCompositor(command.payload.compositorId, schemaObj);
  if (!located.valid) {
    return located;
  }
  if (located.parent === "groupDefinition") {
    return {
      valid: false,
      error: "The compositor of a group definition cannot be removed, because a group definition needs one",
    };
  }
  return { valid: true };
}

/**
 * Validates a `modifyCompositor` command: the compositor must exist. A new kind must be one that XML Schema
 * allows where the compositor is, no `all` in another compositor, and must fit its particles (see
 * {@link validateCompositorReplacement}). The compositor of a group definition has no occurrences, and an
 * `all` only restricted ones.
 *
 * @param command - The command
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateModifyCompositor(command: ModifyCompositorCommand, schemaObj: schema): ValidationResult {
  const { compositorId, compositor, minOccurs, maxOccurs } = command.payload;
  const located = locateCompositor(compositorId, schemaObj);
  if (!located.valid) {
    return located;
  }
  if (compositor !== undefined) {
    const compositorResult = validateCompositor(compositor);
    if (!compositorResult.valid) {
      return compositorResult;
    }
    if (compositor === "all" && located.parent === "compositor") {
      return { valid: false, error: "An all can only be the compositor of a complex type or a group definition" };
    }
    const replacementResult = validateCompositorReplacement(located, compositor, { minOccurs, maxOccurs });
    if (!replacementResult.valid) {
      return replacementResult;
    }
  }
  if (located.parent === "groupDefinition" && (minOccurs !== undefined || maxOccurs !== undefined)) {
    return { valid: false, error: "The compositor of a group definition cannot have minOccurs or maxOccurs" };
  }
  return (compositor ?? located.kind) === "all"
    ? validateOccurrencesInAll(minOccurs, maxOccurs, "all")
    : validateOccurrences(minOccurs, maxOccurs);
}
