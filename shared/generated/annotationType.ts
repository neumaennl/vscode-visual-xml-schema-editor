import { XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { openAttrs } from './openAttrs';
import { appinfoType } from './appinfoType';
import { documentationType } from './documentationType';
export class annotationType extends openAttrs {
  @XmlAttribute('id')
  id?: String;

  @XmlElement('appinfo', { type: () => appinfoType, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  appinfo?: appinfoType[];

  @XmlElement('documentation', { type: () => documentationType, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  documentation?: documentationType[];

}