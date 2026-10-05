import { CASE_STUDY_ITEMS } from "./caseStudies";
import { emptyResult } from "./context";
import type { SeedStep } from "./context";

/**
 * Refreshes the items of every caseStudies block in place. The pages step would rebuild whole
 * pages and drop edits made in the admin or through MCP since the last seed.
 */
export const seedCaseStudies: SeedStep = async (ctx) => {
  const result = emptyResult();
  const items = CASE_STUDY_ITEMS(ctx);
  const pages = await ctx.payload.find({
    collection: "page",
    depth: 0,
    limit: 0,
    pagination: false,
    where: { "blocks.blockType": { equals: "caseStudies" } },
  });

  for (const page of pages.docs) {
    const blocks = (page.blocks ?? []).map((block) =>
      block.blockType === "caseStudies" ? { ...block, items } : block
    );
    await ctx.payload.update({
      collection: "page",
      context: ctx.writeContext,
      data: { _status: "published", blocks } as never,
      id: page.id,
    });
    result.updated++;
  }
  return result;
};
