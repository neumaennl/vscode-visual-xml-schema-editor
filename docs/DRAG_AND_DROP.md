# Drag & Drop Handling

This document explains how drag-and-drop currently works in the webview, where responsibilities are split, and where to extend behavior safely.

## Goals of the current design

- Keep drag source logic in the palette UI.
- Keep drop target detection/visual feedback in the renderer.
- Keep schema mutation rules in `DropCommandFactory`.
- Keep actual document edits in the extension via `executeCommand` messages.

This separation is intentional so drag/drop can grow without turning `main.ts` or `renderer.ts` into one large mixed handler.

## Main components

- `webview-src/palette/PaletteItems.ts`
  - Defines draggable XML schema constructs (`PaletteSchemaConstruct`) and `PALETTE_MIME_TYPE`.
  - Stores active dragged-construct fallback (`setActiveDraggedPaletteSchemaConstruct`, `getActiveDraggedPaletteSchemaConstruct`).

- `webview-src/palette/PaletteView.ts`
  - Renders palette rows as draggable items.
  - On `dragstart`: writes schema construct to `dataTransfer` and active-drag fallback.
  - On `dragend`: clears fallback state.

- `webview-src/renderer.ts`
  - Handles node-level drop detection on the SVG canvas.
  - Handles top-level drop target interactions.
  - Applies CSS feedback (`drag-over`) and invokes callbacks.

- `webview-src/main.ts`
  - Wires renderer callbacks in `setupDragAndDrop()`.
  - Validates XML schema construct, asks `DropCommandFactory` for command payloads.
  - Sends `{ command: "executeCommand", data: ... }` to extension.

- `webview-src/drop/DropCommandFactory.ts`
  - Converts `(drop target + dragged schema construct)` into a typed `SchemaCommand`.
  - Encodes where each schema construct is allowed.
  - Returns `null` for unsupported placements.

## Setup flow (startup wiring)

When the webview starts, `SchemaEditorApp` calls `setupDragAndDrop()` in `webview-src/main.ts`.

1. `setNodeDropValidator(...)`
   - Pre-check used during hover and drop.
   - Returns `true` only if:
     - the dragged XML schema construct is a valid `PaletteSchemaConstruct`, and
     - `DropCommandFactory.createNodeDropCommand(...)` returns a non-null command.

2. `setDropHandler(...)`
   - Receives accepted node drops and delegates to `handleNodeDrop(...)`.

3. `setTopLevelDropTarget(...)`
   - Attaches behavior to `#top-level-drop-target` (`Drop here to add top-level nodes`).
   - Delegates accepted drops to `handleTopLevelDrop(...)`.

## Runtime flow

### 1) Drag starts in palette

`PaletteView` row `dragstart`:

- `event.dataTransfer.setData(PALETTE_MIME_TYPE, item.id)`
- `event.dataTransfer.effectAllowed = "copy"`
- `setActiveDraggedPaletteSchemaConstruct(item.id)`

`dragend` clears active fallback state.

### 2) Renderer resolves dragged XML schema construct on hover/drop

`renderer.ts` uses `getDraggedPaletteSchemaConstruct(event)`:

1. Try `event.dataTransfer?.getData(PALETTE_MIME_TYPE)`
2. Fallback to `getActiveDraggedPaletteSchemaConstruct()`

The fallback exists because some dragover environments do not reliably expose custom MIME data.

### 3) Node-level dragover/drop on SVG canvas

- `dragover`
  - Finds nearest diagram node (`[data-item-id]`).
  - Resolves dragged XML schema construct.
  - Calls `canDropOnNodeCallback` (from `main.ts`).
  - If allowed: `preventDefault()` and add `drag-over` class.

- `dragleave`
  - Removes `drag-over` only when pointer actually leaves the node region.
  - Uses `elementFromPoint` / `relatedTarget` guards to avoid flicker.

- `drop`
  - Re-checks item + construct + validator.
  - Calls `onNodeDropCallback(item, construct)`.
  - Clears active drag fallback.

### 4) Top-level drop target

`setTopLevelDropTarget(...)` on `#top-level-drop-target`:

- `dragover`: `preventDefault()`, add `drag-over`
- `dragleave`: remove `drag-over`
- `drop`: resolve dropped XML schema construct, invoke top-level callback, clear active fallback

### 5) Command creation and extension handoff

In `main.ts`:

- `handleNodeDrop(item, construct)` and `handleTopLevelDrop(construct)`:
  - Ensure dropped XML schema construct is supported (`isPaletteSchemaConstruct`).
  - Ask `DropCommandFactory` for a command.
  - If command is `null`: show user-facing error notification.
  - If command exists: `vscode.postMessage({ command: "executeCommand", data: command })`.

The extension is still the authority that validates/executes commands and sends results back.

## Where drop rules live

All placement rules are centralized in `DropCommandFactory`.

Examples:

- `Element` can be dropped on schema root and compositor groups.
- `Attribute` can be dropped on schema root, `complexType`, or element with anonymous complex type.
- Unsupported combinations return `null`.

This is what keeps `main.ts` and `renderer.ts` generic.

## How to add new draggable XML schema constructs safely

1. Add the new XML schema construct as value to the enum in `PaletteSchemaConstruct`.
2. Add a palette item entry (`PaletteItems.ts`) if user-draggable.
3. Extend `DropCommandFactory`:
   - top-level creation (if needed)
   - node-level creation + placement constraints
4. Ensure validator path accepts/rejects correctly (already tied to factory return value).
5. Add/adjust tests in:
   - `webview-src/renderer.test.ts` for drag UI behavior
   - factory tests (if introduced/updated) for command generation constraints
   - integration paths if message flow changes

## Current test coverage highlights

`webview-src/renderer.test.ts` already covers core drag/drop mechanics:

- node drop callback invocation
- validator rejection behavior
- drag-over class behavior
- active dragged-construct fallback usage
- top-level drop callback invocation
- dragleave pointer-inside guard behavior

## Why this should remain maintainable

The current architecture scales by adding rules in one place (`DropCommandFactory`) while keeping event plumbing stable:

- Palette: “what is being dragged”
- Renderer: “where it is being dropped”
- Factory: “whether it is allowed + which command to generate”
- Extension: “execute command and update schema”

As new schema constructs are added, most complexity should stay in the factory and tests, not spread across the entire webview.
