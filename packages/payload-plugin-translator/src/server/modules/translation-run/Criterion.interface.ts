import type { Payload } from "payload";
import type { LeafAnswer } from "../../../core/domain/selection/index.js";
import type { RuleName } from "../../../core/domain/selection/TranslationFilter.js";

import type { RequestScope } from "../../shared/payload/RequestScope.shapes.js";

import type { RunTarget } from "./TranslationRun.interface.js";

export type CriterionQuestion = {
  readonly payload: Payload;
  readonly scope: RequestScope;
  readonly target: RunTarget;
  readonly sourceData: Record<string, unknown>;
};

/**
 * Answers with every address it accepts, unfiltered by the run's own list — the run intersects the
 * answers. Throws when it cannot answer: a swallowed failure drops the narrowing and the run
 * overwrites reviewed text.
 */
export type Criterion = (question: CriterionQuestion) => Promise<LeafAnswer>;

/** Keyed by the name stored in job rows — renaming a key strands every queued run that names it. */
export type Criteria = Readonly<Record<RuleName, Criterion>>;
