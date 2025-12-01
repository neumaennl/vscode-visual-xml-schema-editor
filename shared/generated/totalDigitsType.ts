import { XmlElement, XmlAttribute, XmlAnyAttribute } from '@neumaennl/xmlbind-ts';
import { annotationType } from './annotationType';
export class totalDigitsType {
  @XmlAnyAttribute()
  _anyAttributes?: { [name: string]: string };

  @XmlAttribute('id')
  id?: String;

  @XmlAttribute('fixed')
  fixed?: Boolean;

  @XmlAttribute('value')
  value!: Number;

  @XmlElement('annotation', { type: () => annotationType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  annotation?: annotationType;

}