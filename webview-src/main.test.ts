/**
 * Unit tests for main module (webview entry point).
 */

import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock the VS Code API before importing
const mockPostMessage = vi.fn();
const mockGetState = vi.fn();
const mockSetState = vi.fn();

type MockVsCodeApi = {
  postMessage: (...args: unknown[]) => unknown;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

// eslint-disable-next-line no-restricted-syntax -- Vitest needs dynamic globalThis typing
(globalThis as unknown as { acquireVsCodeApi: () => MockVsCodeApi }).acquireVsCodeApi = vi.fn(() => ({
  postMessage: mockPostMessage,
  getState: mockGetState,
  setState: mockSetState,
}));

describe("SchemaEditorApp", () => {
  beforeEach(() => {
    // Clear mocks
    vi.clearAllMocks();
    vi.resetModules();
    mockGetState.mockReturnValue(null);

    // Setup complete DOM structure
    document.body.innerHTML = `
      <svg id="schema-canvas" width="800" height="600">
        <g id="content"></g>
      </svg>
      <div id="properties-content"></div>
      <button id="zoomIn"></button>
      <button id="zoomOut"></button>
      <button id="fitView"></button>
    `;
  });

  it("should initialize and setup message listener", async() => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    // Reset modules to ensure clean state
    vi.resetModules();
    await import("./main");

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "message",
      expect.any(Function)
    );
  });

  it("should handle updateSchema message", async() => {
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

  it("should handle error message", async() => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    await import("./main");

    const messageHandler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === "message"
    )?.[1] as EventListener;

    // Get the canvas element
    const canvas = document.getElementById("schema-canvas");
    expect(canvas).toBeTruthy();
    const textContentBefore = canvas?.textContent || "";

    const event = new MessageEvent("message", {
      data: { command: "error", data: { message: "Test error" } },
    });

    messageHandler(event);

    // Verify the error is displayed in the canvas
    // The showError method adds text to the SVG canvas
    const textContentAfter = canvas?.textContent || "";
    expect(textContentAfter).not.toBe(textContentBefore);
    expect(textContentAfter).toContain("Test error");
  });

  it("should setup zoom controls", async() => {
    const addEventListenerSpy = vi.spyOn(HTMLElement.prototype, "addEventListener");

    await import("./main");

    expect(document.getElementById("zoomIn")).toBeTruthy();
    expect(document.getElementById("zoomOut")).toBeTruthy();
    expect(document.getElementById("fitView")).toBeTruthy();

    // Each button attaches a click handler
    expect(addEventListenerSpy).toHaveBeenCalledWith("click", expect.any(Function));

    addEventListenerSpy.mockRestore();
  });

  it("should restore state on initialization", async() => {
    const savedState = { 
      zoom: 1.5, 
      panX: 100, 
      panY: 50 
    };
    mockGetState.mockReturnValue(savedState);

    await import("./main");

    expect(mockGetState).toHaveBeenCalled();
  });

  it("should initialize with default state when no saved state", () => {
    mockGetState.mockReturnValue(null);

    return expect(import("./main")).resolves.toBeDefined();
  });

  it("should handle unknown message commands", async() => {
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

  it("should create canvas and initialize renderer", async() => {
    await import("./main");

    const canvas = document.getElementById("schema-canvas");
    expect(canvas).toBeTruthy();
    expect(canvas?.tagName).toBe("svg");
  });
});
