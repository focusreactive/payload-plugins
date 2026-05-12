import type { TranslationStrategy } from './TranslationStrategy.interface'
import { OverwriteStrategy } from './Overwrite.strategy'
import { SkipExistingStrategy } from './SkipExisting.strategy'

export type { TranslationStrategy, StrategyContext } from './TranslationStrategy.interface'
export { OverwriteStrategy, SkipExistingStrategy }

/**
 * Strategy names for runtime selection.
 */
export type TranslationStrategyName = 'overwrite' | 'skip_existing'

/**
 * Creates a TranslationStrategy instance by name.
 */
export function createTranslationStrategy(name: TranslationStrategyName): TranslationStrategy {
  switch (name) {
    case 'skip_existing':
      return new SkipExistingStrategy()
    case 'overwrite':
    default:
      return new OverwriteStrategy()
  }
}
