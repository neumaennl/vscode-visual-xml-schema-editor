import { XmlRoot, XmlElement, XmlAttribute, XmlAnyAttribute } from '@neumaennl/xmlbind-ts';
import type { derivationSet } from './types';
import { annotationType } from './annotationType';
import { simpleContentType } from './simpleContentType';
import { complexContentType } from './complexContentType';
import { groupRef } from './groupRef';
import { all } from './all';
import { explicitGroup } from './explicitGroup';
import { attribute } from './attribute';
import { attributeGroupRef } from './attributeGroupRef';
import { wildcard } from './wildcard';
@XmlRoot('topLevelComplexType', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class topLevelComplexType {
  @XmlAnyAttribute()
  _anyAttributes?: { [name: string]: string };

  @XmlAttribute('id')
  id?: string;

  @XmlAttribute('mixed')
  mixed?: boolean;

  @XmlAttribute('abstract')
  abstract?: boolean;

  @XmlAttribute('final')
  final?: derivationSet;

  @XmlAttribute('block')
  block?: derivationSet;

  @XmlAttribute('name')
  name!: string;

  @XmlElement('annotation', { type: () => annotationType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  annotation?: annotationType;

  @XmlElement('simpleContent', { type: () => simpleContentType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  simpleContent?: simpleContentType;

  @XmlElement('complexContent', { type: () => complexContentType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  complexContent?: complexContentType;

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