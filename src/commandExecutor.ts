/**
 * CommandExecutor: Executes validated commands on the schema.
 * Implements execution logic by delegating to specialized executor modules.
 */

import { SchemaCommand, schema } from "../shared/types.js";
import { CommandHandlers, findCommandHandler } from "./commandHandlers.js";

// Import execution functions from specialized modules
import * as elementExecutors from "./commandExecutors/elementExecutors.js";
import * as attributeExecutors from "./commandExecutors/attributeExecutors.js";
import * as typeExecutors from "./commandExecutors/typeExecutors.js";
import * as groupExecutors from "./commandExecutors/groupExecutors.js";
import * as attributeGroupExecutors from "./commandExecutors/attributeGroupExecutors.js";
import * as annotationExecutors from "./commandExecutors/annotationExecutors.js";
import * as schemaExecutors from "./commandExecutors/schemaExecutors.js";

/**
 * The executor functions used by CommandExecutor, one per command type, such as
 * `executeAddElement` for `addElement`. Enables dependency injection for testing.
 */
export type ExecutorFunctions = CommandHandlers<"execute", void>;

/**
 * CommandExecutor class.
 * Executes validated commands by delegating to specialized executor modules.
 */
export class CommandExecutor {
  private readonly executors: ExecutorFunctions;

  /**
   * Creates a new CommandExecutor.
   *
   * @param executors - Executor functions (optional, uses actual executors if not provided)
   */
  constructor(executors?: ExecutorFunctions) {
    // Use provided executors or default to actual executor modules
    this.executors = executors ?? {
      ...elementExecutors,
      ...attributeExecutors,
      ...typeExecutors,
      ...groupExecutors,
      ...attributeGroupExecutors,
      ...annotationExecutors,
      ...schemaExecutors,
    };
  }

  /**
   * Execute a validated command on the schema.
   * This method modifies the schema object in place.
   *
   * @param command - The command to execute
   * @param schemaObj - The schema object to modify
   * @throws Error if command type is unknown or execution fails
   */
  public execute(command: SchemaCommand, schemaObj: schema): void {
    const executor = findCommandHandler<"execute", void>(this.executors, "execute", command);
    if (!executor) {
      throw new Error(`Unknown command type: ${command.type}`);
    }
    executor(command, schemaObj);
  }
}
