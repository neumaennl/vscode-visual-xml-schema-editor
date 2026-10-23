import { XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { annotated } from './annotated.js';
import { localSimpleType } from './localSimpleType.js';
import { facet } from './facet.js';
import { totalDigitsType } from './totalDigitsType.js';
import { numFacet } from './numFacet.js';
import { noFixedFacet } from './noFixedFacet.js';
import { whiteSpaceType } from './whiteSpaceType.js';
import { patternType } from './patternType.js';
/**
 * base attribute and simpleType child are mutually
 * exclusive, but one or other is required
 */
export class restrictionType_1 extends annotated {
  @XmlAttribute('base')
  base?: string;

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

}