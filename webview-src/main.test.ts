/**
 * Unit tests for main module (webview entry point).
 */

// Mock the VS Code API before importing
const mockPostMessage = jest.fn();
const mockGetState = jest.fn();
const mockSetState = jest.fn();

type MockVsCodeApi = {
  postMessage: jest.Mock;
  getState: jest.Mock;
  setState: jest.Mock;
};

const globalWithAcquire = globalThis as typeof globalThis & {
  acquireVsCodeApi: jest.Mock<MockVsCodeApi, []>;
};

globalWithAcquire.acquireVsCodeApi = jest.fn(() => ({
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
      <button id="zoomIn"></button>
      <button id="zoomOut"></button>
      <button id="fitView"></button>
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
    const addEventListenerSpy = jest.spyOn(HTMLElement.prototype, "addEventListener");

    require("./main");

    expect(document.getElementById("zoomIn")).toBeTruthy();
    expect(document.getElementById("zoomOut")).toBeTruthy();
    expect(document.getElementById("fitView")).toBeTruthy();

    // Each button attaches a click handler
    expect(addEventListenerSpy).toHaveBeenCalledWith("click", expect.any(Function));

    addEventListenerSpy.mockRestore();
  });

  it("should restore state on initialization", () => {
    const savedState = { 
      zoom: 1.5, 
      panX: 100, 
      panY: 50 
    };
    mockGetState.mockReturnValue(savedState);

    require("./main");

    expect(mockGetState).toHaveBeenCalled();
  });

  it("should initialize with default state when no saved state", () => {
    mockGetState.mockReturnValue(null);

    expect(() => {
      require("./main");
    }).not.toThrow();
  });

  it("should handle unknown message commands", () => {
    const addEventListenerSpy = jest.spyOn(window, "addEventListener");

    require("./main");

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

  it("should create canvas and initialize renderer", () => {
    require("./main");

    const canvas = document.getElementById("schema-canvas");
    expect(canvas).toBeTruthy();
    expect(canvas?.tagName).toBe("svg");
  });
});
