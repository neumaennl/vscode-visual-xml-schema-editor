// Webview-specific types (only used in webview-src, not in extension)
import { DiagramItem } from "./diagram";
import { schema, WebviewMessage, DiagramOptions } from "../shared/types";

export interface VSCodeAPI<State = unknown> {
  postMessage(message: WebviewMessage): void;
  getState(): State | undefined;
  setState(state: State): void;
}

export interface Point {
  x: number;
  y: number;
}

export interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface WebviewState {
  viewState?: ViewState;
  schema?: schema;
  diagramOptions?: DiagramOptions;
}

export interface RenderedNode {
  node: DiagramItem;
  element: SVGGElement;
  x: number;
  y: number;
  width: number;
  height: number;
}
