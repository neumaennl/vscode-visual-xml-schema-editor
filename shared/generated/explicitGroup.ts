import { XmlRoot, XmlElement, XmlAttribute, XmlAnyAttribute } from '@neumaennl/xmlbind-ts';
import { allNNI } from './enums';
import { localElement } from './localElement';
import { groupRef } from './groupRef';
/**
 * group type for the three kinds of group
 */
@XmlRoot('explicitGroup', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class explicitGroup {
  @XmlAnyAttribute()
  _anyAttributes?: { [name: string]: string };

  @XmlAttribute('id')
  id?: String;

  @XmlAttribute('minOccurs')
  minOccurs?: Number;

  @XmlAttribute('maxOccurs')
  maxOccurs?: allNNI;

  @XmlElement('annotation', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  annotation?: any;

  @XmlElement('element', { type: localElement, namespace: 'http://www.w3.org/2001/XMLSchema' })
  element?: localElement;

  @XmlElement('group', { type: groupRef, namespace: 'http://www.w3.org/2001/XMLSchema' })
  group?: groupRef;

  @XmlElement('choice', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  choice?: explicitGroup;

  @XmlElement('sequence', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  sequence?: explicitGroup;

  @XmlElement('any', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  any_?: any;

}