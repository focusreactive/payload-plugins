/** A locale code as the host's Payload config spells it, e.g. `"de"`. */
export type LocaleCode = string;

/** A translatable leaf's id-based address in the saved document, as the server mints it. */
export type LeafAddress = string;

/** The handle a run is known by; one run may cover several locales of one document. */
export type RunHandle = string;

/** A document id as text, whatever Payload's id type is. */
export type DocumentId = string;

/** An ISO-8601 timestamp. */
export type IsoDateTime = string;
