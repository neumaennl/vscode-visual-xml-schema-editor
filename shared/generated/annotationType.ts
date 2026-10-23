import { XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { openAttrs } from './openAttrs.js';
import { appinfoType } from './appinfoType.js';
import { documentationType } from './documentationType.js';
export class annotationType extends openAttrs {
  @XmlAttribute('id')
  id?: string;

  @XmlElement('appinfo', { type: () => appinfoType, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  appinfo?: appinfoType[];

  @XmlElement('documentation', { type: () => documentationType, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  documentation?: documentationType[];

}