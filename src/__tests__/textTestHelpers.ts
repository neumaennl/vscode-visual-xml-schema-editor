/**
 * Assertion helpers that check the order of strings in text, such as serialized XML.
 */

/**
 * Asserts that the expected strings appear on one line in the given order.
 * Other content may appear between them.
 *
 * @param line - The line of text to search in
 * @param expectedStrings - The strings, in the order in which they must appear
 * @throws Error if a string is not found after the previous one
 *
 * @example
 * ```typescript
 * const line = '<xs:attribute name="id" type="xs:string" use="required"/>';
 * expectInOrderOnLine(line, ['name="id"', 'use="required"']); // passes
 * ```
 */
export function expectInOrderOnLine(
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

    // The next string must come after this one
    searchStartIndex = index + expectedStr.length;
  }
}

/**
 * Asserts that the expected strings appear in multi-line text in the given order,
 * each on a later line than the one before. Lines may be skipped.
 *
 * @param text - The multi-line text to search in
 * @param expectedStrings - The strings, in the order in which their lines must appear
 * @throws Error if a string is not found on a line after the line of the previous one
 *
 * @example
 * ```typescript
 * const xml = '<xs:element name="a">\n  <xs:annotation/>\n  <xs:complexType/>\n</xs:element>';
 * expectLinesInOrder(xml, ['<xs:element', '<xs:complexType']); // passes
 * ```
 */
export function expectLinesInOrder(
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
        currentLineIndex = lineIdx + 1; // The next string must be on a later line
        break;
      }
    }

    if (!found) {
      const previous = i > 0 ? expectedStrings[i - 1] : "(start of text)";
      const searchContext = lines.slice(Math.max(0, currentLineIndex - 2), currentLineIndex + 3).join('\n');
      throw new Error(
        `Expected string "${expectedStr}" not found on a line after "${previous}".\n` +
        `Searched from line ${currentLineIndex + 1}.\n` +
        `Context:\n${searchContext}`
      );
    }
  }
}
