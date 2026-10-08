/**
 * Context passed to translation strategy for decision making.
 */
export type StrategyContext = {
  sourceValue: unknown;
  targetValue: unknown;
  /** Whether this leaf's source moved since the recorded translation. `undefined` means unknown — do not translate on it. */
  sourceChanged?: boolean;
};

/** Called once per translatable leaf during filtering, to decide whether it is translated. */
export interface TranslationStrategy {
  /**
   * Determines if a field value should be translated.
   * @param ctx - context with source and target values
   * @returns true if field should be translated
   */
  shouldTranslate(ctx: StrategyContext): boolean;
}
