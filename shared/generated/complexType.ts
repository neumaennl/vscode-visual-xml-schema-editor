import { XmlRoot, XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { derivationSet } from './enums';
import { annotated } from './annotated';
import { groupRef } from './groupRef';
import { all } from './all';
import { explicitGroup } from './explicitGroup';
import { attribute } from './attribute';
import { attributeGroupRef } from './attributeGroupRef';
import { wildcard } from './wildcard';
/**
 * Will be restricted to required or forbidden
 */
@XmlRoot('complexType', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class complexType extends annotated {
  /**
   * Will be restricted to required or forbidden
   */
  @XmlAttribute('name')
  name?: String;

  /**
   * Not allowed if simpleContent child is chosen.
   * May be overriden by setting on complexContent child.
   */
  @XmlAttribute('mixed')
  mixed?: Boolean;

  @XmlAttribute('abstract')
  abstract?: Boolean;

  @XmlAttribute('final')
  final?: derivationSet;

  @XmlAttribute('block')
  block?: derivationSet;

  @XmlElement('simpleContent', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  simpleContent?: any;

  @XmlElement('complexContent', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  complexContent?: any;

  @XmlElement('group', { type: groupRef, namespace: 'http://www.w3.org/2001/XMLSchema' })
  group?: groupRef;

  @XmlElement('all', { type: all, namespace: 'http://www.w3.org/2001/XMLSchema' })
  all?: all;

  @XmlElement('choice', { type: explicitGroup, namespace: 'http://www.w3.org/2001/XMLSchema' })
  choice?: explicitGroup;

  @XmlElement('sequence', { type: explicitGroup, namespace: 'http://www.w3.org/2001/XMLSchema' })
  sequence?: explicitGroup;

  @XmlElement('attribute', { type: attribute, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  attribute?: attribute[];

  @XmlElement('attributeGroup', { type: attributeGroupRef, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  attributeGroup?: attributeGroupRef[];

  @XmlElement('anyAttribute', { type: wildcard, namespace: 'http://www.w3.org/2001/XMLSchema' })
  anyAttribute?: wildcard;

}