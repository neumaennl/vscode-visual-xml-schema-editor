/**
 * Assumptions that the executors make about a command that the validator has accepted.
 * The validator checks everything an executor relies on, so the executors do not check it again
 * (see `docs/architecture/003-validators-check-executors-assume.md`). Where the types need such an
 * assumption, these helpers state it: if it does not hold, the validator and the executor
 * disagree, and the command fails with an error that says so instead of doing nothing.
 */

import type { schema } from "../../shared/types.js";
import { parseSchemaId, SCHEMA_ROOT_ID, type ParsedSchemaId } from "../../shared/idStrategy.js";
import { locateNodeById, type LocatedNode } from "../schemaNavigator.js";
import { identifyChild, type ChildMatcher } from "../commandUtils.js";

/** A child that the validator found: its parsed ID, its parent, and a matcher that identifies it. */
export interface LocatedChild {
  parsed: ParsedSchemaId;
  location: LocatedNode;
  child: ChildMatcher;
}

/**
 * Returns a value that the validator guarantees, such as a node that it found or a field that it requires.
 *
 * @param value - The value
 * @param what - What the value is, for the error message, for example `Element /element:person`
 * @returns The value
 * @throws An {@link Error} if the value is `undefined` or `null`
 */
export function assumeValidated<T>(value: T | null | undefined, what: string): T {
  if (value === undefined || value === null) {
    return assumptionFailed(`${what} not found`);
  }
  return value;
}

/**
 * Fails a command at a point that a validated command cannot reach, such as a parent of a kind that the
 * validator rejects.
 *
 * @param what - What the executor found, for example `Parent of type 'attributeGroup' for an element`
 * @throws Error always
 */
export function assumptionFailed(what: string): never {
  throw new Error(`${what}, although the validator accepted the command`);
}

/**
 * Returns the items that remain after removing one that the validator found.
 *
 * @param items - The items before the removal
 * @param remaining - The items after the removal
 * @param what - What was removed, for the error message
 * @returns The remaining items
 * @throws An {@link Error} if nothing was removed
 */
export function assumeRemoved<T>(items: T[], remaining: T[], what: string): T[] {
  if (remaining.length === items.length) {
    return assumptionFailed(`${what} not found`);
  }
  return remaining;
}

/**
 * Locates a node that the validator found.
 *
 * @param schemaObj - The schema object
 * @param nodeId - The ID of the node
 * @returns The node and its type
 * @throws An {@link Error} if the node is not found
 */
export function locateValidated(schemaObj: schema, nodeId: string): LocatedNode {
  const location = locateNodeById(schemaObj, nodeId);
  if (!location.found) {
    return assumptionFailed(`Node ${nodeId} not found`);
  }
  return location;
}

/**
 * Locates the parent of a child that the validator found, and identifies the child by its name or
 * position. A child without a parent in its ID is a top-level child of the schema.
 *
 * @param schemaObj - The schema object
 * @param childId - The ID of the child
 * @param label - What the child is, for the error messages, for example `Element`
 * @returns The parsed ID, the parent and a matcher for the child
 * @throws An {@link Error} if the parent is not found
 */
export function locateChildValidated(schemaObj: schema, childId: string, label: string): LocatedChild {
  const parsed = parseSchemaId(childId);
  return {
    parsed,
    location: locateValidated(schemaObj, parsed.parentId ?? SCHEMA_ROOT_ID),
    child: identifyChild(label, parsed.name, parsed.position),
  };
}
