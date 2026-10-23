// Replaces the webview bundle in the extension-host tests (see
// scripts/stage-extension-host-test.ts). As soon as the extension sends the parsed
// schema, the mock answers with one edit command, like the real webview does when
// the user edits the diagram. The webview loads it with `type="module"`.

declare function acquireVsCodeApi(): { postMessage(message: object): void };

const vscodeApi = acquireVsCodeApi();
let editSent = false;

window.addEventListener("message", (event: MessageEvent<{ command: string }>) => {
  if (event.data.command !== "updateSchema" || editSent) {
    return;
  }
  editSent = true;
  vscodeApi.postMessage({
    command: "executeCommand",
    data: {
      type: "addElement",
      payload: { parentId: "schema", elementName: "smokeTestElement", elementType: "xs:string" },
    },
  });
});
