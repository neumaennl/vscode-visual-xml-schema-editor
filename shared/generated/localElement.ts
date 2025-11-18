import { XmlRoot, XmlElement, XmlAttribute, XmlAnyAttribute } from '@neumaennl/xmlbind-ts';
import { keybase } from './keybase';
@XmlRoot('localElement', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class localElement {
  @XmlAttribute('substitutionGroup')
  substitutionGroup?: String;

  @XmlAttribute('final')
  final?: String;

  @XmlAttribute('abstract')
  abstract?: String;

  @XmlAnyAttribute()
  _anyAttributes?: { [name: string]: string };

  @XmlElement('annotation', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  annotation?: any;

  @XmlElement('unique', { type: keybase, namespace: 'http://www.w3.org/2001/XMLSchema' })
  unique?: keybase;

  @XmlElement('key', { type: keybase, namespace: 'http://www.w3.org/2001/XMLSchema' })
  key?: keybase;

  @XmlElement('keyref', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  keyref?: any;

}