import { isEmptyRichText } from "../../kernel/lexical/isEmptyRichText.js";
import { isSerializedLexicalRoot } from "../../kernel/lexical/guards.js";
import { isEmpty } from "../../kernel/utils/isEmpty.js";
import type { TranslationStrategy, StrategyContext } from "./TranslationStrategy.interface.js";

/** Fills an empty target, and refreshes one whose receipt shows the source moved; anything else is left alone. */
export class SkipExistingStrategy implements TranslationStrategy {
  shouldTranslate(ctx: StrategyContext): boolean {
    if (isEmpty(ctx.sourceValue)) return false;
    if (this.isEmptyValue(ctx.targetValue)) return true;
    return ctx.sourceChanged === true;
  }

  private isEmptyValue(value: unknown): boolean {
    if (isEmpty(value)) return true;

    if (isSerializedLexicalRoot(value)) {
      return isEmptyRichText(value);
    }

    return false;
  }
}
