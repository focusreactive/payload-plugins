// Translation-provider implementations (adapters), one directory per vendor. Payload-free and
// opt-in — each vendor pulls its own deps (e.g. `openai`). Kept OUT of the framework-agnostic core
// so the core stays dependency-free; the PORT they implement lives in the core and is re-exported
// here for convenience. Naming is explicit ("translation-providers") to leave room for other kinds
// of providers later without a collision.

// The port (contract) — source of truth is the core.
export type {
  TranslationProvider,
  TranslationInput,
  TranslationOutput,
} from "../core/domain/translation-providers";

// Vendor implementations.
export * from "./openai";
