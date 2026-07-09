import { joinText } from "@/lib/utils/text";
import type { Page } from "@/payload-types";

// The WealthBriefing blocks don't yet contribute body text to the page's
// semantic-search embedding, so page embeddings are title-based for now.
export function extractPageText(page: Pick<Page, "title" | "blocks">): string {
  return joinText([page.title]);
}
