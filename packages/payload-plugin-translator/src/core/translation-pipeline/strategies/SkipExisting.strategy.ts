import { isEmptyRichText } from "../../kernel/lexical/isEmptyRichText.js";
import { isSerializedLexicalRoot } from "../../kernel/lexical/guards.js";
import { isEmpty } from "../../kernel/utils/isEmpty.js";
import type { TranslationStrategy, StrategyContext } from "./TranslationStrategy.interface.js";

/**
 * Only translates fields that are empty or missing in the target locale.
 * Existing translations are preserved.
 */
export class SkipExistingStrategy implements TranslationStrategy {
  shouldTranslate(ctx: StrategyContext): boolean {
    if (isEmpty(ctx.sourceValue)) return false;
    return this.isEmptyValue(ctx.targetValue);
  }

  private isEmptyValue(value: unknown): boolean {
    if (isEmpty(value)) return true;

    if (isSerializedLexicalRoot(value)) {
      return isEmptyRichText(value);
    }

    return false;
  }
}
