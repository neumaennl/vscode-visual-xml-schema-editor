import {
  isValidXmlName,
  validateMinOccurs,
  validateMaxOccurs,
  validateOccurrences,
} from "./validationUtils";

describe("validationUtils", () => {
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

  describe("validateMinOccurs", () => {
    test("should accept undefined minOccurs", () => {
      const result = validateMinOccurs(undefined);
      expect(result.valid).toBe(true);
    });

    test("should accept valid minOccurs values", () => {
      expect(validateMinOccurs(0).valid).toBe(true);
      expect(validateMinOccurs(1).valid).toBe(true);
      expect(validateMinOccurs(10).valid).toBe(true);
    });

    test("should reject negative minOccurs", () => {
      const result = validateMinOccurs(-1);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("minOccurs must be a non-negative integer");
    });

    test("should reject non-integer minOccurs", () => {
      const result = validateMinOccurs(1.5);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("minOccurs must be an integer");
    });
  });

  describe("validateMaxOccurs", () => {
    test("should accept undefined maxOccurs", () => {
      const result = validateMaxOccurs(undefined);
      expect(result.valid).toBe(true);
    });

    test("should accept 'unbounded' maxOccurs", () => {
      const result = validateMaxOccurs("unbounded");
      expect(result.valid).toBe(true);
    });

    test("should accept valid numeric maxOccurs values", () => {
      expect(validateMaxOccurs(0).valid).toBe(true);
      expect(validateMaxOccurs(1).valid).toBe(true);
      expect(validateMaxOccurs(10).valid).toBe(true);
    });

    test("should reject negative maxOccurs", () => {
      const result = validateMaxOccurs(-1);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        "maxOccurs must be a non-negative integer or 'unbounded'"
      );
    });

    test("should reject non-integer maxOccurs", () => {
      const result = validateMaxOccurs(1.5);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("maxOccurs must be an integer or 'unbounded'");
    });
  });

  describe("validateOccurrences", () => {
    test("should accept undefined minOccurs and maxOccurs", () => {
      const result = validateOccurrences(undefined, undefined);
      expect(result.valid).toBe(true);
    });

    test("should accept valid minOccurs and maxOccurs", () => {
      expect(validateOccurrences(0, 1).valid).toBe(true);
      expect(validateOccurrences(1, 10).valid).toBe(true);
      expect(validateOccurrences(0, "unbounded").valid).toBe(true);
    });

    test("should reject invalid minOccurs", () => {
      const result = validateOccurrences(-1, 10);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("minOccurs must be a non-negative integer");
    });

    test("should reject invalid maxOccurs", () => {
      const result = validateOccurrences(1, -1);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        "maxOccurs must be a non-negative integer or 'unbounded'"
      );
    });

    test("should reject minOccurs > maxOccurs", () => {
      const result = validateOccurrences(10, 5);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("minOccurs must be <= maxOccurs");
    });

    test("should accept minOccurs <= maxOccurs with unbounded", () => {
      const result = validateOccurrences(10, "unbounded");
      expect(result.valid).toBe(true);
    });

    test("should accept equal minOccurs and maxOccurs", () => {
      const result = validateOccurrences(5, 5);
      expect(result.valid).toBe(true);
    });
  });
});
