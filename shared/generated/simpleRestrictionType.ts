import { XmlRoot, XmlElement, XmlAttribute, XmlAnyAttribute } from '@neumaennl/xmlbind-ts';
import { annotationType } from './annotationType';
import { localSimpleType } from './localSimpleType';
import { facet } from './facet';
import { totalDigitsType } from './totalDigitsType';
import { numFacet } from './numFacet';
import { noFixedFacet } from './noFixedFacet';
import { whiteSpaceType } from './whiteSpaceType';
import { patternType } from './patternType';
import { attribute } from './attribute';
import { attributeGroupRef } from './attributeGroupRef';
import { wildcard } from './wildcard';
/**
 * This choice is added simply to
 * make this a valid restriction per the REC
 */
@XmlRoot('simpleRestrictionType', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class simpleRestrictionType {
  @XmlAnyAttribute()
  _anyAttributes?: { [name: string]: string };

  @XmlAttribute('id')
  id?: String;

  @XmlAttribute('base')
  base!: String;

  @XmlElement('annotation', { type: () => annotationType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  annotation?: annotationType;

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