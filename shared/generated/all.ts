import { XmlRoot, XmlElement, XmlAttribute, XmlAnyAttribute } from '@neumaennl/xmlbind-ts';
import { annotationType } from './annotationType';
import { narrowMaxMin } from './narrowMaxMin';
/**
 * Only elements allowed inside
 */
@XmlRoot('all', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class all {
  @XmlAnyAttribute()
  _anyAttributes?: { [name: string]: string };

  @XmlAttribute('id')
  id?: string;

  @XmlAttribute('minOccurs')
  minOccurs?: string;

  @XmlAttribute('maxOccurs')
  maxOccurs?: string;

  @XmlElement('annotation', { type: () => annotationType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  annotation?: annotationType;

  @XmlElement('element', { type: () => narrowMaxMin, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  element?: narrowMaxMin[];

}