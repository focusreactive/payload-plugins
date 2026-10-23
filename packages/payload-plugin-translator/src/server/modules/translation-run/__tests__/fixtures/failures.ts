import { TranslatorError } from "../../../../../core/errors/index.js";

export class PluginFailure extends TranslatorError {
  readonly mustPropagate: boolean;

  constructor(message: string, mustPropagate: boolean) {
    super(message);
    this.mustPropagate = mustPropagate;
  }
}
