// Failure taxonomy shared by every built-in translation provider. Vendor-free: nothing here knows
// which service produced the failure, only what kind of failure it was. One class per file, so this
// listing is the list of ways a translation can fail.
export { TranslationProviderError } from "./TranslationProviderError";
export type { TranslationFailureCode } from "./TranslationProviderError";
export { NoContentError } from "./NoContentError";
export { UnparseableReplyError } from "./UnparseableReplyError";
export { KeySetMismatchError } from "./KeySetMismatchError";
export { TransportError } from "./TransportError";
export { ProviderConfigurationError } from "./ProviderConfigurationError";
export { wrapTransportError } from "./wrapTransportError";
