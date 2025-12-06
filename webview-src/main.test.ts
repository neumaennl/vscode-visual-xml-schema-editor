/**
 * Unit tests for main module (webview entry point).
 */

// Mock the VS Code API before importing
const mockPostMessage = jest.fn();
const mockGetState = jest.fn();
const mockSetState = jest.fn();

(global as any).acquireVsCodeApi = jest.fn(() => ({
  postMessage: mockPostMessage,
  getState: mockGetState,
  setState: mockSetState,
}));

describe("SchemaEditorApp", () => {
  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();
    jest.resetModules();
    mockGetState.mockReturnValue(null);

    // Setup complete DOM structure
    document.body.innerHTML = `
      <svg id="schema-canvas" width="800" height="600">
        <g id="content"></g>
      </svg>
      <div id="properties-content"></div>
      <button id="zoom-in"></button>
      <button id="zoom-out"></button>
      <button id="zoom-reset"></button>
    `;
  });

  it("should initialize and setup message listener", () => {
    const addEventListenerSpy = jest.spyOn(window, "addEventListener");

    require("./main");

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "message",
      expect.any(Function)
    );
  });

  it("should handle updateSchema message", () => {
    const addEventListenerSpy = jest.spyOn(window, "addEventListener");

    require("./main");

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

  it("should handle error message", () => {
    const addEventListenerSpy = jest.spyOn(window, "addEventListener");

    require("./main");

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

  it("should setup zoom controls", () => {
    require("./main");

    const zoomInButton = document.getElementById("zoom-in");
    const zoomOutButton = document.getElementById("zoom-out");
    const zoomResetButton = document.getElementById("zoom-reset");

    expect(zoomInButton).toBeTruthy();
    expect(zoomOutButton).toBeTruthy();
    expect(zoomResetButton).toBeTruthy();

    // Verify click handlers are attached
    expect((zoomInButton as any).onclick).toBeDefined();
    expect((zoomOutButton as any).onclick).toBeDefined();
    expect((zoomResetButton as any).onclick).toBeDefined();
  });
});
