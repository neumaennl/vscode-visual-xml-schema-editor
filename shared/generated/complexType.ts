import { XmlRoot, XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { derivationSet } from './enums';
import { annotated } from './annotated';
@XmlRoot('complexType', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class complexType extends annotated {
  @XmlAttribute('name')
  name?: String;

  @XmlAttribute('mixed')
  mixed?: Boolean;

  @XmlAttribute('abstract')
  abstract?: Boolean;

  @XmlAttribute('final')
  final?: derivationSet;

  @XmlAttribute('block')
  block?: derivationSet;

  @XmlElement('simpleContent', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  simpleContent?: any;

  @XmlElement('complexContent', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  complexContent?: any;

}