import { XmlRoot, XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import type { blockSet, fullDerivationSet } from './types.js';
import { formChoice } from './enums.js';
import { openAttrs } from './openAttrs.js';
import { includeType } from './includeType.js';
import { importType } from './importType.js';
import { redefineType } from './redefineType.js';
import { annotationType } from './annotationType.js';
import { topLevelSimpleType } from './topLevelSimpleType.js';
import { topLevelComplexType } from './topLevelComplexType.js';
import { namedGroup } from './namedGroup.js';
import { namedAttributeGroup } from './namedAttributeGroup.js';
import { topLevelElement } from './topLevelElement.js';
import { topLevelAttribute } from './topLevelAttribute.js';
import { notationType } from './notationType.js';
@XmlRoot('schema', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class schema extends openAttrs {
  _namespacePrefixes?: Record<string, string>;

  @XmlAttribute('targetNamespace')
  targetNamespace?: string;

  @XmlAttribute('version')
  version?: string;

  @XmlAttribute('finalDefault')
  finalDefault?: fullDerivationSet;

  @XmlAttribute('blockDefault')
  blockDefault?: blockSet;

  @XmlAttribute('attributeFormDefault')
  attributeFormDefault?: formChoice;

  @XmlAttribute('elementFormDefault')
  elementFormDefault?: formChoice;

  @XmlAttribute('id')
  id?: string;

  @XmlElement('include', { type: () => includeType, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  include?: includeType[];

  @XmlElement('import', { type: () => importType, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  import_?: importType[];

  @XmlElement('redefine', { type: () => redefineType, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  redefine?: redefineType[];

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

  @XmlElement('element', { type: () => topLevelElement, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  element?: topLevelElement[];

  @XmlElement('attribute', { type: () => topLevelAttribute, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  attribute?: topLevelAttribute[];

  @XmlElement('notation', { type: () => notationType, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  notation?: notationType[];

}