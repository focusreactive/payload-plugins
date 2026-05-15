import { isEmpty } from "../../../shared";
import type {
  TranslationStrategy,
  StrategyContext,
} from "./TranslationStrategy.interface";

/**
 * Translates all fields, overwriting existing translations.
 * This is the default strategy.
 */
export class OverwriteStrategy implements TranslationStrategy {
  shouldTranslate(ctx: StrategyContext): boolean {
    return !isEmpty(ctx.sourceValue);
  }
}
