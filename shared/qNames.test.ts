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
  localNameIfInTargetNamespace,
  prefixesForNamespace,
  qualifiedName,
  resolveQName,
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

/** Namespace declarations with a default namespace, a prefix for it and a prefix for another namespace. */
const DECLARATIONS = { "": "urn:d", tns: "urn:t", own: "urn:t", other: "urn:o" };

describe("resolveQName", () => {
  test.each([
    ["a declared prefix", "tns:A", DECLARATIONS, { namespace: "urn:t", localName: "A" }],
    ["no prefix, in the default namespace", "A", DECLARATIONS, { namespace: "urn:d", localName: "A" }],
    ["no prefix and no default namespace, in no namespace", "A", { tns: "urn:t" }, { namespace: "", localName: "A" }],
    ["a prefix that is not declared", "x:A", DECLARATIONS, undefined],
  ])("should resolve a QName with %s", (_case, qName, declarations, expected) => {
    expect(resolveQName(qName, declarations)).toEqual(expected);
  });
});

describe("localNameIfInTargetNamespace", () => {
  test.each([
    ["tns:A", DECLARATIONS, "urn:t", "A"],
    ["own:A", DECLARATIONS, "urn:t", "A"],
    ["other:A", DECLARATIONS, "urn:t", undefined],
    // Without a prefix, the default namespace decides, not the target namespace
    ["A", DECLARATIONS, "urn:t", undefined],
    ["A", DECLARATIONS, "urn:d", "A"],
    ["A", { tns: "urn:t" }, "urn:t", undefined],
    // A schema without a target namespace owns the names in no namespace
    ["A", { tns: "urn:t" }, undefined, "A"],
    ["x:A", DECLARATIONS, "urn:t", undefined],
  ])(
    "should return for %s with %j and the target namespace %s: %s",
    (qName, declarations, targetNamespace, expected) => {
      expect(localNameIfInTargetNamespace(qName, declarations, targetNamespace)).toBe(expected);
    }
  );
});

describe("qualifiedName", () => {
  test.each([
    ["a declared prefix", "urn:t", { tns: "urn:t" }, "tns:A"],
    ["a prefix rather than the default namespace", "urn:d", { "": "urn:d", d: "urn:d" }, "d:A"],
    ["the default namespace", "urn:d", DECLARATIONS, "A"],
    ["no namespace, without a default namespace", "", { tns: "urn:t" }, "A"],
    ["no namespace, with a default namespace", "", { "": "urn:d" }, undefined],
    ["a namespace without a declaration", "urn:x", DECLARATIONS, undefined],
  ])("should write a name in %s", (_case, namespace, declarations, expected) => {
    expect(qualifiedName(namespace, "A", declarations)).toBe(expected);
  });

  test("should write what resolves back to the namespace", () => {
    expect(resolveQName(qualifiedName("urn:t", "A", DECLARATIONS)!, DECLARATIONS)).toEqual({
      namespace: "urn:t",
      localName: "A",
    });
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
