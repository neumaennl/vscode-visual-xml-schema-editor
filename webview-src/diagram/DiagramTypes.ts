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

export const defaultDiagramStyle: DiagramStyle = {
  fontFamily: "Arial, sans-serif",
  fontSize: 10,
  smallFontSize: 8,
  documentationFontSize: 9,
  foregroundColor: "rgb(0,0,0)",
  backgroundColor: "rgb(255,255,255)",
  lineColor: "rgb(0,0,0)",
};
