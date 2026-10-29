import { TranslatorConfigError } from "../../../core/errors/index.js";
import type { LeafAddress } from "../../../core/domain/content-projection/idPath.js";
import { everyTranslatableLeaf } from "../../../core/domain/content-projection/contentProjector.js";
import { narrowSelection } from "../../../core/domain/selection/index.js";
import type { LeafAnswer, TranslationFilter } from "../../../core/domain/selection/index.js";
import type { RuleName } from "../../../core/domain/selection/TranslationFilter.js";
import type { Criteria, CriterionQuestion } from "../../modules/translation-run/index.js";
import type { Run } from "./run.js";
import type { ApprovedSource } from "./targetDocument.js";

export type EmptyBecause =
  | "no-translatable-text"
  | "named-leaves-are-not-here"
  | "rules-kept-nothing";

type Owed = {
  readonly addresses: readonly LeafAddress[];
  readonly emptyBecause: EmptyBecause | null;
};

const emptyBecause = (step: {
  everything: readonly LeafAddress[];
  afterLeaves: readonly LeafAddress[];
  addresses: readonly LeafAddress[];
}): EmptyBecause | null => {
  if (step.addresses.length > 0) return null;
  if (step.everything.length === 0) return "no-translatable-text";
  if (step.afterLeaves.length === 0) return "named-leaves-are-not-here";
  return "rules-kept-nothing";
};

function answerTo(
  criteria: Criteria,
  name: RuleName,
  question: CriterionQuestion
): Promise<LeafAnswer> {
  const answer = criteria[name];
  if (!answer) {
    throw new TranslatorConfigError(
      `No criterion answers to "${name}". A run naming it cannot be narrowed, and translating the whole document instead would overwrite reviewed text.`
    );
  }
  return answer(question);
}

export async function selectLeaves(args: {
  run: Run;
  criteria: Criteria;
  filters: readonly TranslationFilter[];
  source: ApprovedSource;
}): Promise<Owed> {
  const { run, criteria, filters, source } = args;
  const { sourceData } = source;

  const question = { payload: run.payload, scope: run.scope, target: run.target, sourceData };
  const everything = everyTranslatableLeaf(sourceData, run.schema);
  const named = filters.flatMap((filter) => (filter.kind === "leaves" ? [filter.addresses] : []));
  const answered = await Promise.all(
    filters.flatMap((filter) =>
      filter.kind === "rule" ? [answerTo(criteria, filter.name, question)] : []
    )
  );

  const afterLeaves = narrowSelection(everything, named);
  const addresses = narrowSelection(afterLeaves, answered);
  return { addresses, emptyBecause: emptyBecause({ everything, afterLeaves, addresses }) };
}
