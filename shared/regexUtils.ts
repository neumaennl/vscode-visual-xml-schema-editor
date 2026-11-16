/**
 * Helpers for the results of regular expressions.
 */

/**
 * Returns the text of a group of a match. Use it for groups that take part in every match of the
 * pattern, such as `(\d+)` in `/^\[(\d+)\]$/`.
 *
 * @param match - The result of `RegExp.exec()`
 * @param index - The number of the group, starting at 1
 * @returns The text of the group
 * @throws An {@link Error} if the group did not take part in the match, which means the pattern has
 *   no such group or makes it optional
 */
export function requireGroup(match: RegExpExecArray, index: number): string {
  const group = match[index];
  if (group === undefined) {
    throw new Error(`Group ${index} did not take part in the match of ${match[0]}`);
  }
  return group;
}
