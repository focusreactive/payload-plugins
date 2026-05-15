/**
 * Context passed to translation strategy for decision making.
 */
export interface StrategyContext {
  sourceValue: unknown;
  targetValue: unknown;
}

/**
 * Strategy interface for determining which fields should be translated.
 * Implement this interface to create custom translation strategies.
 *
 * Works at data level - called for each translatable field during filtering.
 */
export interface TranslationStrategy {
  /**
   * Determines if a field value should be translated.
   * @param ctx - context with source and target values
   * @returns true if field should be translated
   */
  shouldTranslate(ctx: StrategyContext): boolean;
}
