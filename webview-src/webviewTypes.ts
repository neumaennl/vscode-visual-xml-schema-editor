// Webview-specific types (only used in webview-src, not in extension)
import { SchemaNode } from './types';

export interface VSCodeAPI {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
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

export interface RenderedNode {
  node: SchemaNode;
  element: SVGGElement;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MessageFromExtension {
  command: "updateSchema" | "error";
  data?: any;
}

export interface MessageToExtension {
  command: "schemaModified" | "nodeClicked" | "requestClasses";
  data?: any;
}
