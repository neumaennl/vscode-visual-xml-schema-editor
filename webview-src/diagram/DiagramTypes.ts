/**
 * Types and enums ported from XSD Diagram project
 * Based on https://github.com/dgis/xsddiagram
 */

export enum DiagramItemType {
  element = "element",
  group = "group",
  type = "type",
  reference = "reference",
}

export enum DiagramItemGroupType {
  Sequence = "sequence",
  Choice = "choice",
  All = "all",
}

export enum DiagramAlignement {
  Near = "near",
  Center = "center",
  Far = "far",
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DiagramStyle {
  fontFamily: string;
  fontSize: number;
  smallFontSize: number;
  documentationFontSize: number;
  foregroundColor: string;
  backgroundColor: string;
  lineColor: string;
}

// Function to get computed CSS variable value
function getCssVar(name: string, fallback: string): string {
  if (typeof document !== "undefined") {
    return (
      getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim() || fallback
    );
  }
  return fallback;
}

export const defaultDiagramStyle: DiagramStyle = {
  fontFamily: getCssVar("--vscode-font-family", "Arial, sans-serif"),
  fontSize: 10,
  smallFontSize: 8,
  documentationFontSize: 9,
  foregroundColor: getCssVar("--vscode-editor-foreground", "rgb(0,0,0)"),
  backgroundColor: getCssVar("--vscode-editor-background", "rgb(255,255,255)"),
  lineColor: getCssVar("--vscode-editor-foreground", "rgb(0,0,0)"),
};
