/**
 * Unit tests of `qNames`.
 */

import {
  firstFreePrefix,
  isAbsoluteUri,
  isValidXmlName,
  validatePrefix,
  isReservedPrefix,
  normalizeNamespacePrefixes,
  ownComponentName,
  prefixesForNamespace,
  splitQName,
} from "./qNames.js";

describe("splitQName", () => {
  test.each([
    ["tns:Address", "tns", "Address"],
    ["Address", undefined, "Address"],
    [":Address", undefined, ":Address"],
    ["a:b:c", "a", "b:c"],
  ])("should split %s", (qName, prefix, localName) => {
    expect(splitQName(qName)).toEqual({ prefix, localName });
  });
});

describe("ownComponentName", () => {
  test.each([
    ["Address", ["tns"], "Address"],
    ["tns:Address", ["tns", "own"], "Address"],
    ["own:Address", ["tns", "own"], "Address"],
    ["other:Address", ["tns"], undefined],
    ["tns:Address", [], undefined],
  ])("should return for %s with the prefixes %j of the target namespace: %s", (qName, tnsPrefixes, expected) => {
    expect(ownComponentName(qName, tnsPrefixes)).toBe(expected);
  });
});

describe("isReservedPrefix", () => {
  test.each([
    ["xml", true],
    ["xmlns", true],
    ["xs", false],
    ["", false],
  ])("should return for %s: %s", (prefix, expected) => {
    expect(isReservedPrefix(prefix)).toBe(expected);
  });
});

describe("prefixesForNamespace", () => {
  test("should return all prefixes of the namespace, including the empty one", () => {
    const prefixes = { "": "urn:a", tns: "urn:a", xs: "http://www.w3.org/2001/XMLSchema", other: "urn:a" };
    expect(prefixesForNamespace(prefixes, "urn:a")).toEqual(["", "tns", "other"]);
    expect(prefixesForNamespace(prefixes, "urn:b")).toEqual([]);
  });
});

describe("firstFreePrefix", () => {
  test("should return the first prefix nsN that is not declared", () => {
    expect(firstFreePrefix({})).toBe("ns0");
    expect(firstFreePrefix({ ns0: "urn:a", ns1: "urn:b", ns3: "urn:c" })).toBe("ns2");
  });
});

describe("normalizeNamespacePrefixes", () => {
  test("should trim the declarations and leave out those without a URI", () => {
    expect(normalizeNamespacePrefixes({ " tns ": " urn:a ", empty: "  ", xml: "urn:x" })).toEqual({
      tns: "urn:a",
      xml: "urn:x",
    });
  });
});

describe("isValidXmlName", () => {
  test("should accept valid XML names", () => {
    expect(isValidXmlName("element")).toBe(true);
    expect(isValidXmlName("Element")).toBe(true);
    expect(isValidXmlName("element_name")).toBe(true);
    expect(isValidXmlName("element-name")).toBe(true);
    expect(isValidXmlName("element123")).toBe(true);
    expect(isValidXmlName("_element")).toBe(true);
  });

  test("should reject invalid XML names", () => {
    expect(isValidXmlName("123element")).toBe(false);
    expect(isValidXmlName("-element")).toBe(false);
    expect(isValidXmlName("element name")).toBe(false);
    expect(isValidXmlName("")).toBe(false);
  });
});

describe("isAbsoluteUri", () => {
  test.each([
    ["http://example.com/ns", true],
    ["urn:example:ns", true],
    ["example.com/ns", false],
    ["http://example.com/a b", false],
    ["", false],
  ])("should return for %j: %s", (value, expected) => {
    expect(isAbsoluteUri(value)).toBe(expected);
  });
});

describe("validatePrefix", () => {
  test.each([
    ["tns", { valid: true }],
    ["", { valid: true }],
    [" tns", { valid: false, error: "Prefix ' tns' must not contain leading or trailing whitespace" }],
    ["xml", { valid: false, error: "Prefix 'xml' is reserved and cannot be used" }],
    ["1a", { valid: false, error: "Prefix '1a' is not a valid XML name" }],
  ])("should check the prefix %j", (prefix, expected) => {
    expect(validatePrefix(prefix)).toEqual(expected);
  });
});
