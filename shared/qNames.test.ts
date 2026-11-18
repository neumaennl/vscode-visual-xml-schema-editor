/**
 * Unit tests of `qNames`.
 */

import {
  firstFreePrefix,
  isReservedPrefix,
  normalizeNamespacePrefixes,
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
