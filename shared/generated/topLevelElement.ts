import { XmlRoot, XmlElement, XmlAttribute, XmlAnyAttribute } from '@neumaennl/xmlbind-ts';
import { blockSet, derivationSet } from './enums';
import { annotationType } from './annotationType';
import { localSimpleType } from './localSimpleType';
import { localComplexType } from './localComplexType';
import { keybase } from './keybase';
import { keyrefType } from './keyrefType';
@XmlRoot('topLevelElement', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class topLevelElement {
  @XmlAnyAttribute()
  _anyAttributes?: { [name: string]: string };

  @XmlAttribute('id')
  id?: String;

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

  @XmlAttribute('name')
  name!: String;

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