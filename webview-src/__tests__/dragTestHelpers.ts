/**
 * Helpers for tests of drag and drop in jsdom, which has no `DataTransfer`.
 */

/**
 * Returns a stub of the `DataTransfer` of a drag event, which jsdom does not have.
 *
 * @returns An object that stores the data that `setData()` sets
 */
export function createDataTransfer(): Pick<
  DataTransfer,
  "effectAllowed" | "dropEffect" | "setData" | "getData" | "setDragImage"
> {
  const data: Record<string, string> = {};
  return {
    effectAllowed: "none",
    dropEffect: "none",
    setDragImage: (): void => undefined,
    setData: (type: string, value: string): void => {
      data[type] = value;
    },
    getData: (type: string): string => data[type] ?? "",
  };
}

/**
 * Dispatches a drag event with a `DataTransfer` on an element.
 *
 * @param target - The element
 * @param type - The type of the event
 * @param dataTransfer - The data of the drag
 * @returns The event
 */
export function dispatchDrag(target: Element, type: string, dataTransfer = createDataTransfer()): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  target.dispatchEvent(event);
  return event;
}
