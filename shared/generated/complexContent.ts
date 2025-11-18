import { XmlRoot, XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { annotated } from './annotated';
import { complexRestrictionType } from './complexRestrictionType';
import { extensionType } from './extensionType';
@XmlRoot('complexContent', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class complexContent extends annotated {
  @XmlAttribute('mixed')
  mixed?: Boolean;

  @XmlElement('restriction', { type: complexRestrictionType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  restriction?: complexRestrictionType;

  @XmlElement('extension', { type: extensionType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  extension?: extensionType;

}