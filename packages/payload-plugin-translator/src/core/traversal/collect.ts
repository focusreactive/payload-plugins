import type { Crossing, IdPath, RegisteredLanguage, TranslationTarget } from "./contract.js";
import { walkLanguages } from "./walk.js";

/**
 * What one walk needs.
 *
 * @template L - the languages as written at the call site; the `const` inference is what narrows
 *   `entry.languageId` to the ids they carry. A language whose `id` is a plain `string` widens it
 *   back to any string.
 * @public
 */
export type CollectOptions<
  L extends readonly RegisteredLanguage[] = readonly RegisteredLanguage[],
> = {
  /**
   * Every language this walk may enter, including the one `entry` names. Two under one id are a
   * {@link DuplicateLanguageError}, raised before anything is walked.
   */
  languages: L;
  /**
   * Where the walk starts. Activated like any other crossing, with no value behind it; its id must
   * be one of `languages`, and the compiler checks it.
   */
  entry: Crossing & { languageId: L[number]["id"] };
  /**
   * Called for a leaf that was selected and is not empty, yet whose language found no text in it —
   * a format nobody can read, rather than a value nobody wants. Without this, such a leaf passes
   * through untranslated and unseen.
   */
  onSelectedWithoutText?: (idPath: IdPath, value: unknown) => void;
  /**
   * How many times the walk may hand content from one language to another before giving up.
   * Counts **crossings, not tree depth**: `schema → rich text → schema` is two.
   *
   * @default 8
   */
  maxCrossings?: number;
};

export function collectTranslationTargets<const L extends readonly RegisteredLanguage[]>(
  options: CollectOptions<L>
): TranslationTarget[] {
  const targets: TranslationTarget[] = [];
  const { onSelectedWithoutText } = options;

  walkLanguages({
    languages: options.languages,
    entry: options.entry,
    maxCrossings: options.maxCrossings,
    visit: {
      leaf(visit) {
        const crossing = visit.language.boundary(visit.node, visit.cursor, visit.value);
        if (crossing !== null) {
          visit.cross(crossing);
          return;
        }

        if (!visit.language.selects(visit.node, visit.cursor)) return;
        if (visit.language.isEmpty(visit.value)) return;

        const units = visit.language.textUnits({ value: visit.value, setValue: visit.setValue });
        if (units.length === 0) {
          onSelectedWithoutText?.(visit.idPath, visit.value);
          return;
        }

        for (const unit of units) {
          targets.push({ idPath: visit.idPath, text: unit.text, write: unit.write });
        }
      },
    },
  });

  return targets;
}

/**
 * Write answers back through the targets they belong to.
 *
 * @param targets - exactly what {@link collectTranslationTargets} returned, in that order.
 * @param translations - the answer for `targets[i]` at index `i`. A **shorter** list, or an
 *   `undefined` entry, leaves that target untouched — a translator answering with fewer values than
 *   it was sent is an ordinary outcome, not an error, and the untouched targets keep whatever they
 *   already held. Entries past the end of `targets` are ignored.
 *
 * @public
 */
export function applyTranslations(
  targets: readonly TranslationTarget[],
  translations: ReadonlyArray<string | undefined>
): void {
  for (const [index, target] of targets.entries()) {
    const translated = translations[index];
    if (translated !== undefined) target.write(translated);
  }
}
