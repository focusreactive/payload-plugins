import { generateText } from "ai";
import type { Endpoint, PayloadRequest } from "payload";

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
 * Model goes through the Vercel AI Gateway (AI_GATEWAY_API_KEY).
 */

const MODEL = process.env.GENERATE_MODEL || "anthropic/claude-sonnet-4.5";
// The consultation platform the stories are written around - env-provided so the
// repo stays generic; the sandbox branch sets it per deployment.
const PLATFORM = process.env.GENERATE_PLATFORM_NAME || "the online consultation platform";
const MINIMUM_NARRATIVE_WORDS = 120;

interface GenerateBody {
  mode?: "narrative" | "translate";
  conditionId?: number | string;
  cityId?: number | string;
  documentId?: number | string;
  narrative?: string;
  title?: string;
}

interface ConditionData {
  title?: string;
  slug?: string;
  symptoms?: Array<{ symptom?: string }> | null;
}

interface CityData {
  title?: string;
  slug?: string;
  country?: string;
  narrativeHints?: Array<{ hint?: string }> | null;
}

function json(data: unknown, status: number): Response {
  return Response.json(data, { status });
}

function englishPrompt(condition: ConditionData, city: CityData): string {
  const hints = (city.narrativeHints ?? []).map((row) => row.hint).filter(Boolean);
  const symptoms = (condition.symptoms ?? []).map((row) => row.symptom).filter(Boolean);

  return [
    `Write a first-person story (380-430 words) by a traveler who came down with ${condition.title} while visiting ${city.title}, ${city.country}, and solved it with an online video consultation on ${PLATFORM}.`,
    ``,
    `Shape: enjoying the trip -> symptoms start and threaten the plans -> reluctance about navigating local healthcare in a foreign language -> finds ${PLATFORM}, books a video visit -> consultation with an English-speaking local doctor -> prescription sorted at a nearby pharmacy -> back to the trip, closing thought.`,
    ``,
    `Local color to weave in naturally (pick 2-3): ${hints.join("; ") || `${city.title} city sights`}.`,
    symptoms.length ? `Symptoms to mention plausibly: ${symptoms.slice(0, 4).join(", ")}.` : "",
    ``,
    `Rules: warm, concrete, specific; no exaggerated medical claims; the doctor listens, explains, and prescribes what is clinically appropriate; mention the visit took place within the hour and cost from about EUR 20; do not invent doctor names; no dates; plain paragraphs separated by blank lines; no headings, no markdown.`,
  ]
    .filter(Boolean)
    .join("\n");
}

function italianPrompt(narrative: string): string {
  return [
    `Translate the following traveller story into natural, idiomatic Italian. Keep the first-person voice, the paragraph breaks, and the meaning. Do not add or remove content. Return only the translation.`,
    ``,
    narrative,
  ].join("\n");
}

function italianTitlePrompt(title: string): string {
  return [
    `Translate this consumer health page title into natural Italian. Use the everyday consumer term for the condition (what people actually search for), not the clinical one. Return only the translated title, no quotes.`,
    ``,
    title,
  ].join("\n");
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

  const slug = `${condition.slug}-${city.slug}`;

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
  if (narrative.split(/\s+/u).length < MINIMUM_NARRATIVE_WORDS) {
    return json({ error: "Generated narrative failed completeness validation - try again" }, 502);
  }

  return json(
    {
      generatedAt: new Date().toISOString(),
      generationInputs: `condition: ${condition.title}, city: ${city.title} (${city.country})`,
      generationModel: MODEL,
      narrative,
      slug,
      title: `${condition.title} Treatment Online in ${city.title}`,
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

  if (translated.split(/\s+/u).length < MINIMUM_NARRATIVE_WORDS) {
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
