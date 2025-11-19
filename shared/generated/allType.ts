import { XmlRoot, XmlElement, XmlAttribute, XmlAnyAttribute } from '@neumaennl/xmlbind-ts';
import { narrowMaxMin } from './narrowMaxMin';
@XmlRoot('allType', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class allType {
  @XmlAttribute('minOccurs')
  minOccurs?: String;

  @XmlAttribute('maxOccurs')
  maxOccurs?: String;

  @XmlAnyAttribute()
  _anyAttributes?: { [name: string]: string };

  @XmlElement('annotation', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  annotation?: any;

  @XmlElement('element', { type: narrowMaxMin, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  element?: narrowMaxMin[];

}