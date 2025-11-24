import { XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { openAttrs } from './openAttrs';
import { annotationType } from './annotationType';
import { topLevelSimpleType } from './topLevelSimpleType';
import { topLevelComplexType } from './topLevelComplexType';
import { namedGroup } from './namedGroup';
import { namedAttributeGroup } from './namedAttributeGroup';
export class redefineType extends openAttrs {
  @XmlAttribute('schemaLocation')
  schemaLocation!: String;

  @XmlAttribute('id')
  id?: String;

  @XmlElement('annotation', { type: annotationType, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  annotation?: annotationType[];

  @XmlElement('simpleType', { type: topLevelSimpleType, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  simpleType?: topLevelSimpleType[];

  @XmlElement('complexType', { type: topLevelComplexType, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  complexType?: topLevelComplexType[];

  @XmlElement('group', { type: namedGroup, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  group?: namedGroup[];

  @XmlElement('attributeGroup', { type: namedAttributeGroup, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  attributeGroup?: namedAttributeGroup[];

}