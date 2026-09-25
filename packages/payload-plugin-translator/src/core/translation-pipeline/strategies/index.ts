import type { TranslationStrategy } from "./TranslationStrategy.interface.js";
import { OverwriteStrategy } from "./Overwrite.strategy.js";
import { SkipExistingStrategy } from "./SkipExisting.strategy.js";

export type { TranslationStrategy, StrategyContext } from "./TranslationStrategy.interface.js";
export { OverwriteStrategy, SkipExistingStrategy };

/**
 * Strategy names for runtime selection.
 */
export type TranslationStrategyName = "overwrite" | "skip_existing";

/**
 * Creates a TranslationStrategy instance by name.
 */
export function createTranslationStrategy(name: TranslationStrategyName): TranslationStrategy {
  switch (name) {
    case "skip_existing":
      return new SkipExistingStrategy();
    case "overwrite":
    default:
      return new OverwriteStrategy();
  }
}
