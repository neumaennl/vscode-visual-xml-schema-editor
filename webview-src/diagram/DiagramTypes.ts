/**
 * Types and enums ported from XSD Diagram project
 * Based on https://github.com/dgis/xsddiagram
 */

import type { explicitGroup } from "../../shared/generated/explicitGroup";
import type { all } from "../../shared/generated/all";
import type { simpleExplicitGroup } from "../../shared/generated/simpleExplicitGroup";
import type { allType } from "../../shared/generated/allType";

export enum DiagramItemType {
  element = "element",
  group = "group",
  type = "type",
}

export enum DiagramItemGroupType {
  Sequence = "sequence",
  Choice = "choice",
  All = "all",
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

/**
 * Returns the smallest rectangle that contains all the given rectangles.
 *
 * @param rectangles - The rectangles; at least one
 * @returns The enclosing rectangle
 */
export function enclosingRectangle(rectangles: Rectangle[]): Rectangle {
  const minX = Math.min(...rectangles.map((r) => r.x));
  const minY = Math.min(...rectangles.map((r) => r.y));
  const maxX = Math.max(...rectangles.map((r) => r.x + r.width));
  const maxY = Math.max(...rectangles.map((r) => r.y + r.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * A single `xs:documentation` node shown in the diagram/properties-panel layer.
 * Keeps the schema ID so the UI can edit or remove the exact node later.
 */
export interface DiagramDocumentationEntry {
  id: string;
  content: string;
  lang?: string;
}

/**
 * An `xs:annotation` node shown in the diagram/properties-panel layer.
 * Keeps the schema ID plus all contained `xs:documentation` nodes.
 */
export interface DiagramAnnotationEntry {
  id: string;
  documentationEntries: DiagramDocumentationEntry[];
}

/** A named attribute of a complex type or of the schema, as the properties panel shows it. */
export interface DiagramAttribute {
  name: string;
  /** The `type` of the attribute; an attribute without one has an inline simple type */
  type?: string;
  /** `required`, `optional` or `prohibited`; top-level attributes have none */
  use?: string;
  defaultValue?: string;
  fixedValue?: string;
}

/**
 * Union type for group structures that need expansion.
 * Represents sequence, choice, or all group structures.
 * Includes the generated schema types directly.
 */
export type GroupDefLike = explicitGroup | simpleExplicitGroup | all | allType;

export interface DiagramStyle {
  fontFamily: string;
  fontSize: number;
  smallFontSize: number;
  documentationFontSize: number;
  foregroundColor: string;
  backgroundColor: string;
  lineColor: string;
}

/**
 * Get computed value of a CSS variable from the document root
 *
 * @param name - The name of the variable, such as `--vscode-font-family`
 * @param fallback - The value without a document or without the variable
 * @returns The value of the variable, or the fallback
 */
function getCssVar(name: string, fallback: string): string {
  if (typeof document !== "undefined") {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
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
