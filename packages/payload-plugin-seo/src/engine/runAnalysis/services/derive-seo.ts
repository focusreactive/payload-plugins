import type { CategoryResult, CheckResult, Status } from "../../types/analysis";
import type { PaperData, PaperLike } from "../../types/paper";

import { SeoAssessor } from "yoastseo";
import keyphraseDistributionModule from "yoastseo/build/scoring/assessments/seo/KeyphraseDistributionAssessment";
import keyphraseDistributionResearchModule from "yoastseo/build/languageProcessing/researches/keyphraseDistribution";
import { CHECK_IDS } from "../../../constants/checkIds";
import { runAssessor } from "../../assessorAdapter";
import { commonJsDefault } from "../../helpers/commonjs-default";
import { hasKeyphrase } from "../../helpers/has-keyphrase";
import { makeResearcher } from "../../researcherAdapter";
import type { AnalysisThresholds } from "../../thresholds/analysisThresholds";
import { configureSeoAssessor } from "../../thresholds/configureAssessors";
import { scoreToStatus, statusToRing } from "../../scoreStatus";
import { enrich } from "../utils/enrich";
import { toCategory } from "../utils/toCategory";

const KeyphraseDistributionAssessment = commonJsDefault(keyphraseDistributionModule);
const keyphraseDistributionResearch = commonJsDefault(keyphraseDistributionResearchModule);

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

export function deriveSeo(
  paper: PaperData,
  keyphrase: string,
  thresholds: AnalysisThresholds
): DeriveSeoResult {
  const ctx = { keyphrase, thresholds: thresholds.values };
  const researcher = makeResearcher(paper);
  researcher.addResearch("keyphraseDistribution", keyphraseDistributionResearch);

  const seoAssessor = new SeoAssessor(researcher);
  seoAssessor.addAssessment("keyphraseDistribution", new KeyphraseDistributionAssessment());
  configureSeoAssessor(seoAssessor, thresholds);

  const seoChecks = enrich(
    runAssessor(seoAssessor, ctx, paper),
    paper as PaperLike,
    researcher,
    thresholds
  );

  const { keyphrase: keyphraseChecks, onPage } = partitionSeo(seoChecks);

  const scoredChecks = hasKeyphrase(keyphrase) ? seoChecks : onPage;
  const seoScore = statusToRing(scoredChecks);

  return {
    overall: {
      seoScore,
      status: scoreToStatus(seoScore / 10),
    },
    keyphrase: toCategory(hasKeyphrase(keyphrase) ? keyphraseChecks : []),
    onPage: toCategory(onPage),
  };
}
