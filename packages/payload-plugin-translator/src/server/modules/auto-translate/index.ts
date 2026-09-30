// Auto-translate adapter (Payload-backed). The payload-free drift predicate + config reader live in
// the core (src/core/domain/auto-translate, src/core/domain/content-projection); this module is the config-time
// wiring + the afterChange hook that enqueues translations on a source-locale change (#51).
export { configureAutoTranslate } from "./AutoTranslate.wiring.js";
export type { AutoTranslateModule } from "./AutoTranslate.wiring.js";
export { makeAutoTranslateHook, injectAutoTranslateHook } from "./AutoTranslateEnqueue.hook.js";
export type {
  AutoTranslatePolicyResolver,
  NormalizedAutoTranslatePolicy,
} from "./AutoTranslate.policy.js";
// Generic locale-set extraction, reused by the manual enqueue path to validate multi-target input.
export { extractLocaleCodes } from "./AutoTranslate.policy.js";
export type { LocalizationLike } from "./AutoTranslate.policy.js";
