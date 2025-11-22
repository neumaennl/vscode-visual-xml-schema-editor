import { XmlRoot, XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { annotated } from './annotated';
import { localSimpleType } from './localSimpleType';
import { facet } from './facet';
import { numFacet } from './numFacet';
import { noFixedFacet } from './noFixedFacet';
/**
 * base attribute and simpleType child are mutually
 * exclusive, but one or other is required
 */
@XmlRoot('restriction', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class restriction extends annotated {
  @XmlAttribute('base')
  base?: String;

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

}