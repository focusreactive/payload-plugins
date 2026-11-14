export { configureAutoTranslate } from "./AutoTranslate.wiring.js";
export type { AutoTranslateModule } from "./AutoTranslate.wiring.js";
export { makeAutoTranslateHook, injectAutoTranslateHook } from "./AutoTranslateEnqueue.hook.js";
export type {
  AutoTranslatePolicyResolver,
  NormalizedAutoTranslatePolicy,
} from "./AutoTranslate.policy.js";
