import { XmlRoot, XmlElement, XmlAttribute, XmlAnyAttribute } from '@neumaennl/xmlbind-ts';
import { localSimpleType } from './localSimpleType';
@XmlRoot('topLevelAttribute', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class topLevelAttribute {
  @XmlAnyAttribute()
  _anyAttributes?: { [name: string]: string };

  @XmlAttribute('id')
  id?: String;

  @XmlAttribute('type')
  type_?: String;

  @XmlAttribute('default')
  default_?: String;

  @XmlAttribute('fixed')
  fixed?: String;

  @XmlAttribute('name')
  name!: String;

  @XmlElement('annotation', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  annotation?: any;

  @XmlElement('simpleType', { type: localSimpleType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  simpleType?: localSimpleType;

}