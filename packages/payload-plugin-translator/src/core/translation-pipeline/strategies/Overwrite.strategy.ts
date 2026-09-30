import { isEmpty } from "../../kernel/utils/isEmpty.js";
import type { TranslationStrategy, StrategyContext } from "./TranslationStrategy.interface.js";

/**
 * Translates all fields, overwriting existing translations.
 * This is the default strategy.
 */
export class OverwriteStrategy implements TranslationStrategy {
  shouldTranslate(ctx: StrategyContext): boolean {
    return !isEmpty(ctx.sourceValue);
  }
}
