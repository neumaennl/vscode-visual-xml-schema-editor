/**
 * Unit tests for findCommandHandler.
 */

import { findCommandHandler, CommandHandlers } from "./commandHandlers.js";
import { schema, SchemaCommand } from "../shared/types.js";

type Handlers = CommandHandlers<"handle", string>;

const handler = (): string => "handled";

const command: SchemaCommand = {
  type: "removeElement",
  payload: { elementId: "element:a" },
};

describe("findCommandHandler", () => {
  test("finds the handler named after the prefix and the command type", () => {
    const handlers = { handleRemoveElement: handler } as Partial<Handlers> as Handlers;

    const found = findCommandHandler<"handle", string>(handlers, "handle", command);

    expect(found).toBe(handler);
    expect(found?.(command, new schema())).toBe("handled");
  });

  test("returns undefined for a command type without a handler", () => {
    const handlers = { handleAddElement: handler } as Partial<Handlers> as Handlers;

    expect(findCommandHandler<"handle", string>(handlers, "handle", command)).toBeUndefined();
  });

  test("ignores inherited properties", () => {
    const handlers = Object.create({ handleRemoveElement: handler }) as Handlers;

    expect(findCommandHandler<"handle", string>(handlers, "handle", command)).toBeUndefined();
  });
});
