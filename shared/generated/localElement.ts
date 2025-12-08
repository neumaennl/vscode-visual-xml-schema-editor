import { XmlRoot, XmlElement, XmlAttribute, XmlAnyAttribute } from '@neumaennl/xmlbind-ts';
import type { allNNI, blockSet } from './types';
import { formChoice } from './enums';
import { annotationType } from './annotationType';
import { localSimpleType } from './localSimpleType';
import { localComplexType } from './localComplexType';
import { keybase } from './keybase';
import { keyrefType } from './keyrefType';
@XmlRoot('localElement', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class localElement {
  @XmlAnyAttribute()
  _anyAttributes?: { [name: string]: string };

  @XmlAttribute('id')
  id?: string;

  @XmlAttribute('name')
  name?: string;

  @XmlAttribute('ref')
  ref?: string;

  @XmlAttribute('minOccurs')
  minOccurs?: number;

  @XmlAttribute('maxOccurs')
  maxOccurs?: allNNI;

  @XmlAttribute('type')
  type_?: string;

  @XmlAttribute('default')
  default_?: string;

  @XmlAttribute('fixed')
  fixed?: string;

  @XmlAttribute('nillable')
  nillable?: boolean;

  @XmlAttribute('block')
  block?: blockSet;

  @XmlAttribute('form')
  form?: formChoice;

  @XmlElement('annotation', { type: () => annotationType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  annotation?: annotationType;

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