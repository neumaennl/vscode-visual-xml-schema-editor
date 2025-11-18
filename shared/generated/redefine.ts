import { XmlRoot, XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { openAttrs } from './openAttrs';
import { topLevelSimpleType } from './topLevelSimpleType';
import { topLevelComplexType } from './topLevelComplexType';
import { namedGroup } from './namedGroup';
import { namedAttributeGroup } from './namedAttributeGroup';
@XmlRoot('redefine', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class redefine extends openAttrs {
  @XmlAttribute('schemaLocation')
  schemaLocation!: String;

  @XmlAttribute('id')
  id?: String;

  @XmlElement('annotation', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  annotation?: any;

  @XmlElement('simpleType', { type: topLevelSimpleType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  simpleType?: topLevelSimpleType;

  @XmlElement('complexType', { type: topLevelComplexType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  complexType?: topLevelComplexType;

  @XmlElement('group', { type: namedGroup, namespace: 'http://www.w3.org/2001/XMLSchema' })
  group?: namedGroup;

  @XmlElement('attributeGroup', { type: namedAttributeGroup, namespace: 'http://www.w3.org/2001/XMLSchema' })
  attributeGroup?: namedAttributeGroup;

}