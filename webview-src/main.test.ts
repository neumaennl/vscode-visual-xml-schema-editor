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

  it("should initialize and setup message listener", async () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    await import("./main");

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "message",
      expect.any(Function)
    );
  });

  it("should handle updateSchema message", async () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    await import("./main");

    // Get the message handler
    const messageHandler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === "message"
    )?.[1] as EventListener;

    expect(messageHandler).toBeDefined();

    // Simulate updateSchema message
    const mockSchema = { element: [{ name: "test" }] };
    const event = new MessageEvent("message", {
      data: { command: "updateSchema", data: mockSchema },
    });

    messageHandler(event);

    // Verify state is saved
    expect(mockSetState).toHaveBeenCalled();
  });

  it("should handle error message", async () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    await import("./main");

    const messageHandler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === "message"
    )?.[1] as EventListener;

    const event = new MessageEvent("message", {
      data: { command: "error", data: { message: "Test error" } },
    });

    messageHandler(event);

    // Error is now shown in the notification bar, not the canvas
    const notificationBar = document.getElementById("notification-bar");
    const notificationMessage = document.getElementById("notification-message");
    expect(notificationBar?.hasAttribute("hidden")).toBe(false);
    expect(notificationMessage?.textContent).toContain("Test error");
  });

  it("should keep an error visible until dismissed", async () => {
    vi.useFakeTimers();
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    await import("./main");

    const messageHandler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === "message"
    )?.[1] as EventListener;

    const event = new MessageEvent("message", {
      data: { command: "error", data: { message: "Persistent error" } },
    });

    messageHandler(event);
    vi.advanceTimersByTime(30000);

    const notificationBar = document.getElementById("notification-bar");
    const notificationMessage = document.getElementById("notification-message");
    expect(notificationBar?.hasAttribute("hidden")).toBe(false);
    expect(notificationMessage?.textContent).toContain("Persistent error");
  });

  it("should dismiss the notification when the dismiss button is clicked", async () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    await import("./main");

    const messageHandler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === "message"
    )?.[1] as EventListener;

    const event = new MessageEvent("message", {
      data: { command: "error", data: { message: "Dismiss me" } },
    });

    messageHandler(event);
    document.getElementById("notification-dismiss")?.click();

    const notificationBar = document.getElementById("notification-bar");
    expect(notificationBar?.hasAttribute("hidden")).toBe(true);
  });

  it("should setup zoom controls", async () => {
    const addEventListenerSpy = vi.spyOn(HTMLElement.prototype, "addEventListener");

    await import("./main");

    expect(document.getElementById("zoomIn")).toBeTruthy();
    expect(document.getElementById("zoomOut")).toBeTruthy();
    expect(document.getElementById("fitView")).toBeTruthy();

    // Each button attaches a click handler
    expect(addEventListenerSpy).toHaveBeenCalledWith("click", expect.any(Function));

    addEventListenerSpy.mockRestore();
  });

  it("should restore state on initialization", async () => {
    const savedState = { 
      zoom: 1.5, 
      panX: 100, 
      panY: 50 
    };
    mockGetState.mockReturnValue(savedState);

    await import("./main");

    expect(mockGetState).toHaveBeenCalled();
  });

  it("should initialize with default state when no saved state", async () => {
    mockGetState.mockReturnValue(null);

    await expect(import("./main")).resolves.toBeDefined();
  });

  it("should handle unknown message commands", async () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    await import("./main");

    const messageHandler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === "message"
    )?.[1] as EventListener;

    const event = new MessageEvent("message", {
      data: { command: "unknownCommand", data: {} },
    });

    expect(() => {
      messageHandler(event);
    }).not.toThrow();
  });

  it("should create canvas and initialize renderer", async () => {
    await import("./main");

    const canvas = document.getElementById("schema-canvas");
    expect(canvas).toBeTruthy();
    expect(canvas?.tagName).toBe("svg");
  });

  it("should highlight the selected node when it is clicked", async () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    await import("./main");

    const messageHandler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === "message"
    )?.[1] as EventListener;

    const mockSchema = { element: [{ name: "test" }] };
    const event = new MessageEvent("message", {
      data: { command: "updateSchema", data: mockSchema },
    });

    messageHandler(event);

    const node = document.querySelector("[data-item-id]");
    expect(node).toBeTruthy();

    node?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(node?.classList.contains("selected")).toBe(true);
  });
});
