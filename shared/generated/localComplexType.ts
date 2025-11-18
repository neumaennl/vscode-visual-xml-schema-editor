import { XmlRoot, XmlElement, XmlAttribute, XmlAnyAttribute } from '@neumaennl/xmlbind-ts';
@XmlRoot('localComplexType', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class localComplexType {
  @XmlAttribute('name')
  name?: String;

  @XmlAttribute('abstract')
  abstract?: String;

  @XmlAttribute('final')
  final?: String;

  @XmlAttribute('block')
  block?: String;

  @XmlAnyAttribute()
  _anyAttributes?: { [name: string]: string };

  @XmlElement('annotation', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  annotation?: any;

  @XmlElement('simpleContent', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  simpleContent?: any;

  @XmlElement('complexContent', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  complexContent?: any;

}