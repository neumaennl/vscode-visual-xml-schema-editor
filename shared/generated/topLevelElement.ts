import { XmlRoot, XmlElement, XmlAttribute, XmlAnyAttribute } from '@neumaennl/xmlbind-ts';
import { blockSet, derivationSet } from './enums';
import { localSimpleType } from './localSimpleType';
import { localComplexType } from './localComplexType';
import { keybase } from './keybase';
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

  @XmlElement('annotation', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  annotation?: any;

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