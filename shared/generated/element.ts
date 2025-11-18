import { XmlRoot, XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { allNNI, blockSet, derivationSet, formChoice } from './enums';
import { annotated } from './annotated';
import { keybase } from './keybase';
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

  @XmlElement('unique', { type: keybase, namespace: 'http://www.w3.org/2001/XMLSchema' })
  unique?: keybase;

  @XmlElement('key', { type: keybase, namespace: 'http://www.w3.org/2001/XMLSchema' })
  key?: keybase;

  @XmlElement('keyref', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  keyref?: any;

}