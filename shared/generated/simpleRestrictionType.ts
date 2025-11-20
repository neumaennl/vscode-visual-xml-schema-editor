import { XmlRoot, XmlElement, XmlAttribute, XmlAnyAttribute } from '@neumaennl/xmlbind-ts';
import { localSimpleType } from './localSimpleType';
import { facet } from './facet';
import { numFacet } from './numFacet';
import { noFixedFacet } from './noFixedFacet';
import { attribute } from './attribute';
import { attributeGroupRef } from './attributeGroupRef';
import { wildcard } from './wildcard';
@XmlRoot('simpleRestrictionType', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class simpleRestrictionType {
  @XmlAnyAttribute()
  _anyAttributes?: { [name: string]: string };

  @XmlAttribute('id')
  id?: String;

  @XmlAttribute('base')
  base!: String;

  @XmlElement('annotation', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  annotation?: any;

  @XmlElement('simpleType', { type: localSimpleType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  simpleType?: localSimpleType;

  @XmlElement('minExclusive', { type: facet, namespace: 'http://www.w3.org/2001/XMLSchema' })
  minExclusive?: facet;

  @XmlElement('minInclusive', { type: facet, namespace: 'http://www.w3.org/2001/XMLSchema' })
  minInclusive?: facet;

  @XmlElement('maxExclusive', { type: facet, namespace: 'http://www.w3.org/2001/XMLSchema' })
  maxExclusive?: facet;

  @XmlElement('maxInclusive', { type: facet, namespace: 'http://www.w3.org/2001/XMLSchema' })
  maxInclusive?: facet;

  @XmlElement('totalDigits', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  totalDigits?: any;

  @XmlElement('fractionDigits', { type: numFacet, namespace: 'http://www.w3.org/2001/XMLSchema' })
  fractionDigits?: numFacet;

  @XmlElement('length', { type: numFacet, namespace: 'http://www.w3.org/2001/XMLSchema' })
  length?: numFacet;

  @XmlElement('minLength', { type: numFacet, namespace: 'http://www.w3.org/2001/XMLSchema' })
  minLength?: numFacet;

  @XmlElement('maxLength', { type: numFacet, namespace: 'http://www.w3.org/2001/XMLSchema' })
  maxLength?: numFacet;

  @XmlElement('enumeration', { type: noFixedFacet, namespace: 'http://www.w3.org/2001/XMLSchema' })
  enumeration?: noFixedFacet;

  @XmlElement('whiteSpace', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  whiteSpace?: any;

  @XmlElement('pattern', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  pattern?: any;

  @XmlElement('attribute', { type: attribute, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  attribute?: attribute[];

  @XmlElement('attributeGroup', { type: attributeGroupRef, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  attributeGroup?: attributeGroupRef[];

  @XmlElement('anyAttribute', { type: wildcard, namespace: 'http://www.w3.org/2001/XMLSchema' })
  anyAttribute?: wildcard;

}