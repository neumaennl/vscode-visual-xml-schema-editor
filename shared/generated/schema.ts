import { XmlRoot, XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { blockSet, formChoice, fullDerivationSet } from './enums';
import { openAttrs } from './openAttrs';
import { topLevelSimpleType } from './topLevelSimpleType';
import { topLevelComplexType } from './topLevelComplexType';
import { namedGroup } from './namedGroup';
import { namedAttributeGroup } from './namedAttributeGroup';
import { topLevelElement } from './topLevelElement';
import { topLevelAttribute } from './topLevelAttribute';
@XmlRoot('schema', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class schema extends openAttrs {
  @XmlAttribute('targetNamespace')
  targetNamespace?: String;

  @XmlAttribute('version')
  version?: String;

  @XmlAttribute('finalDefault')
  finalDefault?: fullDerivationSet;

  @XmlAttribute('blockDefault')
  blockDefault?: blockSet;

  @XmlAttribute('attributeFormDefault')
  attributeFormDefault?: formChoice;

  @XmlAttribute('elementFormDefault')
  elementFormDefault?: formChoice;

  @XmlAttribute('id')
  id?: String;

  @XmlElement('include', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  include?: any;

  @XmlElement('import', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  import_?: any;

  @XmlElement('redefine', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  redefine?: any;

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

  @XmlElement('element', { type: topLevelElement, namespace: 'http://www.w3.org/2001/XMLSchema' })
  element?: topLevelElement;

  @XmlElement('attribute', { type: topLevelAttribute, namespace: 'http://www.w3.org/2001/XMLSchema' })
  attribute?: topLevelAttribute;

  @XmlElement('notation', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  notation?: any;

}