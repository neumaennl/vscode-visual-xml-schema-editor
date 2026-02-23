import { XmlRoot, XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import type { blockSet, fullDerivationSet } from './types';
import { formChoice } from './enums';
import { openAttrs } from './openAttrs';
import { includeType } from './includeType';
import { importType } from './importType';
import { redefineType } from './redefineType';
import { annotationType } from './annotationType';
import { topLevelSimpleType } from './topLevelSimpleType';
import { topLevelComplexType } from './topLevelComplexType';
import { namedGroup } from './namedGroup';
import { namedAttributeGroup } from './namedAttributeGroup';
import { topLevelElement } from './topLevelElement';
import { topLevelAttribute } from './topLevelAttribute';
import { notationType } from './notationType';
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