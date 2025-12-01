import { XmlRoot, XmlElement, XmlAttribute, XmlAnyAttribute } from '@neumaennl/xmlbind-ts';
import { annotationType } from './annotationType';
import { allType } from './allType';
import { simpleExplicitGroup } from './simpleExplicitGroup';
@XmlRoot('namedGroup', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class namedGroup {
  @XmlAnyAttribute()
  _anyAttributes?: { [name: string]: string };

  @XmlAttribute('id')
  id?: String;

  @XmlAttribute('name')
  name!: String;

  @XmlElement('annotation', { type: () => annotationType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  annotation?: annotationType;

  @XmlElement('all', { type: () => allType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  all?: allType;

  @XmlElement('choice', { type: () => simpleExplicitGroup, namespace: 'http://www.w3.org/2001/XMLSchema' })
  choice?: simpleExplicitGroup;

  @XmlElement('sequence', { type: () => simpleExplicitGroup, namespace: 'http://www.w3.org/2001/XMLSchema' })
  sequence?: simpleExplicitGroup;

}