import { generateText } from "ai";

/**
 * The prompts and the completeness gate, shared by the single-page generator
 * and the batch runner so both produce identical prose and enforce the same
 * floor. A batch that validated differently from the button would make the
 * review step a lie.
 */

export const MODEL = process.env.GENERATE_MODEL || "anthropic/claude-sonnet-4.5";
// The consultation platform the stories are written around - env-provided so the
// repo stays generic; the sandbox branch sets it per deployment.
export const PLATFORM = process.env.GENERATE_PLATFORM_NAME || "the online consultation platform";
export const MINIMUM_NARRATIVE_WORDS = 120;

export interface ConditionData {
  id?: number | string;
  title?: string;
  slug?: string;
  symptoms?: Array<{ symptom?: string }> | null;
}

export interface CityData {
  id?: number | string;
  title?: string;
  slug?: string;
  country?: string;
  narrativeHints?: Array<{ hint?: string }> | null;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/u).filter(Boolean).length;
}

export function englishPrompt(condition: ConditionData, city: CityData): string {
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

export function italianPrompt(narrative: string): string {
  return [
    `Translate the following traveller story into natural, idiomatic Italian. Keep the first-person voice, the paragraph breaks, and the meaning. Do not add or remove content. Return only the translation.`,
    ``,
    narrative,
  ].join("\n");
}

export function italianTitlePrompt(title: string): string {
  return [
    `Translate this consumer health page title into natural Italian. Use the everyday consumer term for the condition (what people actually search for), not the clinical one. Return only the translated title, no quotes.`,
    ``,
    title,
  ].join("\n");
}

export function pageTitle(condition: ConditionData, city: CityData): string {
  return `${condition.title} Treatment Online in ${city.title}`;
}

export function pageSlug(condition: ConditionData, city: CityData): string {
  return `${condition.slug}-${city.slug}`;
}

export function generationInputs(condition: ConditionData, city: CityData): string {
  return `condition: ${condition.title}, city: ${city.title} (${city.country})`;
}

export type NarrativeOutcome =
  | { status: "created"; narrative: string; wordCount: number; attempts: number }
  | { status: "failed"; reason: string; wordCount: number; attempts: number };

/**
 * Generate one narrative and hold it to the word floor, retrying once. The
 * retry is what makes an unattended batch defensible: a single short answer is
 * the common failure and re-asking fixes most of them, so the run only reports
 * a failure after the model has had a second chance.
 */
export async function generateValidatedNarrative(
  condition: ConditionData,
  city: CityData,
  maximumAttempts = 2
): Promise<NarrativeOutcome> {
  const prompt = englishPrompt(condition, city);
  let lastWordCount = 0;
  let lastError = "";

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    try {
      const { text } = await generateText({ model: MODEL, prompt });
      const narrative = text.trim();
      lastWordCount = countWords(narrative);

      if (lastWordCount >= MINIMUM_NARRATIVE_WORDS) {
        return { attempts: attempt, narrative, status: "created", wordCount: lastWordCount };
      }
      lastError = `too short (${lastWordCount} words, floor is ${MINIMUM_NARRATIVE_WORDS})`;
    } catch (error) {
      lastWordCount = 0;
      lastError = (error as Error).message || "model call failed";
    }
  }

  return {
    attempts: maximumAttempts,
    reason: lastError,
    status: "failed",
    wordCount: lastWordCount,
  };
}
