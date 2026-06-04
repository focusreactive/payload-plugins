import { KEYPHRASE_IDS, ONPAGE_IDS } from "../constants/partition";
import type { CheckResult } from "./types";

export function partitionSeo(checks: CheckResult[]): { keyphrase: CheckResult[]; onPage: CheckResult[] } {
  return {
    keyphrase: checks.filter((c) => KEYPHRASE_IDS.has(c.id)),
    onPage: checks.filter((c) => ONPAGE_IDS.has(c.id)),
  };
}
