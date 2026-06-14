import type { CheckId } from "../../../constants/checkIds";
import type { CheckResult } from "../../types/analysis";
import type { Visualization } from "../../types/visualization";
import { gaugeKeyByCheck, PRESENCE_CHECKS } from "./constants";
import { resolveDrilldown } from "./resolves/resolveDrilldown";
import { resolveLinks } from "./resolves/resolveLinks";
import { resolvePresence } from "./resolves/resolvePresence";
import { resolveProportionCount } from "./resolves/resolveProportionCount";
import { resolveValueRange } from "./resolves/resolveValueRange";
import { readPositions } from "./utils/readPositions";

export function resolveVisualization(check: CheckResult, data: Record<string, unknown> | undefined): Visualization {
  const id = check.id as CheckId;

  if (PRESENCE_CHECKS.has(id)) return resolvePresence();
  if (gaugeKeyByCheck[id]) return resolveValueRange(check, data);

  switch (id) {
    case "subheadingsKeyword":
      return resolveProportionCount(check, data, false);
    case "imageKeyphrase":
      return resolveProportionCount(check, data, true);
    case "externalLinks":
    case "internalLinks":
      return resolveLinks(check, data);
    case "textCompetingLinks":
      return resolveDrilldown(data, "items", "link", "links");
    case "subheadingsTooLong":
      return resolveDrilldown(data, "items", "section", "sections");
    case "textParagraphTooLong":
      return resolveDrilldown(data, "paragraphs", "paragraph", "paragraphs");
    case "sentenceBeginnings":
      return resolveDrilldown(data, "items", "group", "groups");
    case "keyphraseDistribution": {
      const positions = readPositions(data);
      if (!positions?.length) return resolvePresence();

      return { type: "distribution", distribution: { positions } };
    }
    default:
      return resolvePresence();
  }
}
