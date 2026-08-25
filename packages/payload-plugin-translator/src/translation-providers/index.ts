// Translation-provider implementations (adapters), one directory per vendor, plus the vendor-neutral
// module they are all built on. Payload-free and opt-in — a vendor adapter pulls its own SDK, and
// only when a consumer asks for the path that needs it. Kept OUT of the framework-agnostic core so
// the core stays dependency-free; the PORT they implement lives in the core and is re-exported here
// for convenience.

// The port (contract) — source of truth is the core.
export type {
  TranslationProvider,
  TranslationInput,
  TranslationOutput,
} from "../core/domain/translation-providers";

// Vendor-neutral: build a provider from your own request function, and the failure taxonomy every
// built-in provider throws.
export * from "./shared";

// Vendor implementations.
export * from "./openai";
