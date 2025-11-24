import { XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { annotated } from './annotated';
import { complexRestrictionType } from './complexRestrictionType';
import { extensionType } from './extensionType';
/**
 * Overrides any setting on complexType parent.
 */
export class complexContentType extends annotated {
  /**
   * Overrides any setting on complexType parent.
   */
  @XmlAttribute('mixed')
  mixed?: Boolean;

  @XmlElement('restriction', { type: complexRestrictionType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  restriction?: complexRestrictionType;

  @XmlElement('extension', { type: extensionType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  extension?: extensionType;

}