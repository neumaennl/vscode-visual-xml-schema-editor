/**
 * The schema construct that is being dragged from the palette. The palette and the canvas are in the same webview,
 * so the drag source sets it when the drag starts and clears it when it ends, and the drop target reads it.
 * The drag data of the browser is not used: during `dragover`, Chromium does not let the target read it.
 */

import type { DraggableSchemaConstruct } from "./DraggableSchemaConstruct";

/** The schema construct of the current drag, or null if nothing is dragged. */
let draggedSchemaConstruct: DraggableSchemaConstruct | null = null;

/**
 * Sets the schema construct of the current drag.
 *
 * @param schemaConstruct - The dragged schema construct, or null when the drag ends
 */
export function setDraggedSchemaConstruct(schemaConstruct: DraggableSchemaConstruct | null): void {
  draggedSchemaConstruct = schemaConstruct;
}

/**
 * Returns the schema construct of the current drag.
 *
 * @returns The dragged schema construct, or null if nothing is dragged
 */
export function getDraggedSchemaConstruct(): DraggableSchemaConstruct | null {
  return draggedSchemaConstruct;
}
