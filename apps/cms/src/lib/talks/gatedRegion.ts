/**
 * The class the paywalled region of a talk page carries.
 *
 * Google matches the `cssSelector` of a paywalled-content `hasPart` against the rendered DOM, so
 * the selector and the element have to agree. Naming it once here means renaming the region cannot
 * silently invalidate the markup - and Google accepts `.class` selectors only, which is why this
 * is a class and not an id or a data attribute.
 */
export const TALK_GATED_REGION_CLASS = "talk-gated-region";
