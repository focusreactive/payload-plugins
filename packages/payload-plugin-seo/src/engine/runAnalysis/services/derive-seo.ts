import type { CategoryResult, CheckResult, Status } from "../../types/analysis";
import type { PaperData, PaperLike } from "../../types/paper";

import { SeoAssessor } from "yoastseo";
import KeyphraseDistributionAssessment from "yoastseo/build/scoring/assessments/seo/KeyphraseDistributionAssessment";
import { CHECK_IDS } from "../../../constants/checkIds";
import { runAssessor } from "../../assessorAdapter";
import { makeResearcher } from "../../researcherAdapter";
import { scoreToStatus, statusToRing } from "../../scoreStatus";
import { enrich } from "../utils/enrich";
import { toCategory } from "../utils/toCategory";

const KEYPHRASE = new Set<string>(CHECK_IDS.keyphrase);
const ONPAGE = new Set<string>(CHECK_IDS.onPage);

interface PartitionSeoResult {
  keyphrase: CheckResult[];
  onPage: CheckResult[];
}

export function partitionSeo(checks: CheckResult[]): PartitionSeoResult {
  return {
    keyphrase: checks.filter((c) => KEYPHRASE.has(c.id)),
    onPage: checks.filter((c) => ONPAGE.has(c.id)),
  };
}

interface DeriveSeoResult {
  overall: {
    seoScore: number;
    status: Status;
  };
  keyphrase: CategoryResult;
  onPage: CategoryResult;
}

export function deriveSeo(paper: PaperData, keyphrase: string): DeriveSeoResult {
  const ctx = { keyphrase };
  const researcher = makeResearcher(paper);

  const seoAssessor = new SeoAssessor(makeResearcher(paper));
  seoAssessor.addAssessment("keyphraseDistribution", new KeyphraseDistributionAssessment());

  const seoChecks = enrich(runAssessor(seoAssessor, ctx, paper), paper as PaperLike, researcher);

  const { keyphrase: keyphraseChecks, onPage } = partitionSeo(seoChecks);
  const seoScore = statusToRing(seoChecks);

  return {
    overall: {
      seoScore,
      status: scoreToStatus(seoScore / 10),
    },
    keyphrase: toCategory(keyphraseChecks),
    onPage: toCategory(onPage),
  };
}
