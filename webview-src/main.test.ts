/**
 * Unit tests for main module (webview entry point).
 */

import type { Mock } from "vitest";


// Mock the VS Code API before importing
const mockPostMessage = vi.fn();
const mockGetState = vi.fn();
const mockSetState = vi.fn();

type MockVsCodeApi = {
  postMessage: Mock;
  getState: Mock;
  setState: Mock;
};

const globalWithAcquire = globalThis as typeof globalThis & {
  acquireVsCodeApi: Mock<() => MockVsCodeApi>;
};

globalWithAcquire.acquireVsCodeApi = vi.fn(() => ({
  postMessage: mockPostMessage,
  getState: mockGetState,
  setState: mockSetState,
}));

describe("SchemaEditorApp", () => {
  beforeEach(() => {
    // Clear mocks
    vi.clearAllMocks();
    vi.resetModules();
    vi.useRealTimers();
    mockGetState.mockReturnValue(null);

    // Setup complete DOM structure
    document.body.innerHTML = `
      <div id="editor-layout">
        <aside id="palette-panel">
          <div id="palette-content"></div>
        </aside>
        <main id="main-panel">
          <div id="notification-bar" hidden>
            <span id="notification-message"></span>
            <button id="notification-dismiss" type="button">✕</button>
          </div>
          <button id="zoomIn"></button>
          <button id="zoomOut"></button>
          <button id="fitView"></button>
          <div id="canvas-container">
            <div id="top-level-drop-target"></div>
            <svg id="schema-canvas" width="800" height="600">
              <g id="content"></g>
            </svg>
          </div>
        </main>
        <aside id="properties-panel">
          <div id="properties-content"></div>
        </aside>
      </div>
    `;

    Object.defineProperty(SVGElement.prototype, "getBBox", {
      configurable: true,
      value: vi.fn(() => ({ x: 0, y: 0, width: 120, height: 24 })),
    });
  });

  /**
   * Loads the module and returns a function that sends a message to the message listener it registers.
   *
   * @returns The function that sends a message with a command and its data
   */
  async function loadMain(): Promise<(command: string, data: unknown) => void> {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    await import("./main");
    const messageHandler = addEventListenerSpy.mock.calls.find((call) => call[0] === "message")?.[1] as EventListener;
    return (command, data) => {
      messageHandler(new MessageEvent("message", { data: { command, data } }));
    };
  }

  test("should initialize and setup message listener", async () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    await import("./main");

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "message",
      expect.any(Function)
    );
  });

  test("should handle updateSchema message", async () => {
    const send = await loadMain();

    send("updateSchema", { element: [{ name: "test" }] });

    // Verify state is saved
    expect(mockSetState).toHaveBeenCalled();
  });

  test.each([
    ["show", 0],
    ["keep visible until dismissed", 30000],
  ])("should %s an error in the notification bar", async (_case, elapsed) => {
    vi.useFakeTimers();
    const send = await loadMain();

    send("error", { message: "Test error" });
    vi.advanceTimersByTime(elapsed);

    expect(document.getElementById("notification-bar")?.hasAttribute("hidden")).toBe(false);
    expect(document.getElementById("notification-message")?.textContent).toContain("Test error");
  });

  test("should dismiss the notification when the dismiss button is clicked", async () => {
    const send = await loadMain();

    send("error", { message: "Dismiss me" });
    document.getElementById("notification-dismiss")?.click();

    expect(document.getElementById("notification-bar")?.hasAttribute("hidden")).toBe(true);
  });
  test("should setup zoom controls", async () => {
    const addEventListenerSpy = vi.spyOn(HTMLElement.prototype, "addEventListener");

    await import("./main");

    expect(document.getElementById("zoomIn")).toBeTruthy();
    expect(document.getElementById("zoomOut")).toBeTruthy();
    expect(document.getElementById("fitView")).toBeTruthy();

    // Each button attaches a click handler
    expect(addEventListenerSpy).toHaveBeenCalledWith("click", expect.any(Function));

    addEventListenerSpy.mockRestore();
  });

  test("should restore state on initialization", async () => {
    const savedState = { 
      zoom: 1.5, 
      panX: 100, 
      panY: 50 
    };
    mockGetState.mockReturnValue(savedState);

    await import("./main");

    expect(mockGetState).toHaveBeenCalled();
  });

  test("should initialize with default state when no saved state", async () => {
    mockGetState.mockReturnValue(null);

    await expect(import("./main")).resolves.toBeDefined();
  });

  test("should handle unknown message commands", async () => {
    const send = await loadMain();

    expect(() => {
      send("unknownCommand", {});
    }).not.toThrow();
  });

  test("should create canvas and initialize renderer", async () => {
    await import("./main");

    const canvas = document.getElementById("schema-canvas");
    expect(canvas).toBeTruthy();
    expect(canvas?.tagName).toBe("svg");
  });

  test("should highlight the selected node when it is clicked", async () => {
    const send = await loadMain();

    send("updateSchema", { element: [{ name: "test" }] });

    const node = document.querySelector("[data-item-id]");
    expect(node).toBeTruthy();

    node?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(node?.classList.contains("selected")).toBe(true);
  });
});
