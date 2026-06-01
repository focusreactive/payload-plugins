import { z } from "zod";

import type { AiBlockDefinition } from "./types";

/** Builds a Zod schema for AI-structured page generation from block definitions. */
export function buildPageSchema(blocks: AiBlockDefinition[]) {
  const blockSchemas = blocks.map((block) => {
    const description = block.description ? `Use for: ${block.description}` : `Block type "${block.slug}"`;

    return block.schema.extend({
      blockType: z.literal(block.slug).describe(description),
    });
  });

  let sectionsSchema: z.ZodTypeAny;

  if (blockSchemas.length === 0) {
    sectionsSchema = z.array(z.object({ blockType: z.string() }));
  } else if (blockSchemas.length === 1) {
    sectionsSchema = z.array(blockSchemas[0] as z.ZodObject<z.ZodRawShape>);
  } else {
    sectionsSchema = z.array(z.discriminatedUnion("blockType", blockSchemas as [z.ZodObject<z.ZodRawShape>, z.ZodObject<z.ZodRawShape>, ...z.ZodObject<z.ZodRawShape>[]]));
  }

  return z.object({
    title: z.string().describe("The page title — concise and relevant"),
    slug: z.string().describe("URL-friendly slug: lowercase letters, numbers, and hyphens only, no leading/trailing hyphens"),
    sections: sectionsSchema.describe("Ordered list of content blocks (2–5 recommended)"),
  });
}

/** Builds the system prompt describing available block types for the AI. */
export function buildSystemPrompt(blocks: AiBlockDefinition[]): string {
  const blockList = blocks.map((b) => `- "${b.slug}"${b.description ? `: ${b.description}` : ""}`).join("\n");

  return `You are a professional web content creator for a headless CMS.
Generate complete, high-quality page content based on the user's request.

Available block types:
${blockList}

Guidelines:
- Use only the block types listed above.
- Choose block types that fit the content (e.g. a hero for above-the-fold, copy for body text).
- Generate 2–5 sections per page.
- Write content that is specific, engaging, and relevant to the request.
- The slug must be URL-safe (lowercase, hyphens, no spaces or special characters).`;
}
