import { XmlRoot, XmlAttribute, XmlText, XmlAnyElement, XmlAnyAttribute } from '@neumaennl/xmlbind-ts';
@XmlRoot('documentation', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class documentation {
  @XmlAttribute('source')
  source?: String;

  @XmlAnyAttribute()
  _anyAttributes?: { [name: string]: string };

  @XmlAnyElement()
  _any?: unknown[];

  @XmlText()
  value?: String;

}