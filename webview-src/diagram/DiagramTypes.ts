/**
 * Types and enums ported from XSD Diagram project
 * Based on https://github.com/dgis/xsddiagram
 */

import type { attribute } from "../../shared/generated/attribute";
import type { allNNI } from "../../shared/generated/types";
import type { explicitGroup } from "../../shared/generated/explicitGroup";
import type { all } from "../../shared/generated/all";
import type { localComplexType } from "../../shared/generated/localComplexType";
import type { topLevelComplexType } from "../../shared/generated/topLevelComplexType";
import type { localSimpleType } from "../../shared/generated/localSimpleType";
import type { topLevelSimpleType } from "../../shared/generated/topLevelSimpleType";

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
 * Interface for schema elements that have occurrence constraints.
 * This includes localElement, groupRef, and other elements that can appear
 * within complex types.
 */
export interface ElementWithOccurrence {
  minOccurs?: number;
  maxOccurs?: allNNI;
}

/**
 * Interface for schema elements that have attribute definitions.
 * This includes complexType, extension, and restriction definitions.
 * Uses the generated attribute class directly.
 */
export interface ElementWithAttributes {
  attribute?: attribute | attribute[];
}

/**
 * Union type for complex type structures (localComplexType, topLevelComplexType).
 * These types share common structure for sequences, choices, all groups, and attributes.
 */
export type ComplexTypeLike = localComplexType | topLevelComplexType;

/**
 * Union type for simple type structures (localSimpleType, topLevelSimpleType).
 * These types share common structure for restrictions.
 */
export type SimpleTypeLike = localSimpleType | topLevelSimpleType;

/**
 * Interface for extension/restriction structures that may have attributes and content model groups.
 * This interface allows processing both complex and simple content extensions/restrictions uniformly.
 */
export interface ContentTypeLike extends ElementWithAttributes {
  base?: string;
  sequence?: explicitGroup;
  choice?: explicitGroup;
  all?: all;
}

/**
 * Union type for group structures that need expansion.
 * Represents sequence, choice, or all group structures.
 * Includes the generated schema types directly.
 */
export type GroupDefLike = explicitGroup | all;

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
   */
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
