import { XmlRoot, XmlElement } from '@neumaennl/xmlbind-ts';
import { annotated } from './annotated';
import { simpleRestrictionType } from './simpleRestrictionType';
import { simpleExtensionType } from './simpleExtensionType';
@XmlRoot('simpleContent', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class simpleContent extends annotated {
  @XmlElement('restriction', { type: simpleRestrictionType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  restriction?: simpleRestrictionType;

  @XmlElement('extension', { type: simpleExtensionType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  extension?: simpleExtensionType;

}