import { extractLexicalText, joinText } from "@/lib/utils/text";
import type { Insight } from "@/payload-types";

export function extractInsightText(
  insight: Pick<Insight, "title" | "standfirst" | "body">
): string {
  return joinText([insight.title, insight.standfirst, extractLexicalText(insight.body)]);
}
