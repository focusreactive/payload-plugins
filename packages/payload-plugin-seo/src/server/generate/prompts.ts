import { AVG_GLYPH_PX } from "../../constants/generation";
import type { SeoGenerationConfig } from "../../types/config";
import type { LengthUnit } from "../../measure/measure";

export type SeoFieldKind = "title" | "description";

export interface PromptArgs {
  kind: SeoFieldKind;
  contentHtml: string;
  range: {
    min: number;
    max: number;
    unit: LengthUnit;
  };
  locale?: string;
  config: SeoGenerationConfig;
}

function charRangeFromPx(minPx: number, maxPx: number): { min: number; max: number } {
  return {
    min: Math.ceil(minPx / AVG_GLYPH_PX),
    max: Math.floor(maxPx / AVG_GLYPH_PX),
  };
}

function defaultSystem(kind: SeoFieldKind, range: PromptArgs["range"], locale?: string): string {
  const { min, max } = range.unit === "px" ? charRangeFromPx(range.min, range.max) : range;
  const what =
    kind === "title"
      ? "an SEO meta title for the web page described by the content below"
      : "an SEO meta description for the web page described by the content below";
  const lines = [
    `You write ${what}.`,
    `The text MUST be strictly between ${min} and ${max} characters long — never fewer than ${min} and never more than ${max}, including spaces.`,
    "Summarize the page's actual subject; do not invent facts not present in the content.",
    "Return ONLY the text — no quotes, no markdown, no labels, no trailing punctuation unless natural.",
  ];

  if (locale) lines.push(`Write in the locale "${locale}".`);

  return lines.join(" ");
}

export function buildPrompt(args: PromptArgs): { system: string; user: string } {
  const override = args.kind === "title" ? args.config.titlePrompt : args.config.descriptionPrompt;

  const system = override ?? defaultSystem(args.kind, args.range, args.locale);
  const user = `Page content:\n\n${args.contentHtml}`;

  return { system, user };
}
