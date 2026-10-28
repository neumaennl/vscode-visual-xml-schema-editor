/**
 * Main export file for shared types between extension and webview.
 * This module consolidates all command types and message protocol definitions.
 */

// Re-export XML Schema generated classes
export * from "./generated/index.js";

// Re-export the main schema class for convenience
export { schema as Schema } from "./generated/index.js";

// Re-export all command types
export * from "./commands/index.js";

// Re-export message protocol types
export * from "./messages.js";
