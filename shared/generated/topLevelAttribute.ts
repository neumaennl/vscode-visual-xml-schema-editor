import { XmlRoot, XmlElement, XmlAttribute, XmlAnyAttribute } from '@neumaennl/xmlbind-ts';
import { annotationType } from './annotationType';
import { localSimpleType } from './localSimpleType';
@XmlRoot('topLevelAttribute', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class topLevelAttribute {
  @XmlAnyAttribute()
  _anyAttributes?: { [name: string]: string };

  @XmlAttribute('id')
  id?: string;

  @XmlAttribute('type')
  type_?: string;

  @XmlAttribute('default')
  default_?: string;

  @XmlAttribute('fixed')
  fixed?: string;

  @XmlAttribute('name')
  name!: string;

  @XmlElement('annotation', { type: () => annotationType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  annotation?: annotationType;

  @XmlElement('simpleType', { type: () => localSimpleType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  simpleType?: localSimpleType;

}