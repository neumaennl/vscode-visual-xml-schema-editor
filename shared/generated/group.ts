import { XmlRoot, XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { allNNI } from './enums';
import { annotated } from './annotated';
import { localElement } from './localElement';
import { groupRef } from './groupRef';
import { all } from './all';
import { explicitGroup } from './explicitGroup';
import { anyType } from './anyType';
/**
 * group type for explicit groups, named top-level groups and
 * group references
 */
@XmlRoot('group', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class group extends annotated {
  @XmlAttribute('name')
  name?: String;

  @XmlAttribute('ref')
  ref?: String;

  @XmlAttribute('minOccurs')
  minOccurs?: Number;

  @XmlAttribute('maxOccurs')
  maxOccurs?: allNNI;

  @XmlElement('element', { type: () => localElement, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  element?: localElement[];

  @XmlElement('group', { type: () => groupRef, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  group?: groupRef[];

  @XmlElement('all', { type: () => all, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  all?: all[];

  @XmlElement('choice', { type: () => explicitGroup, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  choice?: explicitGroup[];

  @XmlElement('sequence', { type: () => explicitGroup, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  sequence?: explicitGroup[];

  @XmlElement('any', { type: () => anyType, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  any_?: anyType[];

}