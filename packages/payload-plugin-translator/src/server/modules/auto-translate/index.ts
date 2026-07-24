// Auto-translate adapter (Payload-backed). The payload-free drift predicate + config reader live in
// the core (src/core/domain/auto-translate, src/core/domain/content-projection); this module is the config-time
// wiring + the afterChange hook that enqueues translations on a source-locale change (#51).
export { configureAutoTranslate } from "./AutoTranslate.wiring";
export type { AutoTranslateModule } from "./AutoTranslate.wiring";
export { makeAutoTranslateHook, injectAutoTranslateHook } from "./AutoTranslateEnqueue.hook";
export type {
  AutoTranslatePolicyResolver,
  NormalizedAutoTranslatePolicy,
} from "./AutoTranslate.policy";
// Generic locale-set extraction, reused by the manual enqueue path to validate multi-target input.
export { extractLocaleCodes } from "./AutoTranslate.policy";
export type { LocalizationLike } from "./AutoTranslate.policy";
