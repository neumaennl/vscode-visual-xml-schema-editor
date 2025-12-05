/**
 * Base command types and interfaces for schema editing operations.
 * This module defines the foundational types used by all command types.
 */

/**
 * Base interface for all commands.
 * Commands represent editing operations on the schema.
 */
export interface BaseCommand<T = unknown> {
  /** Unique identifier for this command type */
  type: string;
  /** Payload containing command-specific data */
  payload: T;
}

/**
 * Standard response for command execution.
 */
export interface CommandResponse {
  /** Whether the command was executed successfully */
  success: boolean;
  /** Error message if execution failed */
  error?: string;
  /** Additional data returned from command execution */
  data?: unknown;
}
