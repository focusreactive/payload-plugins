import { generateObject } from "ai";
import type { CollectionSlug, PayloadHandler } from "payload";

import { buildPageSchema, buildSystemPrompt } from "../schema";
import type { AiPageBuilderPluginConfig } from "../types";

function toUrlSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/gu, "-")
    .replace(/[^a-z0-9-]/gu, "")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 80);
}

export function createGeneratePageHandler(pluginConfig: AiPageBuilderPluginConfig): PayloadHandler {
  return async (req) => {
    let body: { prompt?: string; collectionSlug?: string };
    try {
      if (!req.json) {
        return Response.json({ error: "Invalid request body" }, { status: 400 });
      }
      body = (await req.json()) as { prompt?: string; collectionSlug?: string };
    } catch {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { prompt, collectionSlug } = body;

    if (!prompt?.trim() || !collectionSlug) {
      return Response.json({ error: "prompt and collectionSlug are required" }, { status: 400 });
    }

    const collectionConfig = pluginConfig.collections.find((c) => c.slug === collectionSlug);
    if (!collectionConfig) {
      return Response.json({ error: `Collection "${collectionSlug}" is not configured for AI page builder` }, { status: 404 });
    }

    const schema = buildPageSchema(pluginConfig.blocks);
    const system = buildSystemPrompt(pluginConfig.blocks);

    let generated: { title: string; slug: string; sections: unknown[] };
    try {
      // Cast schema to avoid deep-type-instantiation error from the complex
      // discriminated-union Zod shape — the runtime behaviour is correct.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await generateObject({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        model: pluginConfig.model as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        schema: schema as any,
        system,
        prompt: prompt.trim(),
      });
      generated = result.object as { title: string; slug: string; sections: unknown[] };
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI generation failed";
      return Response.json({ error: message }, { status: 500 });
    }

    const titleField = collectionConfig.titleField ?? "title";
    const slugField = collectionConfig.slugField ?? "slug";
    const blocksField = collectionConfig.blocksField ?? "sections";

    // Append short timestamp to guarantee slug uniqueness
    const baseSlug = generated.slug || toUrlSlug(generated.title);
    const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

    try {
      const doc = await req.payload.create({
        collection: collectionSlug as CollectionSlug,
        data: {
          [titleField]: generated.title,
          [slugField]: uniqueSlug,
          [blocksField]: generated.sections,
        },
        draft: true,
        overrideAccess: false,
        req,
      });

      return Response.json({ id: doc.id, slug: uniqueSlug }, { status: 201 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create document";
      return Response.json({ error: message }, { status: 500 });
    }
  };
}
