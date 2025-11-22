import { XmlRoot, XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { allNNI, blockSet, derivationSet, formChoice } from './enums';
import { annotated } from './annotated';
import { localSimpleType } from './localSimpleType';
import { localComplexType } from './localComplexType';
import { keybase } from './keybase';
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
  type_?: String;

  @XmlAttribute('substitutionGroup')
  substitutionGroup?: String;

  @XmlAttribute('default')
  default_?: String;

  @XmlAttribute('fixed')
  fixed?: String;

  @XmlAttribute('nillable')
  nillable?: Boolean;

  @XmlAttribute('abstract')
  abstract?: Boolean;

  @XmlAttribute('final')
  final?: derivationSet;

  @XmlAttribute('block')
  block?: blockSet;

  @XmlAttribute('form')
  form?: formChoice;

  @XmlAttribute('name')
  name?: String;

  @XmlAttribute('ref')
  ref?: String;

  @XmlAttribute('minOccurs')
  minOccurs?: Number;

  @XmlAttribute('maxOccurs')
  maxOccurs?: allNNI;

  @XmlElement('simpleType', { type: localSimpleType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  simpleType?: localSimpleType;

  @XmlElement('complexType', { type: localComplexType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  complexType?: localComplexType;

  @XmlElement('unique', { type: keybase, namespace: 'http://www.w3.org/2001/XMLSchema' })
  unique?: keybase;

  @XmlElement('key', { type: keybase, namespace: 'http://www.w3.org/2001/XMLSchema' })
  key?: keybase;

  @XmlElement('keyref', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  keyref?: any;

}