import { XmlRoot, XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { annotated } from './annotated.js';
import { groupRef } from './groupRef.js';
import { all } from './all.js';
import { explicitGroup } from './explicitGroup.js';
import { attribute } from './attribute.js';
import { attributeGroupRef } from './attributeGroupRef.js';
import { wildcard } from './wildcard.js';
@XmlRoot('extensionType', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class extensionType extends annotated {
  @XmlAttribute('base')
  base!: string;

  @XmlElement('group', { type: () => groupRef, namespace: 'http://www.w3.org/2001/XMLSchema' })
  group?: groupRef;

  @XmlElement('all', { type: () => all, namespace: 'http://www.w3.org/2001/XMLSchema' })
  all?: all;

  @XmlElement('choice', { type: () => explicitGroup, namespace: 'http://www.w3.org/2001/XMLSchema' })
  choice?: explicitGroup;

  @XmlElement('sequence', { type: () => explicitGroup, namespace: 'http://www.w3.org/2001/XMLSchema' })
  sequence?: explicitGroup;

  @XmlElement('attribute', { type: () => attribute, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  attribute?: attribute[];

  @XmlElement('attributeGroup', { type: () => attributeGroupRef, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  attributeGroup?: attributeGroupRef[];

  @XmlElement('anyAttribute', { type: () => wildcard, namespace: 'http://www.w3.org/2001/XMLSchema' })
  anyAttribute?: wildcard;

}