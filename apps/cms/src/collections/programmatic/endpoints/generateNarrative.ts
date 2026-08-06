import { generateText } from "ai";
import type { Endpoint, PayloadRequest } from "payload";

import { MINIMUM_NARRATIVE_WORDS, MODEL, countWords, englishPrompt, generationInputs, italianPrompt, italianTitlePrompt, pageSlug, pageTitle } from './narrativeGeneration';
import type { CityData, ConditionData } from './narrativeGeneration';

/**
 * The programmatic model's "basic generator": pages assemble deterministically
 * from the condition and city entities, AI writes only the traveller narrative.
 *
 * Two modes, both admin-authenticated (same-origin, Payload cookie):
 * - "narrative": generates the English story and RETURNS it - the admin button
 *   fills the open form, so the editor reviews before anything is saved. Saving
 *   the draft and publishing stay the approval steps.
 * - "translate": translates the narrative and writes it to the document's
 *   Italian locale as a draft, so the review step covers translations too.
 *
 * The batch runner in ./batchGenerate shares the prompts and the word floor
 * from ./narrativeGeneration, so one page and a thousand are held to the same
 * standard.
 *
 * Model goes through the Vercel AI Gateway (AI_GATEWAY_API_KEY).
 */

interface GenerateBody {
  mode?: "narrative" | "translate";
  conditionId?: number | string;
  cityId?: number | string;
  documentId?: number | string;
  narrative?: string;
  title?: string;
}

function json(data: unknown, status: number): Response {
  return Response.json(data, { status });
}

async function handleNarrative(req: PayloadRequest, body: GenerateBody): Promise<Response> {
  const { conditionId, cityId, documentId } = body;
  if (!conditionId || !cityId) {
    return json({ error: "Pick a condition and a city first" }, 400);
  }

  const [condition, city] = await Promise.all([
    req.payload.findByID({ collection: "conditions", id: conditionId, depth: 0 }).catch(() => null),
    req.payload.findByID({ collection: "cities", id: cityId, depth: 0 }).catch(() => null),
  ]);

  if (!condition || !city) {
    return json({ error: "Condition or city not found" }, 404);
  }

  const slug = pageSlug(condition as ConditionData, city as CityData);

  // A condition x city pair owns one page - block a duplicate before spending AI time.
  const collision = await req.payload.find({
    collection: "generated-pages",
    draft: true,
    limit: 1,
    overrideAccess: true,
    where: {
      slug: { equals: slug },
      ...(documentId ? { id: { not_equals: documentId } } : {}),
    },
  });

  if (collision.totalDocs > 0) {
    return json(
      { error: "A page for this condition and city already exists - open that document instead" },
      409
    );
  }

  const { text } = await generateText({
    model: MODEL,
    prompt: englishPrompt(condition as ConditionData, city as CityData),
  });
  const narrative = text.trim();

  // Completeness validation before the editor sees anything (the point of a managed generator).
  if (countWords(narrative) < MINIMUM_NARRATIVE_WORDS) {
    return json({ error: "Generated narrative failed completeness validation - try again" }, 502);
  }

  return json(
    {
      generatedAt: new Date().toISOString(),
      generationInputs: generationInputs(condition as ConditionData, city as CityData),
      generationModel: MODEL,
      narrative,
      slug,
      title: pageTitle(condition as ConditionData, city as CityData),
    },
    200
  );
}

async function handleTranslate(req: PayloadRequest, body: GenerateBody): Promise<Response> {
  const { documentId, narrative, title } = body;
  if (!documentId) {
    return json({ error: "Save the draft first, then translate" }, 400);
  }
  if (!narrative?.trim()) {
    return json({ error: "Generate the English narrative first" }, 400);
  }

  // Title translates too - otherwise the Italian review view shows an empty
  // required Title and the /it/ page keeps the English heading via fallback.
  const [narrativeResult, titleResult] = await Promise.all([
    generateText({ model: MODEL, prompt: italianPrompt(narrative) }),
    title?.trim()
      ? generateText({ model: MODEL, prompt: italianTitlePrompt(title) })
      : Promise.resolve(null),
  ]);
  const translated = narrativeResult.text.trim();
  const translatedTitle = titleResult?.text.trim().replace(/^["']|["']$/gu, "");

  if (countWords(translated) < MINIMUM_NARRATIVE_WORDS) {
    return json({ error: "Translation failed completeness validation - try again" }, 502);
  }

  // Writes ONLY the Italian locale, as a draft: the English stays untouched
  // and the translation waits for review like everything else.
  await req.payload.update({
    collection: "generated-pages",
    id: documentId,
    draft: true,
    locale: "it",
    data: {
      narrative: translated,
      ...(translatedTitle ? { title: translatedTitle } : {}),
    },
  });

  return json({ locale: "it", ok: true }, 200);
}

export const generateNarrativeEndpoint: Endpoint = {
  method: "post",
  path: "/generate",
  handler: async (req: PayloadRequest): Promise<Response> => {
    if (!req.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = ((await req.json?.()) ?? {}) as GenerateBody;

    try {
      if (body.mode === "translate") {
        return await handleTranslate(req, body);
      }
      return await handleNarrative(req, body);
    } catch (error) {
      req.payload.logger.error(
        `generated-pages/generate failed: ${(error as Error).message ?? error}`
      );
      return json({ error: (error as Error).message || "Generation failed" }, 500);
    }
  },
};
