import { XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { annotated } from './annotated';
import { localSimpleType } from './localSimpleType';
import { facet } from './facet';
import { totalDigitsType } from './totalDigitsType';
import { numFacet } from './numFacet';
import { noFixedFacet } from './noFixedFacet';
import { whiteSpaceType } from './whiteSpaceType';
import { patternType } from './patternType';
/**
 * base attribute and simpleType child are mutually
 * exclusive, but one or other is required
 */
export class restrictionType_1 extends annotated {
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

  @XmlElement('totalDigits', { type: totalDigitsType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  totalDigits?: totalDigitsType;

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

  @XmlElement('whiteSpace', { type: whiteSpaceType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  whiteSpace?: whiteSpaceType;

  @XmlElement('pattern', { type: patternType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  pattern?: patternType;

}