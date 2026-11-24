/**
 * Unit tests of the check of `xml:lang` values.
 */

import { validateLanguage } from "./languages.js";

describe("validateLanguage", () => {
  test.each(["en", "de-CH", "zh-Hant-TW", "x-klingon", "i-default", "en-US-1996"])("should accept %j", (lang) => {
    expect(validateLanguage(lang)).toEqual({ valid: true });
  });

  test.each(["", "en_US", "1en", "en-", "-en", "en--US", "toolonglang", "en-toolongpart9", "en US"])(
    "should reject %j with a message",
    (lang) => {
      expect(validateLanguage(lang)).toEqual({
        valid: false,
        error: "Language must be a language code such as en or de-CH",
      });
    }
  );
});
