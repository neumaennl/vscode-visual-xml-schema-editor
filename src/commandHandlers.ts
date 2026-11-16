/**
 * Typed lookup of the handler for a schema command, shared by CommandValidator and CommandExecutor.
 */

import type { SchemaCommand, schema } from "../shared/types.js";

/** The value of `type` of a schema command, such as `"addElement"`. */
export type CommandType = SchemaCommand["type"];

/** The command whose `type` is `K`. */
export type CommandOfType<K extends CommandType> = Extract<SchemaCommand, { type: K }>;

/**
 * A handler that takes any schema command; what {@link findCommandHandler} returns. It is declared
 * as a method, whose parameters TypeScript compares in both directions, so that the handlers of
 * single command types can be converted to it.
 */
export type CommandHandler<R> = {
  handle(command: SchemaCommand, schemaObj: schema): R;
}["handle"];

/**
 * One handler per command type, named after the prefix and the type: with the prefix `validate`,
 * `validateAddElement` handles `addElement` and takes an `AddElementCommand`.
 */
export type CommandHandlers<Prefix extends string, R> = {
  [K in CommandType as `${Prefix}${Capitalize<K>}`]: (command: CommandOfType<K>, schemaObj: schema) => R;
};

/**
 * Finds the handler for a command.
 *
 * @param handlers - The handlers, one per command type
 * @param prefix - The prefix of the handler names, such as `validate`
 * @param command - The command to handle
 * @returns The handler of the command's type, or `undefined` if `handlers` has none. The types rule
 * this out, but a command received at runtime can still have an unknown type.
 */
export function findCommandHandler<Prefix extends string, R>(
  handlers: CommandHandlers<Prefix, R>,
  prefix: Prefix,
  command: SchemaCommand
): CommandHandler<R> | undefined {
  const name = prefix + command.type.charAt(0).toUpperCase() + command.type.slice(1);
  if (!Object.hasOwn(handlers, name)) {
    return undefined;
  }
  // The name is built from the command's type, so the handler takes this command.
  return (handlers as Record<string, CommandHandler<R>>)[name];
}
