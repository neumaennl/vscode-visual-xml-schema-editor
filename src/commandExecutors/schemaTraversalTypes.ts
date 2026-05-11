import {
  complexRestrictionType,
  extensionType,
  simpleExtensionType,
  simpleRestrictionType,
} from "../../shared/types";

/**
 * complexContent extension or restriction — carry base plus full compositor
 * content (group, all, choice, sequence, attribute, attributeGroup).
 */
export type CompositorBearer = extensionType | complexRestrictionType;

/**
 * Any arm of simpleContent or complexContent — carry base, attribute, and
 * attributeGroup at minimum.
 */
export type AttributeBearer = simpleExtensionType | simpleRestrictionType | CompositorBearer;
