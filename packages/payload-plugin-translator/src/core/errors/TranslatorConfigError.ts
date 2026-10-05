import { TranslatorError } from "./TranslatorError.js";

/** The host configured the plugin in a way it cannot honour — the counterpart to `TranslatorBug`, which is our own fault. */
export class TranslatorConfigError extends TranslatorError {
  readonly mustPropagate = false;
}
