/**
 * Assertions the type-checker makes and the suite cannot. Nothing here runs: `check-types` fails
 * if any `@ts-expect-error` below stops being an error, which is what pins these guarantees.
 */

import { collectTranslationTargets } from "../collect.js";
import type { Language } from "../contract.js";

const named = <Id extends string>(id: Id): Language<string, null> & { id: Id } => ({
  id,
  enter: () => ({ nodes: [], cursor: null }),
  step: () => ({ kind: "skip" }),
  selects: () => false,
  isEmpty: () => true,
  textUnits: () => [],
  boundary: () => null,
});

const fields = named("payload-fields");
const rich = named("lexical");

/** The entry's id is narrowed to the ids of the languages given, in all three ways a list is written. */
const _entryIdIsNarrowed = () => {
  const held = [fields, rich];

  collectTranslationTargets({
    languages: [fields, rich],
    // @ts-expect-error — "payload-field" is not one of the registered ids
    entry: { languageId: "payload-field", context: {} },
  });
  collectTranslationTargets({
    languages: held,
    // @ts-expect-error — the same, through a variable
    entry: { languageId: "payload-field", context: {} },
  });
  collectTranslationTargets({
    languages: [...held],
    // @ts-expect-error — the same, spread
    entry: { languageId: "payload-field", context: {} },
  });
};

/** A language must say where its boundaries are, even when it has none. */
// @ts-expect-error — `boundary` is missing, and that is not something a language may leave out
const _languageWithoutBoundary: Language<string, null> = {
  id: "forgot-its-boundaries",
  enter: () => ({ nodes: [], cursor: null }),
  step: () => ({ kind: "skip" }),
  selects: () => false,
  isEmpty: () => true,
  textUnits: () => [],
};

export type { Language };
