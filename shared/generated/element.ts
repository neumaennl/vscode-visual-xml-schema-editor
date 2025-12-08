import { XmlRoot, XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import type { allNNI, blockSet, derivationSet } from './types';
import { formChoice } from './enums';
import { annotated } from './annotated';
import { localSimpleType } from './localSimpleType';
import { localComplexType } from './localComplexType';
import { keybase } from './keybase';
import { keyrefType } from './keyrefType';
/**
 * The element element can be used either
 * at the top level to define an element-type binding globally,
 * or within a content model to either reference a globally-defined
 * element or type or declare an element-type binding locally.
 * The ref form is not allowed at the top level.
 */
@XmlRoot('element', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class element extends annotated {
  @XmlAttribute('type')
  type_?: string;

  @XmlAttribute('substitutionGroup')
  substitutionGroup?: string;

  @XmlAttribute('default')
  default_?: string;

  @XmlAttribute('fixed')
  fixed?: string;

  @XmlAttribute('nillable')
  nillable?: boolean;

  @XmlAttribute('abstract')
  abstract?: boolean;

  @XmlAttribute('final')
  final?: derivationSet;

  @XmlAttribute('block')
  block?: blockSet;

  @XmlAttribute('form')
  form?: formChoice;

  @XmlAttribute('name')
  name?: string;

  @XmlAttribute('ref')
  ref?: string;

  @XmlAttribute('minOccurs')
  minOccurs?: number;

  @XmlAttribute('maxOccurs')
  maxOccurs?: allNNI;

  @XmlElement('simpleType', { type: () => localSimpleType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  simpleType?: localSimpleType;

  @XmlElement('complexType', { type: () => localComplexType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  complexType?: localComplexType;

  @XmlElement('unique', { type: () => keybase, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  unique?: keybase[];

  @XmlElement('key', { type: () => keybase, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  key?: keybase[];

  @XmlElement('keyref', { type: () => keyrefType, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  keyref?: keyrefType[];

}