import { DEFAULT_MAX_CONTENT_CHARS, DEFAULT_MODEL } from "../../constants/generation";
import type { SeoGenerationConfig } from "../../types/config";
import type { LengthUnit } from "../../measure/measure";
import { callOpenAIChat } from "./openai";
import type { SeoFieldKind } from "./prompts";
import { buildPrompt } from "./prompts";

export interface GenerateForFieldArgs {
  kind: SeoFieldKind;
  contentHtml: string;
  range: {
    min: number;
    max: number;
    unit: LengthUnit;
  };
  locale?: string;
  config: SeoGenerationConfig;
  apiKey: string;
  signal?: AbortSignal;
}

const QUOTE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['"', '"'],
  ["'", "'"],
  ["“", "”"],
];

function stripQuotes(s: string): string {
  const t = s.trim();

  if (t.length < 2) return t;

  for (const [open, close] of QUOTE_PAIRS) {
    if (t.startsWith(open) && t.endsWith(close)) return t.slice(1, -1).trim();
  }

  return t;
}

export async function generateForField(args: GenerateForFieldArgs): Promise<string> {
  const max = args.config.maxContentChars ?? DEFAULT_MAX_CONTENT_CHARS;
  const contentHtml = args.contentHtml.slice(0, max);

  const { system, user } = buildPrompt({
    kind: args.kind,
    contentHtml,
    range: args.range,
    locale: args.locale,
    config: args.config,
  });

  const text = await callOpenAIChat({
    apiKey: args.apiKey,
    model: args.config.model ?? DEFAULT_MODEL,
    system,
    user,
    signal: args.signal,
  });

  return stripQuotes(text);
}
