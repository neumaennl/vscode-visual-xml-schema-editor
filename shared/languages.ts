/**
 * The check of `xml:lang` values: the properties panel uses it for the language field of a documentation
 * entry, and the validators of the extension host for the documentation commands. The schema of the XML
 * namespace gives `xml:lang` a value of `xs:language` or the empty string, which means no language; the
 * callers handle the empty string themselves.
 */

import type { ValidationResult } from "./validation.js";

/**
 * A value of `xs:language`: parts of letters and digits separated by hyphens, the first of letters only,
 * each at most eight characters long, such as `en` or `de-CH`. Like a validating XSD parser, it checks the
 * form of the language tags of BCP 47, not whether a tag is registered.
 */
const LANGUAGE_PATTERN = /^[a-zA-Z]{1,8}(-[a-zA-Z0-9]{1,8})*$/;

/**
 * Checks a language code for `xml:lang`. The empty string, which removes the language, is checked by the
 * caller.
 *
 * @param lang - The language code
 * @returns Valid, or invalid with a message
 */
export function validateLanguage(lang: string): ValidationResult {
  return LANGUAGE_PATTERN.test(lang)
    ? { valid: true }
    : { valid: false, error: "Language must be a language code such as en or de-CH" };
}
