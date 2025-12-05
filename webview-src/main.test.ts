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
    mockGetState.mockReturnValue(null);

    // Setup DOM
    document.body.innerHTML = `
      <svg id="schema-canvas"></svg>
      <div id="properties-content"></div>
      <button id="zoom-in"></button>
      <button id="zoom-out"></button>
      <button id="zoom-reset"></button>
    `;
  });

  it("should initialize and setup message listener", () => {
    // Mock window.addEventListener to capture the listener
    const addEventListenerSpy = jest.spyOn(window, "addEventListener");

    // Dynamically import to trigger constructor after mocks are setup
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
      call => call[0] === "message"
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
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    require("./main");

    const messageHandler = addEventListenerSpy.mock.calls.find(
      call => call[0] === "message"
    )?.[1] as EventListener;

    const event = new MessageEvent("message", {
      data: { command: "error", data: { message: "Test error" } },
    });

    messageHandler(event);

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
