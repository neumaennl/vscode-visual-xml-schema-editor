import { XmlRoot, XmlElement, XmlAttribute, XmlAnyAttribute } from '@neumaennl/xmlbind-ts';
import { allNNI } from './enums';
import { annotationType } from './annotationType';
@XmlRoot('groupRef', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class groupRef {
  @XmlAnyAttribute()
  _anyAttributes?: { [name: string]: string };

  @XmlAttribute('id')
  id?: String;

  @XmlAttribute('minOccurs')
  minOccurs?: Number;

  @XmlAttribute('maxOccurs')
  maxOccurs?: allNNI;

  @XmlAttribute('ref')
  ref!: String;

  @XmlElement('annotation', { type: annotationType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  annotation?: annotationType;

}