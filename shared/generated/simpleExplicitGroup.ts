import { XmlRoot, XmlElement, XmlAttribute, XmlAnyAttribute } from '@neumaennl/xmlbind-ts';
import { annotationType } from './annotationType';
import { localElement } from './localElement';
import { groupRef } from './groupRef';
import { explicitGroup } from './explicitGroup';
import { anyType } from './anyType';
@XmlRoot('simpleExplicitGroup', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class simpleExplicitGroup {
  @XmlAnyAttribute()
  _anyAttributes?: { [name: string]: string };

  @XmlAttribute('id')
  id?: string;

  @XmlElement('annotation', { type: () => annotationType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  annotation?: annotationType;

  @XmlElement('element', { type: () => localElement, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  element?: localElement[];

  @XmlElement('group', { type: () => groupRef, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  group?: groupRef[];

  @XmlElement('choice', { type: () => explicitGroup, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  choice?: explicitGroup[];

  @XmlElement('sequence', { type: () => explicitGroup, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  sequence?: explicitGroup[];

  @XmlElement('any', { type: () => anyType, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  any_?: anyType[];

}