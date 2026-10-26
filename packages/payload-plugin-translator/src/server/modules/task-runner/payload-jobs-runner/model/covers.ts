import type { TranslationFilter } from "../../../../../core/domain/selection/index.js";

/**
 * Whether a run already carrying `listed` will translate at least what `asked` wants.
 *
 * Deliberately conservative: a `rule` is only known to imply the same rule by name, so a `false`
 * costs a second run, never lost work.
 */
export type Covers = (
  listed: readonly TranslationFilter[],
  asked: readonly TranslationFilter[]
) => boolean;

const impliedBySomeOf = (listed: TranslationFilter, asked: readonly TranslationFilter[]): boolean =>
  asked.some((ask) => {
    if (listed.kind === "leaves") {
      return (
        ask.kind === "leaves" &&
        ask.addresses.every((address) => listed.addresses.includes(address))
      );
    }
    return ask.kind === "rule" && ask.name === listed.name;
  });

export const covers: Covers = (listed, asked) =>
  listed.every((filter) => impliedBySomeOf(filter, asked));
