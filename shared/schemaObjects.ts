/**
 * The schema objects that both sides read: the shape of their parts that the checks and the diagram look
 * at, where the content of a complex type lives, and the prefixes of the schema's target namespace.
 */

import { prefixesForNamespace } from "./qNames.js";
import type { Compositor } from "./commands/complexType.js";
import type {
  all,
  allType,
  explicitGroup,
  simpleExplicitGroup,
  annotationType,
  attribute,
  attributeGroupRef,
  complexContentType,
  complexRestrictionType,
  extensionType,
  simpleContentType,
  simpleExtensionType,
  simpleRestrictionType,
  localComplexType,
  localElement,
  localSimpleType,
  namedGroup,
  narrowMaxMin,
  schema,
  topLevelComplexType,
  topLevelElement,
  topLevelSimpleType,
  topLevelAttribute,
} from "./types.js";

/**
 * Returns the prefixes that map to the schema's own target namespace.
 *
 * @param schemaObj - Schema whose namespace declarations should be inspected
 * @returns Non-default prefixes that resolve to `targetNamespace`
 */
export function getTargetNamespacePrefixes(schemaObj: schema): string[] {
  const targetNamespace = schemaObj.targetNamespace?.toString();
  if (!targetNamespace) {
    return [];
  }
  return prefixesForNamespace(schemaObj._namespacePrefixes ?? {}, targetNamespace).filter((prefix) => prefix !== "");
}

/** The extension or restriction of the complex or simple content of a complex type. */
export type ContentDerivation = extensionType | complexRestrictionType | simpleExtensionType | simpleRestrictionType;

/** Where the content of a complex type lives: the extension or restriction of its content, or the type itself. */
export type ContentContainer = ComplexTypeObject | ContentDerivation;

/** Where the particles of a complex type with complex content live; simple content has no particles. */
export type ParticleContainer = ComplexTypeObject | extensionType | complexRestrictionType;

/** A node that may have complex or simple content, as far as these functions read it. */
interface ContentDerivations {
  complexContent?: complexContentType;
  simpleContent?: simpleContentType;
}

/**
 * Returns the `xs:extension` or `xs:restriction` of the `xs:complexContent` or `xs:simpleContent` of a
 * complex type.
 *
 * @param node - A complex type or another node that can hold content
 * @returns The extension or restriction, or `undefined` if the node has no complex or simple content
 */
export function getContentDerivation(node: ContentDerivations): ContentDerivation | undefined {
  return (
    node.complexContent?.extension ??
    node.complexContent?.restriction ??
    node.simpleContent?.extension ??
    node.simpleContent?.restriction
  );
}

/**
 * Returns the node that holds the content of a complex type: its attributes and attribute group
 * references, and with complex content also its compositor or group reference. With `xs:complexContent` or
 * `xs:simpleContent`, the content belongs in its `xs:extension` or `xs:restriction`, otherwise in the type
 * itself.
 *
 * @param complexType - The complex type
 * @returns The extension or restriction of the content, or the complex type itself
 */
export function getContentContainer(complexType: ComplexTypeObject): ContentContainer {
  return getContentDerivation(complexType) ?? complexType;
}

/**
 * Returns the node that holds the compositor or group reference of a complex type (see
 * {@link getContentContainer}).
 *
 * @param complexType - The complex type
 * @returns The extension or restriction of its complex content, or the complex type itself, or
 * `undefined` if it has simple content, which has no particles
 */
export function getParticleContainer(complexType: ComplexTypeObject): ParticleContainer | undefined {
  if (complexType.simpleContent) {
    return undefined;
  }
  return complexType.complexContent?.extension ?? complexType.complexContent?.restriction ?? complexType;
}

/** A model group with a compositor: a sequence or choice, or an `xs:all`. */
export type CompositorObject = explicitGroup | simpleExplicitGroup | all | allType;

/**
 * A sequence or a choice, which can hold other compositors: in a complex type or another compositor, or as
 * the compositor of a group definition.
 */
export type SequenceOrChoiceObject = explicitGroup | simpleExplicitGroup;

/** A node that holds at most one compositor directly: a complex type, its complex content or a group definition. */
export type CompositorHolder = ParticleContainer | namedGroup;

/** A compositor with its kind. */
export interface HeldCompositor {
  /** The kind of the compositor */
  kind: Compositor;
  /** The compositor */
  compositor: CompositorObject;
}

/**
 * Returns the compositor that a complex type, its complex content or a group definition holds directly.
 *
 * @param holder - The holder; for a complex type, the particle container (see {@link getParticleContainer})
 * @returns The compositor with its kind, or `undefined` if the holder has none
 */
export function getHeldCompositor(holder: CompositorHolder): HeldCompositor | undefined {
  if (holder.sequence) {
    return { kind: "sequence", compositor: holder.sequence };
  }
  if (holder.choice) {
    return { kind: "choice", compositor: holder.choice };
  }
  if (holder.all) {
    return { kind: "all", compositor: holder.all };
  }
  return undefined;
}

/** A local element, which can be a particle of a content model: in a sequence or choice, or in an `xs:all`. */
export type LocalElementObject = localElement | narrowMaxMin;

/** An element: top-level or local. */
export type ElementObject = topLevelElement | LocalElementObject;

/** A named complex type or the inline complex type of an element. */
export type ComplexTypeObject = topLevelComplexType | localComplexType;

/** A named simple type or the inline simple type of an element. */
export type SimpleTypeObject = topLevelSimpleType | localSimpleType;

/** A named type: a top-level simple or complex type. */
export type NamedTypeObject = topLevelSimpleType | topLevelComplexType;

/** An attribute: top-level or local. */
export type AttributeObject = topLevelAttribute | attribute;

/** A schema component as far as its name is read. */
export interface NamedComponent {
  name?: string;
}

/** A component with a name, such as one that a filter has checked. */
export interface Named {
  name: string;
}

/** A component that can refer to another one with `ref`, such as a reference to an element or group. */
export interface ReferenceHolder {
  ref?: string;
}

/** A local element or attribute, or another particle, as far as its name and reference are read. */
export type NamedChild = NamedComponent & ReferenceHolder;

/** A node that holds element declarations: the schema, a compositor or a group definition. */
export interface ElementHolder<T> {
  element?: T[];
}

/** A component that can have an annotation; the schema has a list of them instead. */
export interface AnnotatableNode {
  annotation?: annotationType;
}

/** A node that holds attributes and attribute group references directly. */
export interface AttributeContainer {
  attribute?: attribute[];
  attributeGroup?: attributeGroupRef[];
}

/**
 * Returns the node that holds the attributes and attribute group references of a complex type, a named
 * attribute group or the schema (see {@link getContentContainer}).
 *
 * @param node - A node that can hold attributes
 * @returns The extension or restriction of the content, or the node itself
 */
export function getAttributeContainer(node: unknown): AttributeContainer {
  const holder = node as ContentDerivations & AttributeContainer;
  return getContentDerivation(holder) ?? holder;
}
