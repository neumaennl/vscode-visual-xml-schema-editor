/**
 * Writes XML markup for the XML tab of the `PropertiesPanel`: escaped attribute values and text,
 * indentation, and elements with their attributes and children.
 */

/** The indentation of one level. */
const INDENT = "  ";

/** An attribute of an XML element: its name and its value. */
export type XmlAttr = [name: string, value: string];

/**
 * Returns the attributes that have a value.
 *
 * @param attributes - Names with optional values
 * @returns The attributes with a value, in the same order
 */
export function optionalAttributes(attributes: Array<[name: string, value: string | undefined]>): XmlAttr[] {
  return attributes.filter((attribute): attribute is XmlAttr => attribute[1] !== undefined);
}

/**
 * Escapes the characters that XML does not allow in attribute values and text.
 *
 * @param value - The text
 * @returns The escaped text
 */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Returns the indentation of a line.
 *
 * @param level - The indentation level
 * @returns The spaces
 */
export function pad(level: number): string {
  return INDENT.repeat(level);
}

/**
 * Writes attributes as they follow the name of a tag, each with a leading space.
 *
 * @param attributes - The attributes
 * @returns The attributes, or an empty string without attributes
 */
export function toAttrString(attributes: XmlAttr[]): string {
  if (attributes.length === 0) {
    return "";
  }
  return attributes.map(([name, value]) => ` ${name}="${escapeXml(value)}"`).join("");
}

/**
 * Writes an element with its attributes and children, or as an empty tag without children.
 *
 * @param tagName - The name of the element
 * @param attributes - The attributes
 * @param children - The lines of the children, already indented
 * @param level - The indentation level
 * @returns The lines of the element
 */
export function renderTag(tagName: string, attributes: XmlAttr[], children: string[], level: number): string {
  const prefix = pad(level);
  const attrText = toAttrString(attributes);
  if (children.length === 0) {
    return `${prefix}<${tagName}${attrText}/>`;
  }
  return `${prefix}<${tagName}${attrText}>\n${children.join("\n")}\n${prefix}</${tagName}>`;
}
