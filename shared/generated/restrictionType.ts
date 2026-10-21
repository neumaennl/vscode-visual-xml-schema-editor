import { XmlRoot, XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { annotated } from './annotated.js';
import { groupRef } from './groupRef.js';
import { all } from './all.js';
import { explicitGroup } from './explicitGroup.js';
import { localSimpleType } from './localSimpleType.js';
import { facet } from './facet.js';
import { totalDigitsType } from './totalDigitsType.js';
import { numFacet } from './numFacet.js';
import { noFixedFacet } from './noFixedFacet.js';
import { whiteSpaceType } from './whiteSpaceType.js';
import { patternType } from './patternType.js';
import { attribute } from './attribute.js';
import { attributeGroupRef } from './attributeGroupRef.js';
import { wildcard } from './wildcard.js';
@XmlRoot('restrictionType', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class restrictionType extends annotated {
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

  @XmlElement('simpleType', { type: () => localSimpleType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  simpleType?: localSimpleType;

  @XmlElement('minExclusive', { type: () => facet, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  minExclusive?: facet[];

  @XmlElement('minInclusive', { type: () => facet, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  minInclusive?: facet[];

  @XmlElement('maxExclusive', { type: () => facet, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  maxExclusive?: facet[];

  @XmlElement('maxInclusive', { type: () => facet, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  maxInclusive?: facet[];

  @XmlElement('totalDigits', { type: () => totalDigitsType, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  totalDigits?: totalDigitsType[];

  @XmlElement('fractionDigits', { type: () => numFacet, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  fractionDigits?: numFacet[];

  @XmlElement('length', { type: () => numFacet, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  length?: numFacet[];

  @XmlElement('minLength', { type: () => numFacet, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  minLength?: numFacet[];

  @XmlElement('maxLength', { type: () => numFacet, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  maxLength?: numFacet[];

  @XmlElement('enumeration', { type: () => noFixedFacet, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  enumeration?: noFixedFacet[];

  @XmlElement('whiteSpace', { type: () => whiteSpaceType, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  whiteSpace?: whiteSpaceType[];

  @XmlElement('pattern', { type: () => patternType, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  pattern?: patternType[];

  @XmlElement('attribute', { type: () => attribute, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  attribute?: attribute[];

  @XmlElement('attributeGroup', { type: () => attributeGroupRef, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  attributeGroup?: attributeGroupRef[];

  @XmlElement('anyAttribute', { type: () => wildcard, namespace: 'http://www.w3.org/2001/XMLSchema' })
  anyAttribute?: wildcard;

}