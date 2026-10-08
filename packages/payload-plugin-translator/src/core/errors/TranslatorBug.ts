import { TranslatorError } from "./TranslatorError.js";

/** A defect in this plugin — an unreachable state actually reached — never a condition the host can cause. */
export class TranslatorBug extends TranslatorError {
  readonly mustPropagate = false;
}
