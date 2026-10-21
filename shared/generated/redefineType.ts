import { XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { openAttrs } from './openAttrs.js';
import { annotationType } from './annotationType.js';
import { topLevelSimpleType } from './topLevelSimpleType.js';
import { topLevelComplexType } from './topLevelComplexType.js';
import { namedGroup } from './namedGroup.js';
import { namedAttributeGroup } from './namedAttributeGroup.js';
export class redefineType extends openAttrs {
  @XmlAttribute('schemaLocation')
  schemaLocation!: string;

  @XmlAttribute('id')
  id?: string;

  @XmlElement('annotation', { type: () => annotationType, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  annotation?: annotationType[];

  @XmlElement('simpleType', { type: () => topLevelSimpleType, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  simpleType?: topLevelSimpleType[];

  @XmlElement('complexType', { type: () => topLevelComplexType, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  complexType?: topLevelComplexType[];

  @XmlElement('group', { type: () => namedGroup, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  group?: namedGroup[];

  @XmlElement('attributeGroup', { type: () => namedAttributeGroup, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  attributeGroup?: namedAttributeGroup[];

}