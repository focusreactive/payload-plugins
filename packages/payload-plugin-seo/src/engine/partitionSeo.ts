import { CHECK_IDS } from "../constants/checkIds";
import type { CheckResult } from "./types";

const KEYPHRASE = new Set<string>(CHECK_IDS.keyphrase);
const ONPAGE = new Set<string>(CHECK_IDS.onPage);

export function partitionSeo(checks: CheckResult[]): { keyphrase: CheckResult[]; onPage: CheckResult[] } {
  return {
    keyphrase: checks.filter((c) => KEYPHRASE.has(c.id)),
    onPage: checks.filter((c) => ONPAGE.has(c.id)),
  };
}
