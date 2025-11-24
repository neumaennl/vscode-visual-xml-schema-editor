import { XmlAttribute, XmlText, XmlAnyElement, XmlAnyAttribute } from '@neumaennl/xmlbind-ts';
export class appinfoType {
  @XmlAttribute('source')
  source?: String;

  @XmlAnyAttribute()
  _anyAttributes?: { [name: string]: string };

  @XmlAnyElement()
  _any?: unknown[];

  @XmlText()
  value?: String;

}