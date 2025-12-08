import { XmlRoot, XmlText, XmlAnyElement, XmlAnyAttribute } from '@neumaennl/xmlbind-ts';
/**
 * Not the real urType, but as close an approximation as we can
 * get in the XML representation
 */
@XmlRoot('anyType', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class anyType {
  @XmlAnyAttribute()
  _anyAttributes?: { [name: string]: string };

  @XmlAnyElement()
  _any?: unknown[];

  @XmlText()
  value?: string;

}