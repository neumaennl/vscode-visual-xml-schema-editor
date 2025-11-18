import { XmlRoot, XmlElement, XmlAttribute, XmlAnyAttribute } from '@neumaennl/xmlbind-ts';
@XmlRoot('topLevelSimpleType', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class topLevelSimpleType {
  @XmlAttribute('name')
  name!: String;

  @XmlAnyAttribute()
  _anyAttributes?: { [name: string]: string };

  @XmlElement('annotation', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  annotation?: any;

  @XmlElement('restriction', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  restriction?: any;

  @XmlElement('list', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  list?: any;

  @XmlElement('union', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  union?: any;

}