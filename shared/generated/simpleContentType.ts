import { XmlElement } from '@neumaennl/xmlbind-ts';
import { annotated } from './annotated';
import { simpleRestrictionType } from './simpleRestrictionType';
import { simpleExtensionType } from './simpleExtensionType';
export class simpleContentType extends annotated {
  @XmlElement('restriction', { type: simpleRestrictionType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  restriction?: simpleRestrictionType;

  @XmlElement('extension', { type: simpleExtensionType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  extension?: simpleExtensionType;

}