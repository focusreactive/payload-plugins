import type {
  CollectedContent,
  Crossing,
  IdPath,
  RegisteredLanguage,
  SlotWrite,
  TranslationTarget,
} from "./contract.js";
import { WriteRefusedError } from "./errors/index.js";
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
   * Where the walk starts: a crossing with no leaf behind it, its placement collected like any
   * other.
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

const assignWrites = (writes: readonly SlotWrite[]): void => {
  for (const { slot, value } of writes) {
    if (!Reflect.set(slot.holder, slot.key, value)) throw new WriteRefusedError(slot.key);
  }
};

export function collectTranslationTargets<const L extends readonly RegisteredLanguage[]>(
  options: CollectOptions<L>
): CollectedContent {
  const targets: TranslationTarget[] = [];
  const { onSelectedWithoutText } = options;
  const placements: SlotWrite[] = [];

  const keepPlacement = (crossing: Crossing): void => {
    if (crossing.placement !== undefined) placements.push(crossing.placement);
  };

  keepPlacement(options.entry);

  walkLanguages({
    languages: options.languages,
    entry: options.entry,
    maxCrossings: options.maxCrossings,
    visit: {
      leaf(visit) {
        const crossing = visit.language.boundary(visit.node, visit.cursor, visit.value);
        if (crossing !== null) {
          keepPlacement(crossing);
          visit.cross(crossing);
          return;
        }

        if (!visit.language.selects(visit.node, visit.cursor)) return;
        if (visit.language.isEmpty(visit.value)) return;

        const units = visit.language.textUnits({ value: visit.value, slot: visit.slot });
        if (units.length === 0) {
          onSelectedWithoutText?.(visit.idPath, visit.value);
          return;
        }

        for (const unit of units) {
          targets.push({
            idPath: visit.idPath,
            text: unit.text,
            write: (translated) => {
              assignWrites(unit.resolve(translated));
            },
          });
        }
      },
    },
  });

  return { targets, placements };
}

/**
 * Perform what one walk collected: every placement, then each answer. The walk itself writes
 * nothing.
 *
 * A placement a holder refuses raises after the earlier placements were written and before any
 * answer is. Placements run whatever the answers are, so a unit left unanswered inside a
 * handed-over copy keeps the text that copy was made from.
 *
 * @param translations - the answer for `collected.targets[i]` at index `i`. A shorter list or an
 *   `undefined` entry leaves that target as it is; entries past the end are ignored.
 *
 * @public
 */
export function applyTranslations(
  collected: CollectedContent,
  translations: ReadonlyArray<string | undefined>
): void {
  assignWrites(collected.placements);

  for (const [index, target] of collected.targets.entries()) {
    const translated = translations[index];
    if (translated !== undefined) target.write(translated);
  }
}
