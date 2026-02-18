/**
 * Custom assertion utilities for tests.
 */

/**
 * Verifies that the expected strings appear consecutively on the same line.
 * Ensures strings appear in order without other content in between.
 *
 * @param line - The line of text to search in
 * @param expectedStrings - Array of strings that should appear consecutively on the same line
 * @throws Error if any expected string is not found or if they don't appear consecutively
 *
 * @example
 * ```typescript
 * const line = '<Task id="2" title="Fix bug" status="approved"/>';
 * expectStringsOnSameLine(line, ['id="2"', 'title="Fix bug"', 'status="approved"']); // passes
 * ```
 */
export function expectStringsOnSameLine(
  line: string,
  expectedStrings: string[]
): void {
  let searchStartIndex = 0;
  
  for (let i = 0; i < expectedStrings.length; i++) {
    const expectedStr = expectedStrings[i];
    const index = line.indexOf(expectedStr, searchStartIndex);
    
    if (index === -1) {
      const previous = i > 0 ? expectedStrings[i - 1] : "(start of line)";
      throw new Error(
        `Expected string "${expectedStr}" not found after "${previous}" on the same line. ` +
        `Searched from position ${searchStartIndex} in line of length ${line.length}.`
      );
    }
    
    // Update search position for next string to ensure consecutive order
    searchStartIndex = index + expectedStr.length;
  }
}

/**
 * Verifies that the expected strings appear on consecutive lines in multi-line text.
 * Each string must appear on a separate line, and lines must appear in order.
 *
 * @param text - The multi-line text to search in
 * @param expectedStrings - Array of strings that should appear on consecutive lines
 * @throws Error if any expected string is not found or if they don't appear on consecutive lines
 *
 * @example
 * ```typescript
 * const code = 'export enum Colors {\n  red = "red",\n  blue = "blue",\n}';
 * expectStringsOnConsecutiveLines(code, ['export enum Colors', 'red = "red"', 'blue = "blue"']); // passes
 * ```
 */
export function expectStringsOnConsecutiveLines(
  text: string,
  expectedStrings: string[]
): void {
  const lines = text.split('\n');
  let currentLineIndex = 0;

  for (let i = 0; i < expectedStrings.length; i++) {
    const expectedStr = expectedStrings[i];
    let found = false;

    // Search for the expected string starting from currentLineIndex
    for (let lineIdx = currentLineIndex; lineIdx < lines.length; lineIdx++) {
      if (lines[lineIdx].includes(expectedStr)) {
        found = true;
        currentLineIndex = lineIdx + 1; // Move to next line for next search
        break;
      }
    }

    if (!found) {
      const previous = i > 0 ? expectedStrings[i - 1] : "(start of text)";
      const searchContext = lines.slice(Math.max(0, currentLineIndex - 2), currentLineIndex + 3).join('\n');
      throw new Error(
        `Expected string "${expectedStr}" not found on consecutive lines after "${previous}".\n` +
        `Searched from line ${currentLineIndex + 1}.\n` +
        `Context:\n${searchContext}`
      );
    }
  }
}
