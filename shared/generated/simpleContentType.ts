import { XmlElement } from '@neumaennl/xmlbind-ts';
import { annotated } from './annotated.js';
import { simpleRestrictionType } from './simpleRestrictionType.js';
import { simpleExtensionType } from './simpleExtensionType.js';
export class simpleContentType extends annotated {
  @XmlElement('restriction', { type: () => simpleRestrictionType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  restriction?: simpleRestrictionType;

  @XmlElement('extension', { type: () => simpleExtensionType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  extension?: simpleExtensionType;

}